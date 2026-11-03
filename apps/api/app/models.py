from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid4())


class Asset(Base):
    __tablename__ = "source_assets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    canonical_url: Mapped[str] = mapped_column(Text, unique=True)
    platform: Mapped[str] = mapped_column(String(40))
    external_id: Mapped[str | None] = mapped_column(String(100))
    original_title: Mapped[str] = mapped_column(Text)
    creator: Mapped[str] = mapped_column(String(300))
    content_type: Mapped[str] = mapped_column(String(20))
    original_language: Mapped[str] = mapped_column(String(20), default="en")
    moderation_state: Mapped[str] = mapped_column(String(20), default="pending")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Rights(Base):
    __tablename__ = "asset_rights"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("source_assets.id"), index=True)
    permits_link: Mapped[bool] = mapped_column(Boolean, default=False)
    permits_embed: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_url: Mapped[str] = mapped_column(Text)
    review_status: Mapped[str] = mapped_column(String(20), default="pending")
    reviewed_by: Mapped[str] = mapped_column(String(100))
    reviewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Availability(Base):
    __tablename__ = "asset_availability_checks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("source_assets.id"), index=True)
    country_code: Mapped[str] = mapped_column(String(2))
    delivery_mode: Mapped[str] = mapped_column(String(30))
    result: Mapped[str] = mapped_column(String(20))
    method: Mapped[str] = mapped_column(Text)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Discovery(Base):
    __tablename__ = "discoveries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("source_assets.id"))
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    topic: Mapped[str] = mapped_column(String(60))
    estimated_minutes: Mapped[int | None] = mapped_column(Integer)
    publication_state: Mapped[str] = mapped_column(
        String(20), default="draft", index=True
    )
    published_revision_id: Mapped[str | None] = mapped_column(
        ForeignKey(
            "experience_revisions.id", use_alter=True, name="fk_published_revision"
        )
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Revision(Base):
    __tablename__ = "experience_revisions"
    __table_args__ = (UniqueConstraint("discovery_id", "revision_number"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    discovery_id: Mapped[str] = mapped_column(ForeignKey("discoveries.id"))
    revision_number: Mapped[int] = mapped_column(Integer)
    editorial_title: Mapped[str] = mapped_column(Text)
    hook: Mapped[str] = mapped_column(Text)
    intro: Mapped[str] = mapped_column(Text)
    why_worth_it: Mapped[str] = mapped_column(Text)
    delivery_mode: Mapped[str] = mapped_column(String(30), default="external_link")
    evidence_level: Mapped[str] = mapped_column(String(2))
    evidence_ids: Mapped[list] = mapped_column(JSON, default=list)
    editorial_approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    rights_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    editor_id: Mapped[str | None] = mapped_column(String(100))


class Slate(Base):
    __tablename__ = "daily_slates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    slate_date: Mapped[date] = mapped_column(Date, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SlateItem(Base):
    __tablename__ = "daily_slate_items"
    __table_args__ = (
        UniqueConstraint("slate_id", "discovery_id"),
        CheckConstraint("rank BETWEEN 1 AND 3"),
    )
    slate_id: Mapped[str] = mapped_column(
        ForeignKey("daily_slates.id"), primary_key=True
    )
    rank: Mapped[int] = mapped_column(Integer, primary_key=True)
    discovery_id: Mapped[str] = mapped_column(ForeignKey("discoveries.id"))
    experience_revision_id: Mapped[str] = mapped_column(
        ForeignKey("experience_revisions.id")
    )


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (UniqueConstraint("user_id", "discovery_id", "feedback_date"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    discovery_id: Mapped[str] = mapped_column(ForeignKey("discoveries.id"))
    slate_id: Mapped[str] = mapped_column(ForeignKey("daily_slates.id"))
    feedback_date: Mapped[date] = mapped_column(Date)
    value: Mapped[str] = mapped_column(String(20))


class Event(Base):
    __tablename__ = "events"
    event_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    session_id: Mapped[str] = mapped_column(String(100))
    event_type: Mapped[str] = mapped_column(String(40))
    discovery_id: Mapped[str | None] = mapped_column(ForeignKey("discoveries.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Report(Base):
    __tablename__ = "content_reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    discovery_id: Mapped[str] = mapped_column(ForeignKey("discoveries.id"))
    reason: Mapped[str] = mapped_column(Text)
    state: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Audit(Base):
    __tablename__ = "admin_audit"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    actor_id: Mapped[str] = mapped_column(String(100))
    action: Mapped[str] = mapped_column(String(60))
    object_id: Mapped[str] = mapped_column(String(36))
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class MutationReceipt(Base):
    __tablename__ = "mutation_receipts"
    scope_key: Mapped[str] = mapped_column(String(64), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    owner_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    response: Mapped[dict] = mapped_column(JSON)
    status_code: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    username: Mapped[str] = mapped_column(String(40), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AccountSession(Base):
    __tablename__ = "account_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Reflection(Base):
    __tablename__ = "reflections"
    __table_args__ = (CheckConstraint("version >= 1"),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), index=True
    )
    discovery_id: Mapped[str] = mapped_column(ForeignKey("discoveries.id"))
    revision_id: Mapped[str] = mapped_column(ForeignKey("experience_revisions.id"))
    body: Mapped[str] = mapped_column(Text)
    watching_state: Mapped[str] = mapped_column(String(20))
    mood: Mapped[str | None] = mapped_column(String(20))
    version: Mapped[int] = mapped_column(Integer, default=1)
    share_id: Mapped[str | None] = mapped_column(String(40), unique=True)
    moderation_state: Mapped[str] = mapped_column(String(20), default="clear")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ReflectionReport(Base):
    __tablename__ = "reflection_reports"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    reflection_id: Mapped[str | None] = mapped_column(
        ForeignKey("reflections.id", ondelete="SET NULL")
    )
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
