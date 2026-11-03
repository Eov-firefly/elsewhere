"""One transaction per request; retry receipts commit atomically with mutations."""

import hashlib
import json

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from .db import SessionLocal
from .models import MutationReceipt


class TransactionRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def handle(request):
            factory = getattr(request.app.state, "session_factory", SessionLocal)
            with factory() as db:
                request.state.db = db
                try:
                    key = request.headers.get("idempotency-key")
                    scope = fingerprint = None
                    if (
                        key
                        and request.method == "POST"
                        and not request.url.path.startswith("/api/v1/auth/")
                    ):
                        if len(key) > 100:
                            raise HTTPException(
                                400,
                                {
                                    "code": "INVALID_REQUEST",
                                    "message": "Idempotency key is too long.",
                                },
                            )
                        authorization = request.headers.get("authorization", "")
                        if "/admin/" in request.url.path:
                            from .main import admin

                            admin(authorization)
                        if request.url.path.startswith("/api/v1/reflections"):
                            from .journal import require_account

                            await run_in_threadpool(require_account, request, db)
                        identity = (
                            authorization
                            + request.headers.get("x-guest-id", "")
                            + request.cookies.get("elsewhere_session", "")
                        )
                        scope = hashlib.sha256(
                            f"{request.url.path}:{identity}:{key}".encode()
                        ).hexdigest()
                        fingerprint = hashlib.sha256(await request.body()).hexdigest()
                        if db.bind.dialect.name == "postgresql":
                            lock = int(scope[:15], 16)
                            await run_in_threadpool(
                                db.execute,
                                text("SELECT pg_advisory_xact_lock(:key)"),
                                {"key": lock},
                            )
                        receipt = await run_in_threadpool(
                            db.get, MutationReceipt, scope
                        )
                        if receipt:
                            if receipt.fingerprint != fingerprint:
                                raise HTTPException(
                                    409,
                                    {
                                        "code": "CONFLICT",
                                        "message": "Idempotency key was already used with different input.",
                                    },
                                )
                            response = JSONResponse(
                                receipt.response, receipt.status_code
                            )
                            await run_in_threadpool(db.commit)
                            return response
                    response = await handler(request)
                    if scope and response.status_code < 400:
                        account_id = getattr(request.state, "account_id", None)
                        owner = (
                            "account:" + account_id
                            if account_id
                            else request.headers.get("x-guest-id")
                        )
                        db.add(
                            MutationReceipt(
                                scope_key=scope,
                                fingerprint=fingerprint,
                                owner_hash=hashlib.sha256(owner.encode()).hexdigest()
                                if owner
                                else None,
                                response=json.loads(response.body),
                                status_code=response.status_code,
                            )
                        )
                    await run_in_threadpool(db.commit)
                    return response
                except BaseException:
                    await run_in_threadpool(db.rollback)
                    raise

        return handle
