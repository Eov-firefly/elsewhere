from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from sqlalchemy import func, select
from app.models import (
    Asset,
    Audit,
    Event,
    Feedback,
    Revision,
    Rights,
)


def post(client, auth, path, data):
    response = client.post("/api/v1/admin/" + path, json=data, headers=auth)
    assert response.status_code in (200, 201), response.text
    return response.json()


def draft(client, auth, number=0):
    asset = post(
        client,
        auth,
        "assets/import",
        {
            "canonical_url": f"https://www.youtube.com/watch?v=TESTVIDEO{number:02d}",
            "original_title": "Synthetic test source",
            "creator": "Test creator",
            "content_type": "video",
        },
    )["id"]
    discovery = post(
        client,
        auth,
        "discoveries",
        {
            "asset_id": asset,
            "slug": f"test-{number}",
            "topic": "design-craft",
            "estimated_minutes": 15,
        },
    )["id"]
    revision = post(
        client,
        auth,
        f"discoveries/{discovery}/revisions",
        {
            "editorial_title": "A test discovery",
            "hook": "Test hook",
            "intro": "Test introduction",
            "why_worth_it": "Test rationale",
            "evidence_level": "M0",
            "evidence_ids": ["https://example.com/test"],
        },
    )["id"]
    return asset, discovery, revision


def review(client, auth, asset):
    expiry = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    post(
        client,
        auth,
        f"assets/{asset}/rights-review",
        {
            "permits_link": True,
            "evidence_url": "https://example.com/test-only",
            "expires_at": expiry,
            "reason": "Synthetic automated test, not a real rights review",
        },
    )
    for country in ("US", "GB", "CA", "AU"):
        post(
            client,
            auth,
            f"assets/{asset}/availability-check",
            {
                "country_code": country,
                "delivery_mode": "external_link",
                "result": "passed",
                "method": "Synthetic test fixture only",
                "expires_at": expiry,
            },
        )


def publish(client, auth, discovery, revision):
    decision = {"revision_id": revision, "reason": "Synthetic test approval only"}
    post(client, auth, f"discoveries/{discovery}/approve", decision)
    post(client, auth, f"discoveries/{discovery}/publish", decision)


def test_full_publish_slate_feedback_and_quarantine(client, auth, db):
    asset, discovery, revision = draft(client, auth)
    decision = {"revision_id": revision, "reason": "test"}
    assert (
        client.post(
            f"/api/v1/admin/discoveries/{discovery}/publish",
            headers=auth,
            json=decision,
        ).status_code
        == 409
    )
    assert client.get("/api/v1/discoveries/test-0").status_code == 404
    review(client, auth, asset)
    publish(client, auth, discovery, revision)
    today = str(datetime.now(timezone.utc).date())
    slate = post(client, auth, "slates", {"date": today, "discovery_ids": [discovery]})[
        "id"
    ]
    edition = client.get("/api/v1/daily").json()
    assert edition["slate_id"] == slate
    assert edition["items"][0]["id"] == discovery
    assert edition["shortfall_reason"] == "catalog_insufficient"
    assert (
        client.get("/api/v1/daily", headers={"X-Guest-ID": str(uuid4())}).json()
        == edition
    )
    detail = client.get("/api/v1/discoveries/test-0").json()
    assert detail["delivery"]["external_url"].startswith("https://www.youtube.com/")
    assert "evidence_ids" not in detail and "rights" not in detail
    user = {"X-Guest-ID": str(uuid4())}
    body = {"discovery_id": discovery, "slate_id": slate, "value": "worth_it"}
    first = client.post("/api/v1/feedback", headers=user, json=body)
    assert first.status_code == 200
    second = client.post("/api/v1/feedback", headers=user, json=body)
    assert first.json()["id"] == second.json()["id"]
    assert db.scalar(select(func.count()).select_from(Feedback)) == 1
    post(
        client,
        auth,
        f"discoveries/{discovery}/quarantine",
        {"reason": "test complaint"},
    )
    assert client.get("/api/v1/daily").json()["items"] == []
    assert client.get("/api/v1/discoveries/test-0").status_code == 404
    assert db.scalar(select(func.count()).select_from(Audit)) >= 10


@pytest.mark.parametrize(
    "url",
    [
        "http://www.youtube.com/watch?v=TESTVIDEO00",
        "https://127.0.0.1/a",
        "https://169.254.169.254/",
        "https://localhost/a",
        "https://[::1]/a",
        "https://www.youtube.com.evil.com/watch?v=TESTVIDEO00",
        "https://user:pass@www.youtube.com/watch?v=TESTVIDEO00",
        "https://www.youtube.com:444/watch?v=TESTVIDEO00",
        "https://www.youtube.com/watch?v=%3Cscript%3E",
    ],
)
def test_unsafe_imports_rejected(client, auth, url):
    response = client.post(
        "/api/v1/admin/assets/import",
        headers=auth,
        json={
            "canonical_url": url,
            "original_title": "test",
            "creator": "test",
            "content_type": "video",
        },
    )
    assert response.status_code in (400, 422), response.text


