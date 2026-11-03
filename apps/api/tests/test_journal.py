from datetime import timedelta

from sqlalchemy import func, select

from app.journal import COOKIE, digest
from app.models import (
    Account,
    AccountSession,
    MutationReceipt,
    Reflection,
    ReflectionReport,
    now,
)
from test_workflow import draft, review, publish, post

PASSWORD = "a private test passphrase"


def signup(client, name):
    # A fresh browser/device; account switching on one browser intentionally rotates its old session.
    client.cookies.clear()
    response = client.post(
        "/api/v1/auth/register", json={"username": name, "password": PASSWORD}
    )
    assert response.status_code == 201, response.text
    token = client.cookies.get(COOKIE)
    return {"Cookie": f"{COOKIE}={token}"}


def source(client, auth):
    asset, discovery, revision = draft(client, auth)
    review(client, auth, asset)
    publish(client, auth, discovery, revision)
    return asset, discovery


def write(
    client, headers, discovery, text="A small thing I want to remember.", **fields
):
    response = client.post(
        "/api/v1/reflections",
        headers=headers,
        json={
            "discovery_id": discovery,
            "body": text,
            "watching_state": "paused",
            "mood": "calm",
            **fields,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_accounts_hash_credentials_and_use_revocable_httponly_sessions(client, db):
    response = client.post(
        "/api/v1/auth/register", json={"username": "alice", "password": PASSWORD}
    )
    assert response.status_code == 201
    cookie = response.headers["set-cookie"].lower()
    assert (
        "httponly" in cookie and "samesite=strict" in cookie and "path=/api" in cookie
    )
    assert "password" not in response.json()
    user = db.scalar(select(Account))
    assert (
        user.password_hash.startswith("$argon2") and PASSWORD not in user.password_hash
    )
    token = client.cookies.get(COOKIE)
    session = db.scalar(select(AccountSession))
    assert session.token_hash == digest(token) and token not in session.token_hash
    assert client.get("/api/v1/auth/me").json() == {"username": "alice"}
    client.post("/api/v1/auth/logout")
    assert (
        client.get(
            "/api/v1/auth/me", headers={"Cookie": f"{COOKIE}={token}"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"username": "alice", "password": "not the correct password"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/login", json={"username": "alice", "password": PASSWORD}
        ).status_code
        == 200
    )


def test_private_by_default_and_cross_account_access_blocked(client, auth):
    _, discovery = source(client, auth)
    assert (
        client.post(
            "/api/v1/reflections", json={"discovery_id": discovery, "body": "Anonymous"}
        ).status_code
        == 401
    )
    alice = signup(client, "alice")
    note = write(client, alice, discovery)
    assert note["visibility"] == "private" and note["share_id"] is None
    assert client.get("/api/v1/shared-reflections/" + note["id"]).status_code == 404
    bob = signup(client, "bob")
    for suffix, data in [
        ("edit", {"version": 1, "body": "tamper"}),
        ("delete", {"version": 1}),
        ("share", {"version": 1}),
    ]:
        assert (
            client.post(
                f"/api/v1/reflections/{note['id']}/{suffix}", headers=bob, json=data
            ).status_code
            == 404
        )
    assert (
        client.get(f"/api/v1/reflections/{note['id']}", headers=bob).status_code == 404
    )
    assert client.get("/api/v1/reflections", headers=bob).json()["items"] == []
    assert (
        client.get("/api/v1/reflections/export", headers=bob).json()["reflections"]
        == []
    )
    assert (
        client.get("/api/v1/reflections", headers=alice).json()["items"][0]["body"]
        == note["body"]
    )


def test_retries_are_account_bound_and_cannot_bypass_session_revocation(
    client, auth, db
):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    headers = {**alice, "Idempotency-Key": "save-this-once"}
    first = write(client, headers, discovery)
    second = write(client, headers, discovery)
    assert first["id"] == second["id"]
    bob = signup(client, "bob")
    third = write(client, {**bob, "Idempotency-Key": "save-this-once"}, discovery)
    assert third["id"] != first["id"]
    assert db.scalar(select(func.count()).select_from(Reflection)) == 2
    client.post("/api/v1/auth/logout", headers=alice)
    response = client.post(
        "/api/v1/reflections",
        headers=headers,
        json={
            "discovery_id": discovery,
            "body": first["body"],
            "watching_state": "paused",
            "mood": "calm",
        },
    )
    assert response.status_code == 401


def test_multiple_visits_timeline_summary_and_export(client, auth):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    ids = [
        write(client, alice, discovery, f"Visit {i}", watching_state=state)["id"]
        for i, state in enumerate(("watching", "paused", "finished"))
    ]
    summary = client.get("/api/v1/reflections/summary", headers=alice).json()
    assert summary["entries"] == 3 and summary["discoveries"] == 1
    assert summary["months"][0]["entries"] == 3 and summary["month_basis"] == "UTC"
    assert "minutes" not in summary and "learning_score" not in summary
    first = client.get("/api/v1/reflections?limit=2", headers=alice).json()
    second = client.get(
        f"/api/v1/reflections?limit=2&cursor={first['next_cursor']}", headers=alice
    ).json()
    assert len(first["items"]) == 2 and len(second["items"]) == 1
    assert {x["id"] for x in first["items"] + second["items"]} == set(ids)
    exported = client.get("/api/v1/reflections/export", headers=alice)
    assert (
        len(exported.json()["reflections"]) == 3
        and "attachment" in exported.headers["content-disposition"]
    )


def test_sharing_is_explicit_and_edit_or_unshare_revokes_old_link(client, auth):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    note = write(client, alice, discovery)
    path = f"/api/v1/reflections/{note['id']}"
    shared = client.post(path + "/share", headers=alice, json={"version": 1}).json()
    public = client.get("/api/v1/shared-reflections/" + shared["share_id"]).json()
    assert public["author"] == "alice" and public["body"] == note["body"]
    assert not any(key in public for key in ("id", "account_id", "version", "share_id"))
    edited = client.post(
        path + "/edit",
        headers=alice,
        json={"version": 2, "body": "A second thought", "watching_state": "finished"},
    )
    assert edited.status_code == 200 and edited.json()["visibility"] == "private"
    assert (
        client.get("/api/v1/shared-reflections/" + shared["share_id"]).status_code
        == 404
    )
    assert (
        client.post(
            path + "/edit", headers=alice, json={"version": 1, "body": "Old device"}
        ).status_code
        == 409
    )
    reshared = client.post(path + "/share", headers=alice, json={"version": 3}).json()
    assert reshared["share_id"] != shared["share_id"]
    assert (
        client.post(path + "/unshare", headers=alice, json={"version": 4}).status_code
        == 200
    )
    assert (
        client.get("/api/v1/shared-reflections/" + reshared["share_id"]).status_code
        == 404
    )


def test_moderation_never_exposes_private_text(client, auth):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    note = write(client, alice, discovery)
    path = f"/api/v1/reflections/{note['id']}"
    shared = client.post(path + "/share", headers=alice, json={"version": 1}).json()
    url = "/api/v1/shared-reflections/" + shared["share_id"]
    assert (
        client.post(url + "/report", json={"reason": "Synthetic report"}).status_code
        == 201
    )
    assert client.get("/api/v1/admin/reflection-reports").status_code == 401
    assert (
        client.get("/api/v1/admin/reflection-reports", headers=auth).json()[0]["body"]
        == note["body"]
    )
    assert (
        client.post(
            f"/api/v1/admin/reflections/{note['id']}/hide",
            headers=auth,
            json={"reason": "Synthetic moderation decision"},
        ).status_code
        == 200
    )
    assert client.get(url).status_code == 404
    assert (
        client.get("/api/v1/admin/reflection-reports", headers=auth).json()[0]["body"]
        is None
    )
    assert client.get(path, headers=alice).json()["body"] == note["body"]
    assert (
        client.post(path + "/share", headers=alice, json={"version": 3}).status_code
        == 403
    )


def test_source_quarantine_keeps_words_but_hides_source(client, auth):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    note = write(client, alice, discovery)
    shared = client.post(
        f"/api/v1/reflections/{note['id']}/share", headers=alice, json={"version": 1}
    ).json()
    post(
        client,
        auth,
        f"discoveries/{discovery}/quarantine",
        {"reason": "Synthetic source withdrawal"},
    )
    private = client.get(f"/api/v1/reflections/{note['id']}", headers=alice).json()
    public = client.get("/api/v1/shared-reflections/" + shared["share_id"]).json()
    assert private["body"] == note["body"] and private["source"] is None
    assert public["source"] is None and "canonical_url" not in str(public)
    assert (
        client.post(
            "/api/v1/reflections",
            headers=alice,
            json={"discovery_id": discovery, "body": "new note"},
        ).status_code
        == 404
    )


def test_deletion_removes_text_receipts_and_public_links(client, auth, db):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    note = write(client, {**alice, "Idempotency-Key": "private-text-copy"}, discovery)
    shared = client.post(
        f"/api/v1/reflections/{note['id']}/share",
        headers={**alice, "Idempotency-Key": "share-text-copy"},
        json={"version": 1},
    ).json()
    assert db.scalar(select(func.count()).select_from(MutationReceipt)) == 2
    assert (
        client.post(
            f"/api/v1/reflections/{note['id']}/delete",
            headers=alice,
            json={"version": 2},
        ).status_code
        == 200
    )
    assert db.scalar(select(func.count()).select_from(Reflection)) == 0
    assert db.scalar(select(func.count()).select_from(MutationReceipt)) == 0
    assert (
        client.get("/api/v1/shared-reflections/" + shared["share_id"]).status_code
        == 404
    )
    write(client, alice, discovery)
    assert (
        client.post(
            "/api/v1/auth/delete",
            headers=alice,
            json={"password": "wrong test password"},
        ).status_code
        == 401
    )
    assert client.post(
        "/api/v1/auth/delete", headers=alice, json={"password": PASSWORD}
    ).json()["deleted"]
    for model in (Account, AccountSession, Reflection, ReflectionReport):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert client.get("/api/v1/reflections", headers=alice).status_code == 401


def test_expired_sessions_and_invalid_reflections(client, auth, db):
    _, discovery = source(client, auth)
    alice = signup(client, "alice")
    for body in ("   ", "a" * 3001):
        assert (
            client.post(
                "/api/v1/reflections",
                headers=alice,
                json={"discovery_id": discovery, "body": body},
            ).status_code
            == 422
        )
    assert (
        client.post(
            "/api/v1/reflections",
            headers=alice,
            json={
                "discovery_id": discovery,
                "body": "Text",
                "share_id": "force-public",
            },
        ).status_code
        == 422
    )
    session = db.scalar(select(AccountSession))
    session.expires_at = now() - timedelta(seconds=1)
    db.commit()
    assert client.get("/api/v1/reflections", headers=alice).status_code == 401
