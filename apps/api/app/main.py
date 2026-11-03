import hmac
import hashlib
import time
from collections import defaultdict, deque
from datetime import date, datetime, timezone
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import schemas as s
from .db import get_db, settings
from .models import (
    Asset,
    Audit,
    Availability,
    Discovery,
    Event,
    Feedback,
    MutationReceipt,
    Report,
    Revision,
    Rights,
    Slate,
    SlateItem,
)
from .services import card, eligible, fail, normalize_url
from .routes import TransactionRoute

app = FastAPI(title="Elsewhere API", version="0.1.0")
app.router.route_class = TransactionRoute
Db = Depends(get_db)
requests = defaultdict(deque)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request.state.request_id = str(uuid4())
    # Local single-process protection. Deploy an edge limiter before multi-worker/public use.
    key = request.client.host if request.client else "unknown"
    current = time.monotonic()
    if key not in requests and len(requests) >= 4096:
        requests.pop(next(iter(requests)))
    bucket = requests[key]
    while bucket and bucket[0] < current - 60:
        bucket.popleft()
    if len(bucket) >= 180:
        response = JSONResponse(
            {
                "error": {
                    "code": "RATE_LIMITED",
                    "message": "Please try again shortly.",
                    "request_id": request.state.request_id,
                }
            },
            429,
        )
        response.headers["Retry-After"] = "60"
    elif (
        not request.headers.get("content-length", "0").isdigit()
        or len(request.headers.get("content-length", "0")) > 6
        or int(request.headers.get("content-length", "0")) > 32768
    ):
        response = JSONResponse(
            {
                "error": {
                    "code": "INVALID_REQUEST",
                    "message": "Request too large.",
                    "request_id": request.state.request_id,
                }
            },
            413,
        )
    else:
        bucket.append(current)
        chunks = []
        size = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 32768:
                break
            chunks.append(chunk)
        if size > 32768:
            response = JSONResponse(
                {
                    "error": {
                        "code": "INVALID_REQUEST",
                        "message": "Request too large.",
                        "request_id": request.state.request_id,
                    }
                },
                413,
            )
        else:
            request._body = b"".join(chunks)
            response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(HTTPException)
