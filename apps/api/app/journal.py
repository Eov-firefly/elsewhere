"""Optional accounts and private-by-default reflections; no public activity feed."""

import hashlib
import json
import secrets
import time
from collections import defaultdict, deque
from datetime import timedelta
from typing import Literal
from uuid import UUID

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import APIRouter, Depends, Header, Query, Request, Response
from pydantic import Field
from sqlalchemy import and_, delete, extract, func, or_, select
from sqlalchemy.orm import Session

from .db import get_db, settings
from .models import (
    Account,
    AccountSession,
    Discovery,
    MutationReceipt,
    Reflection,
    ReflectionReport,
    Revision,
    now,
)
from .routes import TransactionRoute
from .schemas import Decision, Input
from .services import card, eligible, fail, utc

router = APIRouter(prefix="/api/v1", route_class=TransactionRoute)
Db = Depends(get_db)
COOKIE = "elsewhere_session"
hasher = PasswordHasher(time_cost=2, memory_cost=65536, parallelism=2)
dummy_hash = hasher.hash(secrets.token_urlsafe(32))
attempts = defaultdict(deque)


class Credentials(Input):
    username: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{2,39}$")
    # Do not strip password whitespace: it is part of the chosen credential.
    password: str = Field(min_length=12, max_length=128)
    model_config = {"extra": "forbid", "str_strip_whitespace": False}


class ReflectionInput(Input):
    body: str = Field(min_length=1, max_length=3000)
    watching_state: Literal["watching", "paused", "finished"] = "watching"
    mood: (
        Literal["curious", "calm", "joyful", "moved", "thoughtful", "unsure"] | None
    ) = None


class CreateReflection(ReflectionInput):
    discovery_id: UUID


class Version(Input):
    version: int = Field(ge=1)


class EditReflection(ReflectionInput, Version):
    pass


class ReportInput(Input):
    reason: str = Field(min_length=3, max_length=1000)


class PasswordInput(Input):
    password: str = Field(min_length=12, max_length=128)
    model_config = {"extra": "forbid", "str_strip_whitespace": False}


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def require_account(request: Request, db: Session = Db):
    token = request.cookies.get(COOKIE, "")
    session = db.get(AccountSession, digest(token)) if token else None
    user = (
        db.get(Account, session.account_id)
        if session and utc(session.expires_at) > now()
        else None
    )
    if not user:
        fail("UNAUTHENTICATED", "Sign in to keep your reflections in sync.", 401)
    request.state.account_id = user.id
    return user


def auth_limit(request, username):
    ip = request.client.host if request.client else "unknown"
    key = digest(ip + ":" + username)
    if key not in attempts and len(attempts) >= 4096:
        attempts.pop(next(iter(attempts)))
    bucket = attempts[key]
    moment = time.monotonic()
    while bucket and bucket[0] < moment - 60:
        bucket.popleft()
    if len(bucket) >= 8:
        fail("RATE_LIMITED", "Too many sign-in attempts. Please wait a minute.", 429)
    bucket.append(moment)


def start_session(db, user, request, response):
    old = request.cookies.get(COOKIE)
    if old:
        db.execute(
            delete(AccountSession).where(AccountSession.token_hash == digest(old))
        )
    token = secrets.token_urlsafe(32)
    db.add(
        AccountSession(
            token_hash=digest(token),
            account_id=user.id,
            expires_at=now() + timedelta(days=30),
        )
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=30 * 86400,
        httponly=True,
        secure=settings().secure_cookies,
        samesite="strict",
        path="/api",
    )


@router.post("/auth/register", status_code=201)
def register(body: Credentials, request: Request, response: Response, db: Session = Db):
    auth_limit(request, body.username)
    if db.scalar(select(Account).where(Account.username == body.username)):
        fail("CONFLICT", "That username is unavailable.", 409)
    user = Account(username=body.username, password_hash=hasher.hash(body.password))
    db.add(user)
    db.flush()
    start_session(db, user, request, response)
    return {"username": user.username}


