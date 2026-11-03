from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from fastapi import Request
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Settings(BaseSettings):
    database_url: str = (
        "postgresql+psycopg://elsewhere:elsewhere@127.0.0.1:5432/elsewhere"
    )
    admin_token: str = ""
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env", extra="ignore"
    )


@lru_cache
def settings():
    return Settings()


class Base(DeclarativeBase):
    pass


engine = create_engine(settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def get_db(request: Request):
    if hasattr(request.state, "db"):
        yield request.state.db
        return
    with SessionLocal() as session:
        yield session