async def http_error(request, exc):
    detail = (
        exc.detail
        if isinstance(exc.detail, dict)
        else {"code": "INVALID_REQUEST", "message": str(exc.detail)}
    )
    return JSONResponse(
        {"error": {**detail, "request_id": request.state.request_id}}, exc.status_code
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return JSONResponse(
        {
            "error": {
                "code": "INVALID_REQUEST",
                "message": "Please check the request fields.",
                "request_id": request.state.request_id,
            }
        },
        422,
    )


@app.exception_handler(IntegrityError)
async def conflict_error(request, exc):
    return JSONResponse(
        {
            "error": {
                "code": "CONFLICT",
                "message": "This record already exists or was changed. Refresh and retry.",
                "request_id": request.state.request_id,
            }
        },
        409,
    )


def admin(authorization: str = Header(default="")):
    token = settings().admin_token
    if len(token) < 32:
        fail("UNAVAILABLE", "Admin access is not configured.", 503)
    if not hmac.compare_digest(authorization, f"Bearer {token}"):
        fail("UNAUTHENTICATED", "Administrator authentication required.", 401)
    return "local-editor"


def guest(x_guest_id: UUID = Header()):
    return str(x_guest_id)


def get_or_404(db, model, object_id):
    item = db.get(model, str(object_id))
    if not item:
        fail("NOT_FOUND", "Record not found.", 404)
    return item


def audit(db, actor, action, object_id, reason):
    db.add(
        Audit(actor_id=actor, action=action, object_id=str(object_id), reason=reason)
    )


@app.get("/health")
def health(db: Session = Db):
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/api/v1/daily")
def daily(
    date: date | None = None,
    country: str = Query(default="US", pattern="^(US|GB|CA|AU)$"),
    db: Session = Db,
):
    day = date or datetime.now(timezone.utc).date()
    if day > datetime.now(timezone.utc).date():
        fail("INVALID_REQUEST", "Future daily editions are not available.")
    slate = db.scalar(select(Slate).where(Slate.slate_date == day))
    items = []
    if slate:
        for entry in db.scalars(
            select(SlateItem)
            .where(SlateItem.slate_id == slate.id)
            .order_by(SlateItem.rank)
        ):
            discovery = db.get(Discovery, entry.discovery_id)
            revision = db.get(Revision, entry.experience_revision_id)
            if eligible(db, discovery, revision, (country,)):
                items.append(card(db, discovery, revision, entry.rank))
    return {
        "date": str(day),
        "date_basis": "UTC",
        "slate_id": slate.id if slate else None,
        "algorithm_version": "editorial-v1",
        "items": items,
        "has_more_daily_items": False,
        "shortfall_reason": "catalog_insufficient" if len(items) < 3 else None,
    }


@app.get("/api/v1/discoveries/{slug}")
def detail(
    slug: str,
    country: str = Query(default="US", pattern="^(US|GB|CA|AU)$"),
    db: Session = Db,
):
    discovery = db.scalar(select(Discovery).where(Discovery.slug == slug))
    revision = (
        db.get(Revision, discovery.published_revision_id)
        if discovery and discovery.published_revision_id
        else None
    )
    if not eligible(db, discovery, revision, (country,)):
        fail("NOT_FOUND", "This discovery is not available.", 404)
    asset = db.get(Asset, discovery.asset_id)
    return {
        **card(db, discovery, revision),
        "revision": revision.revision_number,
        "locale": "en",
        "editorial": {
            "title": revision.editorial_title,
            "hook": revision.hook,
            "intro": revision.intro,
            "why_worth_it": revision.why_worth_it,
        },
        "source": {
            "original_title": asset.original_title,
            "creator": asset.creator,
            "platform": asset.platform,
            "canonical_url": asset.canonical_url,
        },
        "delivery": {
            "mode": revision.delivery_mode,
            "provider": asset.platform,
            "provider_video_id": asset.external_id,
            "external_url": asset.canonical_url,
        },
        "feedback_enabled": True,
    }


@app.post("/api/v1/feedback")
def feedback(body: s.FeedbackInput, user: str = Depends(guest), db: Session = Db):
    discovery = get_or_404(db, Discovery, body.discovery_id)
    slate = get_or_404(db, Slate, body.slate_id)
    entry = db.scalar(
        select(SlateItem).where(
            SlateItem.slate_id == slate.id, SlateItem.discovery_id == discovery.id
        )
    )
    if not entry or not eligible(
        db, discovery, db.get(Revision, entry.experience_revision_id)
    ):
        fail("NOT_FOUND", "This discovery is not available in that edition.", 404)
    day = datetime.now(timezone.utc).date()
    item = db.scalar(
        select(Feedback).where(
            Feedback.user_id == user,
            Feedback.discovery_id == discovery.id,
            Feedback.feedback_date == day,
        )
    )
    if item:
        item.value = body.value
    else:
        item = Feedback(
            user_id=user,
            discovery_id=discovery.id,
            slate_id=slate.id,
            feedback_date=day,
            value=body.value,
        )
        db.add(item)
    db.flush()
    return {"id": item.id, "value": item.value}


@app.post("/api/v1/events")
def event(body: s.EventInput, user: str = Depends(guest), db: Session = Db):
    existing = db.get(Event, str(body.event_id))
    if existing:
        if existing.user_id != user:
            fail("CONFLICT", "Event ID already used.", 409)
        return {"accepted": True, "duplicate": True}
    if body.discovery_id:
        discovery = get_or_404(db, Discovery, body.discovery_id)
        revision = (
            db.get(Revision, discovery.published_revision_id)
            if discovery.published_revision_id
            else None
        )
        if not eligible(db, discovery, revision):
            fail("NOT_FOUND", "Discovery unavailable.", 404)
    if abs((datetime.now(timezone.utc) - body.occurred_at).total_seconds()) > 86400:
        fail("INVALID_REQUEST", "Event timestamp must be within 24 hours.")
    db.add(
        Event(
            event_id=str(body.event_id),
            user_id=user,
            session_id=str(body.session_id),
            event_type=body.event_type,
            discovery_id=str(body.discovery_id) if body.discovery_id else None,
            occurred_at=body.occurred_at,
        )
    )
    db.flush()
    return {"accepted": True, "duplicate": False}


@app.post("/api/v1/privacy/delete")
def privacy_delete(user: str = Depends(guest), db: Session = Db):
    db.execute(delete(Feedback).where(Feedback.user_id == user))
    db.execute(delete(Event).where(Event.user_id == user))
    db.execute(
        delete(MutationReceipt).where(
            MutationReceipt.owner_hash == hashlib.sha256(user.encode()).hexdigest()
        )
    )
    db.flush()
    return {"deleted": True}


@app.post("/api/v1/reports", status_code=201)
def report(body: s.ReportInput, db: Session = Db):
    get_or_404(db, Discovery, body.discovery_id)
    item = Report(discovery_id=str(body.discovery_id), reason=body.reason)
    db.add(item)
    db.flush()
    return {"id": item.id, "state": "open"}


@app.post("/api/v1/admin/assets/import")
def import_asset(body: s.AssetInput, actor: str = Depends(admin), db: Session = Db):
    url, platform, external_id = normalize_url(body.canonical_url)
    if platform == "youtube" and body.content_type != "video":
        fail("INVALID_REQUEST", "YouTube sources must be videos.")
    existing = db.scalar(select(Asset).where(Asset.canonical_url == url))
    if existing:
        return {"id": existing.id, "duplicate": True}
    item = Asset(
        **body.model_dump(exclude={"canonical_url"}),
        canonical_url=url,
        platform=platform,
        external_id=external_id,
    )
    db.add(item)
    db.flush()
    audit(
        db, actor, "asset_import", item.id, "Manual URL import; metadata not fetched."
    )
    db.flush()
    return {"id": item.id, "duplicate": False}


@app.get("/api/v1/admin/assets")
def assets(offset: int = Query(0, ge=0), actor: str = Depends(admin), db: Session = Db):
    rows = db.scalars(
        select(Asset).order_by(Asset.created_at.desc()).offset(offset).limit(50)
    ).all()
    return [
        {
            "id": a.id,
            "original_title": a.original_title,
            "creator": a.creator,
            "canonical_url": a.canonical_url,
            "is_demo": a.is_demo,
            "moderation_state": a.moderation_state,
        }
        for a in rows
    ]


@app.post("/api/v1/admin/assets/{asset_id}/rights-review")
def rights_review(
    asset_id: UUID, body: s.RightsInput, actor: str = Depends(admin), db: Session = Db
):
    asset = get_or_404(db, Asset, asset_id)
    if body.expires_at <= datetime.now(timezone.utc):
        fail("INVALID_REQUEST", "Review expiry must be in the future.")
    if body.evidence_url.scheme != "https":
        fail("INVALID_REQUEST", "Use an HTTPS evidence reference.")
    db.add(
        Rights(
            asset_id=asset.id,
            permits_link=body.permits_link,
            permits_embed=body.permits_embed,
            evidence_url=str(body.evidence_url),
            expires_at=body.expires_at,
            reviewed_by=actor,
            review_status="approved",
        )
    )
    asset.moderation_state = "clear"
    # A human review explicitly moves a candidate out of the seed-only state.
    asset.is_demo = False
    audit(db, actor, "rights_review", asset.id, body.reason)
    db.flush()
    return {"reviewed": True}


@app.post("/api/v1/admin/assets/{asset_id}/availability-check")
def availability_check(
    asset_id: UUID,
    body: s.AvailabilityInput,
    actor: str = Depends(admin),
    db: Session = Db,
):
    get_or_404(db, Asset, asset_id)
    if body.expires_at <= datetime.now(timezone.utc):
        fail("INVALID_REQUEST", "Check expiry must be in the future.")
    db.add(Availability(asset_id=str(asset_id), **body.model_dump()))
    audit(
        db,
        actor,
        "availability_check",
        asset_id,
        f"{body.country_code}: {body.result}; {body.method}",
    )
    db.flush()
    return {"recorded": True}


@app.post("/api/v1/admin/discoveries", status_code=201)
def create_discovery(
    body: s.DiscoveryInput, actor: str = Depends(admin), db: Session = Db
):
    get_or_404(db, Asset, body.asset_id)
    item = Discovery(
        **body.model_dump(exclude={"asset_id"}), asset_id=str(body.asset_id)
    )
    db.add(item)
    db.flush()
    audit(db, actor, "discovery_create", item.id, "Manual draft")
    db.flush()
    return {"id": item.id}


@app.get("/api/v1/admin/discoveries")
def discoveries(
    offset: int = Query(0, ge=0), actor: str = Depends(admin), db: Session = Db
):
    output = []
    for d in db.scalars(
        select(Discovery).order_by(Discovery.created_at.desc()).offset(offset).limit(50)
    ):
        revisions = db.scalars(
            select(Revision)
            .where(Revision.discovery_id == d.id)
            .order_by(Revision.revision_number.desc())
        ).all()
        output.append(
            {
                "id": d.id,
                "asset_id": d.asset_id,
                "slug": d.slug,
                "topic": d.topic,
                "publication_state": d.publication_state,
                "revisions": [
                    {
                        "id": r.id,
                        "title": r.editorial_title,
                        "number": r.revision_number,
                        "hook": r.hook,
                        "intro": r.intro,
                        "why_worth_it": r.why_worth_it,
                        "evidence_level": r.evidence_level,
                        "evidence_ids": r.evidence_ids,
                        "approved": bool(r.editorial_approved_at),
                        "delivery_mode": r.delivery_mode,
                    }
                    for r in revisions
                ],
            }
        )
    return output


@app.post("/api/v1/admin/discoveries/{discovery_id}/revisions", status_code=201)
def create_revision(
    discovery_id: UUID,
    body: s.RevisionInput,
    actor: str = Depends(admin),
    db: Session = Db,
):
    db.scalar(
        select(Discovery).where(Discovery.id == str(discovery_id)).with_for_update()
    )
    discovery = get_or_404(db, Discovery, discovery_id)
    rows = db.scalars(
        select(Revision).where(Revision.discovery_id == discovery.id)
    ).all()
    item = Revision(
        **body.model_dump(exclude={"evidence_ids"}),
        evidence_ids=[str(x) for x in body.evidence_ids],
        discovery_id=discovery.id,
        revision_number=max((r.revision_number for r in rows), default=0) + 1,
    )
    db.add(item)
    db.flush()
    audit(db, actor, "revision_create", item.id, "Immutable editorial draft")
    db.flush()
    return {"id": item.id, "revision_number": item.revision_number}


@app.post("/api/v1/admin/discoveries/{discovery_id}/approve")
def approve(
    discovery_id: UUID,
    body: s.RevisionDecision,
    actor: str = Depends(admin),
    db: Session = Db,
):
    discovery = get_or_404(db, Discovery, discovery_id)
    revision = get_or_404(db, Revision, body.revision_id)
    if revision.discovery_id != discovery.id:
        fail("CONFLICT", "Revision belongs to another discovery.", 409)
    revision.editorial_approved_at = revision.rights_approved_at = datetime.now(
        timezone.utc
    )
    revision.editor_id = actor
    if not eligible(db, discovery, revision, published=False):
        db.rollback()
        fail(
            "RIGHTS_BLOCKED",
            "Requires current rights and actual delivery checks for US, GB, CA and AU.",
            409,
        )
    audit(db, actor, "revision_approve", revision.id, body.reason)
    db.flush()
    return {"approved": True}


@app.post("/api/v1/admin/discoveries/{discovery_id}/publish")
def publish(
    discovery_id: UUID,
    body: s.RevisionDecision,
    actor: str = Depends(admin),
    db: Session = Db,
):
    discovery = db.scalar(
        select(Discovery).where(Discovery.id == str(discovery_id)).with_for_update()
    )
    revision = get_or_404(db, Revision, body.revision_id)
    if not eligible(db, discovery, revision, published=False):
        fail(
            "RIGHTS_BLOCKED",
            "Publication requires current human approval, rights and delivery checks.",
            409,
        )
    old = discovery.published_revision_id
    discovery.published_revision_id = revision.id
    discovery.publication_state = "published"
    audit(
        db,
        actor,
        "publish",
        discovery.id,
        f"{body.reason}; revision {old} -> {revision.id}",
    )
    db.flush()
    return {"published": True}


@app.post("/api/v1/admin/discoveries/{discovery_id}/quarantine")
def quarantine(
    discovery_id: UUID, body: s.Decision, actor: str = Depends(admin), db: Session = Db
):
    discovery = db.scalar(
        select(Discovery).where(Discovery.id == str(discovery_id)).with_for_update()
    )
    if not discovery:
        fail("NOT_FOUND", "Discovery not found.", 404)
    asset = db.get(Asset, discovery.asset_id)
    asset.moderation_state = "quarantined"
    # Quarantine the source globally, including other discoveries using it.
    for d in db.scalars(select(Discovery).where(Discovery.asset_id == asset.id)):
        d.publication_state = "quarantined"
    audit(db, actor, "quarantine", discovery.id, body.reason)
    db.flush()
    return {"quarantined": True}


@app.post("/api/v1/admin/slates", status_code=201)
def create_slate(body: s.SlateInput, actor: str = Depends(admin), db: Session = Db):
    if len(set(body.discovery_ids)) != len(body.discovery_ids):
        fail("INVALID_REQUEST", "Daily discoveries must be unique.")
    if db.scalar(select(Slate).where(Slate.slate_date == body.date)):
        fail(
            "CONFLICT",
            "This edition is already frozen. Quarantine unsafe items instead of replacing it.",
            409,
        )
    entries = []
    for did in body.discovery_ids:
        d = get_or_404(db, Discovery, did)
        r = (
            db.get(Revision, d.published_revision_id)
            if d.published_revision_id
            else None
        )
        if not eligible(db, d, r):
            fail(
                "RIGHTS_BLOCKED",
                "Only currently eligible published discoveries can be selected.",
                409,
            )
        entries.append((d, r))
    slate = Slate(slate_date=body.date)
    db.add(slate)
    db.flush()
    for rank, (d, r) in enumerate(entries, 1):
        db.add(
            SlateItem(
                slate_id=slate.id,
                rank=rank,
                discovery_id=d.id,
                experience_revision_id=r.id,
            )
        )
    audit(
        db,
        actor,
        "slate_publish",
        slate.id,
        f"Unified edition {body.date}: {[d.id for d, _ in entries]}",
    )
    db.flush()
    return {"id": slate.id}


@app.get("/api/v1/admin/audit")
def audits(actor: str = Depends(admin), db: Session = Db):
    return [
        {
            "id": x.id,
            "actor": x.actor_id,
            "action": x.action,
            "object_id": x.object_id,
            "reason": x.reason,
            "created_at": x.created_at,
        }
        for x in db.scalars(select(Audit).order_by(Audit.created_at.desc()).limit(50))
    ]


@app.get("/api/v1/admin/reports")
def reports(actor: str = Depends(admin), db: Session = Db):
    return [
        {
            "id": x.id,
            "discovery_id": x.discovery_id,
            "reason": x.reason,
            "state": x.state,
        }
        for x in db.scalars(select(Report).order_by(Report.created_at.desc()).limit(50))
    ]


from .journal import router as journal_router  # noqa: E402

app.include_router(journal_router)