@router.post("/auth/login")
def login(body: Credentials, request: Request, response: Response, db: Session = Db):
    auth_limit(request, body.username)
    user = db.scalar(select(Account).where(Account.username == body.username))
    try:
        hasher.verify(user.password_hash if user else dummy_hash, body.password)
    except (VerificationError, InvalidHashError):
        fail("UNAUTHENTICATED", "Username or password is incorrect.", 401)
    if not user:
        fail("UNAUTHENTICATED", "Username or password is incorrect.", 401)
    start_session(db, user, request, response)
    return {"username": user.username}


@router.get("/auth/me")
def me(user: Account = Depends(require_account)):
    return {"username": user.username}


@router.post("/auth/logout")
def logout(request: Request, response: Response, db: Session = Db):
    token = request.cookies.get(COOKIE)
    if token:
        db.execute(
            delete(AccountSession).where(AccountSession.token_hash == digest(token))
        )
    response.delete_cookie(
        COOKIE,
        path="/api",
        httponly=True,
        secure=settings().secure_cookies,
        samesite="strict",
    )
    return {"signed_out": True}


def erase_receipts(db, account_id):
    db.execute(
        delete(MutationReceipt).where(
            MutationReceipt.owner_hash == digest("account:" + account_id)
        )
    )


@router.post("/auth/delete")
def delete_account(
    body: PasswordInput,
    response: Response,
    user: Account = Depends(require_account),
    db: Session = Db,
):
    try:
        hasher.verify(user.password_hash, body.password)
    except (VerificationError, InvalidHashError):
        fail("UNAUTHENTICATED", "Password is incorrect.", 401)
    records = db.scalars(
        select(Reflection.id).where(Reflection.account_id == user.id)
    ).all()
    if records:
        db.execute(
            delete(ReflectionReport).where(ReflectionReport.reflection_id.in_(records))
        )
    db.execute(delete(Reflection).where(Reflection.account_id == user.id))
    db.execute(delete(AccountSession).where(AccountSession.account_id == user.id))
    erase_receipts(db, user.id)
    db.delete(user)
    response.delete_cookie(
        COOKIE,
        path="/api",
        httponly=True,
        secure=settings().secure_cookies,
        samesite="strict",
    )
    return {"deleted": True}


def serialize(db, reflection, public=False):
    discovery = db.get(Discovery, reflection.discovery_id)
    revision = db.get(Revision, reflection.revision_id)
    source = (
        card(db, discovery, revision) if eligible(db, discovery, revision) else None
    )
    result = {
        "body": reflection.body,
        "watching_state": reflection.watching_state,
        "mood": reflection.mood,
        "created_at": utc(reflection.created_at).isoformat(),
        "updated_at": utc(reflection.updated_at).isoformat(),
        "source": source,
    }
    if public:
        result["author"] = db.get(Account, reflection.account_id).username
    else:
        result.update(
            {
                "id": reflection.id,
                "version": reflection.version,
                "share_id": reflection.share_id,
                "visibility": "public" if reflection.share_id else "private",
                "moderation_state": reflection.moderation_state,
            }
        )
    return result


def owned(db, user, reflection_id, version=None):
    reflection = db.scalar(
        select(Reflection)
        .where(Reflection.id == str(reflection_id), Reflection.account_id == user.id)
        .with_for_update()
    )
    if not reflection:
        fail("NOT_FOUND", "Reflection not found.", 404)
    if version is not None and reflection.version != version:
        fail(
            "CONFLICT",
            "This reflection changed on another device. Refresh before making changes; your draft is safe.",
            409,
        )
    return reflection