def test_import_dedup_and_auth(client, auth):
    payload = {
        "canonical_url": "https://youtu.be/TESTVIDEO00?t=3",
        "original_title": "test",
        "creator": "test",
        "content_type": "video",
    }
    assert client.post("/api/v1/admin/assets/import", json=payload).status_code == 401
    first = post(client, auth, "assets/import", payload)
    payload["canonical_url"] = (
        "https://www.youtube.com/watch?v=TESTVIDEO00&list=anything"
    )
    second = post(client, auth, "assets/import", payload)
    assert first["id"] == second["id"] and second["duplicate"]


def test_failed_or_expired_check_overrides_slate(client, auth, db):
    asset, discovery, revision = draft(client, auth)
    review(client, auth, asset)
    publish(client, auth, discovery, revision)
    post(
        client,
        auth,
        "slates",
        {"date": str(datetime.now(timezone.utc).date()), "discovery_ids": [discovery]},
    )
    post(
        client,
        auth,
        f"assets/{asset}/availability-check",
        {
            "country_code": "US",
            "delivery_mode": "external_link",
            "result": "failed",
            "method": "Simulated test failure",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
    )
    assert client.get("/api/v1/daily").json()["items"] == []
    assert len(client.get("/api/v1/daily?country=GB").json()["items"]) == 1
    for r in db.scalars(select(Rights)):
        r.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/v1/daily?country=GB").json()["items"] == []


def test_cannot_publish_foreign_revision_or_unapproved_embed(client, auth):
    asset, discovery, revision = draft(client, auth)
    _, other, _ = draft(client, auth, 1)
    review(client, auth, asset)
    assert (
        client.post(
            f"/api/v1/admin/discoveries/{other}/approve",
            headers=auth,
            json={"revision_id": revision, "reason": "test"},
        ).status_code
        == 409
    )
    embed = post(
        client,
        auth,
        f"discoveries/{discovery}/revisions",
        {
            "editorial_title": "Embed",
            "hook": "test",
            "intro": "test",
            "why_worth_it": "test",
            "delivery_mode": "official_embed",
            "evidence_level": "M0",
            "evidence_ids": ["https://example.com/"],
        },
    )["id"]
    assert (
        client.post(
            f"/api/v1/admin/discoveries/{discovery}/approve",
            headers=auth,
            json={"revision_id": embed, "reason": "test"},
        ).status_code
        == 409
    )


def test_draft_seed_never_public(client, db):
    asset = Asset(
        canonical_url="https://example.com/seed",
        platform="example",
        original_title="Test",
        creator="Test",
        content_type="article",
        is_demo=True,
    )
    db.add(asset)
    db.flush()
    assert client.get("/api/v1/daily").json()["items"] == []


def test_events_dedupe_and_privacy_delete(client, db):
    user = {"X-Guest-ID": str(uuid4())}
    event = {
        "event_id": str(uuid4()),
        "session_id": str(uuid4()),
        "event_type": "daily_view",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
    }
    assert (
        client.post("/api/v1/events", headers=user, json=event).json()["duplicate"]
        is False
    )
    assert (
        client.post("/api/v1/events", headers=user, json=event).json()["duplicate"]
        is True
    )
    assert db.scalar(select(func.count()).select_from(Event)) == 1
    assert client.post("/api/v1/privacy/delete", headers=user).json()["deleted"]
    assert db.scalar(select(func.count()).select_from(Event)) == 0


def test_future_invalid_date_and_request_id(client):
    tomorrow = datetime.now(timezone.utc).date() + timedelta(days=1)
    assert client.get(f"/api/v1/daily?date={tomorrow}").status_code == 400
    response = client.get("/api/v1/daily?date=invalid")
    assert (
        response.status_code == 422
        and response.json()["error"]["request_id"] == response.headers["X-Request-ID"]
    )
    assert client.get("/api/v1/daily?country=XX").status_code == 422


def test_edition_immutable_and_unique(client, auth):
    asset, discovery, revision = draft(client, auth)
    review(client, auth, asset)
    publish(client, auth, discovery, revision)
    today = str(datetime.now(timezone.utc).date())
    assert (
        client.post(
            "/api/v1/admin/slates",
            headers=auth,
            json={"date": today, "discovery_ids": [discovery, discovery]},
        ).status_code
        == 400
    )
    post(client, auth, "slates", {"date": today, "discovery_ids": [discovery]})
    assert (
        client.post(
            "/api/v1/admin/slates",
            headers=auth,
            json={"date": today, "discovery_ids": [discovery]},
        ).status_code
        == 409
    )


def test_idempotent_mutation_is_atomic(client, auth, db):
    asset, discovery, revision = draft(client, auth)
    data = {
        "editorial_title": "Retry test",
        "hook": "Test",
        "intro": "Test",
        "why_worth_it": "Test",
        "evidence_level": "M0",
        "evidence_ids": ["https://example.com/"],
    }
    headers = {**auth, "Idempotency-Key": "test-same-revision"}
    url = f"/api/v1/admin/discoveries/{discovery}/revisions"
    first = client.post(url, headers=headers, json=data)
    second = client.post(url, headers=headers, json=data)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert db.scalar(select(func.count()).select_from(Revision)) == 2
    data["editorial_title"] = "Changed input"
    assert client.post(url, headers=headers, json=data).status_code == 409


def test_oversized_and_chunked_bodies_are_rejected(client):
    assert client.post("/api/v1/reports", content="x" * 33000).status_code == 413

    def chunks():
        yield b"x" * 20000
        yield b"x" * 20000

    assert client.post("/api/v1/reports", content=chunks()).status_code == 413
