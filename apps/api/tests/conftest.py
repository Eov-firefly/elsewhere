import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("ADMIN_TOKEN", "test-only-token-" + "x" * 40)

import pytest
from contextlib import nullcontext
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.db import Base, get_db
from app.main import app, requests
from app.journal import attempts


@pytest.fixture
def db():
    url = os.environ.get("TEST_DATABASE_URL")
    if url:
        # Each test uses its own schema, never the application's public schema.
        admin_engine = create_engine(url)
        schema = "test_" + uuid4().hex
        with admin_engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = admin_engine.execution_options(schema_translate_map={None: schema})
        Base.metadata.create_all(engine)
        try:
            with Session(engine, expire_on_commit=False) as session:
                yield session
        finally:
            with admin_engine.begin() as conn:
                conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            admin_engine.dispose()
        return
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        yield session
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    app.state.session_factory = lambda: nullcontext(db)
    requests.clear()
    attempts.clear()
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()
    del app.state.session_factory


@pytest.fixture
def auth():
    return {"Authorization": "Bearer " + os.environ["ADMIN_TOKEN"]}