@router.post("/reflections", status_code=201)
def create(
    body: CreateReflection, user: Account = Depends(require_account), db: Session = Db
):
    discovery = db.get(Discovery, str(body.discovery_id))
    revision = (
        db.get(Revision, discovery.published_revision_id)
        if discovery and discovery.published_revision_id
        else None
    )
    if not eligible(db, discovery, revision):
        fail("NOT_FOUND", "This discovery is currently unavailable.", 404)
    moment = now()
    reflection = Reflection(
        account_id=user.id,
        discovery_id=discovery.id,
        revision_id=revision.id,
        body=body.body,
        watching_state=body.watching_state,
        mood=body.mood,
        created_at=moment,
        updated_at=moment,
    )
    db.add(reflection)
    db.flush()
    return serialize(db, reflection)


@router.get("/reflections")
def list_reflections(
    cursor: UUID | None = None,
    limit: int = Query(20, ge=1, le=50),
    user: Account = Depends(require_account),
    db: Session = Db,
):
    query = select(Reflection).where(Reflection.account_id == user.id)
    if cursor:
        last = db.scalar(
            select(Reflection).where(
                Reflection.id == str(cursor), Reflection.account_id == user.id
            )
        )
        if not last:
            fail("INVALID_REQUEST", "Invalid journal cursor.")
        query = query.where(
            or_(
                Reflection.created_at < last.created_at,
                and_(Reflection.created_at == last.created_at, Reflection.id < last.id),
            )
        )
    rows = db.scalars(
        query.order_by(Reflection.created_at.desc(), Reflection.id.desc()).limit(
            limit + 1
        )
    ).all()
    return {
        "items": [serialize(db, r) for r in rows[:limit]],
        "next_cursor": rows[limit - 1].id if len(rows) > limit else None,
    }


@router.get("/reflections/summary")
def summary(user: Account = Depends(require_account), db: Session = Db):
    filters = Reflection.account_id == user.id
    count, discoveries = db.execute(
        select(
            func.count(Reflection.id),
            func.count(func.distinct(Reflection.discovery_id)),
        ).where(filters)
    ).one()
    year = extract("year", Reflection.created_at)
    month = extract("month", Reflection.created_at)
    monthly = db.execute(
        select(year, month, func.count())
        .where(filters)
        .group_by(year, month)
        .order_by(year.desc(), month.desc())
        .limit(12)
    ).all()
    topics = db.execute(
        select(Discovery.topic, func.count())
        .join(Reflection, Reflection.discovery_id == Discovery.id)
        .where(filters)
        .group_by(Discovery.topic)
    ).all()
    return {
        "entries": count,
        "discoveries": discoveries,
        "month_basis": "UTC",
        "months": [
            {"month": f"{int(y):04d}-{int(m):02d}", "entries": n} for y, m, n in monthly
        ],
        "topics": [{"topic": topic, "entries": n} for topic, n in topics],
    }


@router.get("/reflections/export")
def export(user: Account = Depends(require_account), db: Session = Db):
    rows = db.scalars(
        select(Reflection)
        .where(Reflection.account_id == user.id)
        .order_by(Reflection.created_at, Reflection.id)
    ).all()
    response = Response(
        content=json.dumps(
            {
                "username": user.username,
                "reflections": [serialize(db, r) for r in rows],
            },
            ensure_ascii=False,
        ),
        media_type="application/json",
    )
    response.headers["Content-Disposition"] = (
        'attachment; filename="elsewhere-journal.json"'
    )
    return response


@router.get("/reflections/{reflection_id}")
def get_reflection(
    reflection_id: UUID, user: Account = Depends(require_account), db: Session = Db
):
    return serialize(db, owned(db, user, reflection_id))


@router.post("/reflections/{reflection_id}/edit")
def edit(
    reflection_id: UUID,
    body: EditReflection,
    user: Account = Depends(require_account),
    db: Session = Db,
):
    reflection = owned(db, user, reflection_id, body.version)
    reflection.body = body.body
    reflection.watching_state = body.watching_state
    reflection.mood = body.mood
    reflection.version += 1
    reflection.updated_at = now()
    # Edits become private so old links cannot silently publish new thoughts.
    reflection.share_id = None
    erase_receipts(db, user.id)
    db.flush()
    return serialize(db, reflection)


@router.post("/reflections/{reflection_id}/share")
def share(
    reflection_id: UUID,
    body: Version,
    user: Account = Depends(require_account),
    db: Session = Db,
):
    reflection = owned(db, user, reflection_id, body.version)
    if reflection.moderation_state != "clear":
        fail(
            "FORBIDDEN", "This reflection cannot be shared while under moderation.", 403
        )
    reflection.share_id = reflection.share_id or secrets.token_urlsafe(24)
    reflection.version += 1
    db.flush()
    return serialize(db, reflection)


@router.post("/reflections/{reflection_id}/unshare")
def unshare(
    reflection_id: UUID,
    body: Version,
    user: Account = Depends(require_account),
    db: Session = Db,
):
    reflection = owned(db, user, reflection_id, body.version)
    reflection.share_id = None
    reflection.version += 1
    erase_receipts(db, user.id)
    db.flush()
    return serialize(db, reflection)


@router.post("/reflections/{reflection_id}/delete")
def remove(
    reflection_id: UUID,
    body: Version,
    user: Account = Depends(require_account),
    db: Session = Db,
):
    reflection = owned(db, user, reflection_id, body.version)
    db.execute(
        delete(ReflectionReport).where(ReflectionReport.reflection_id == reflection.id)
    )
    db.delete(reflection)
    erase_receipts(db, user.id)
    db.flush()
    return {"deleted": True}


def public_reflection(db, share_id):
    if len(share_id) > 40:
        fail("NOT_FOUND", "This shared reflection is no longer available.", 404)
    reflection = db.scalar(
        select(Reflection).where(
            Reflection.share_id == share_id, Reflection.moderation_state == "clear"
        )
    )
    if not reflection:
        fail("NOT_FOUND", "This shared reflection is no longer available.", 404)
    return reflection


@router.get("/shared-reflections/{share_id}")
def read_shared(share_id: str, db: Session = Db):
    return serialize(db, public_reflection(db, share_id), public=True)


@router.post("/shared-reflections/{share_id}/report", status_code=201)
def report_shared(share_id: str, body: ReportInput, db: Session = Db):
    reflection = public_reflection(db, share_id)
    db.add(ReflectionReport(reflection_id=reflection.id, reason=body.reason))
    return {"received": True}


@router.get("/admin/reflection-reports")
def reflection_reports(db: Session = Db, authorization: str = Header(default="")):
    from .main import admin

    admin(authorization)
    results = []
    for report in db.scalars(
        select(ReflectionReport).order_by(ReflectionReport.created_at.desc()).limit(50)
    ):
        reflection = (
            db.get(Reflection, report.reflection_id) if report.reflection_id else None
        )
        results.append(
            {
                "id": report.id,
                "reason": report.reason,
                "reflection_id": reflection.id if reflection else None,
                "body": reflection.body if reflection and reflection.share_id else None,
                "share_id": reflection.share_id if reflection else None,
            }
        )
    return results


@router.post("/admin/reflections/{reflection_id}/hide")
def hide_reflection(
    reflection_id: UUID,
    body: Decision,
    db: Session = Db,
    authorization: str = Header(default=""),
):
    from .main import admin, audit

    actor = admin(authorization)
    reflection = db.scalar(
        select(Reflection).where(Reflection.id == str(reflection_id)).with_for_update()
    )
    if not reflection or not reflection.share_id:
        fail("NOT_FOUND", "Public reflection not found.", 404)
    reflection.share_id = None
    reflection.moderation_state = "hidden"
    reflection.version += 1
    erase_receipts(db, reflection.account_id)
    audit(db, actor, "reflection_hide", reflection.id, body.reason)
    return {"hidden": True}
