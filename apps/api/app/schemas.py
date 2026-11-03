from datetime import date
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl

Short = Annotated[str, Field(min_length=1, max_length=300)]
Copy = Annotated[str, Field(min_length=1, max_length=5000)]
Mode = Literal["external_link", "official_embed"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class AssetInput(Input):
    canonical_url: HttpUrl
    original_title: Short
    creator: Short
    content_type: Literal["video", "article"]
    original_language: str = Field(default="en", max_length=20)


class RightsInput(Input):
    permits_link: bool = False
    permits_embed: bool = False
    evidence_url: HttpUrl
    expires_at: AwareDatetime
    reason: Copy


class AvailabilityInput(Input):
    country_code: Literal["US", "GB", "CA", "AU"]
    delivery_mode: Mode
    result: Literal["passed", "failed"]
    method: Copy
    expires_at: AwareDatetime


class DiscoveryInput(Input):
    asset_id: UUID
    slug: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)
    topic: Literal[
        "science-nature",
        "history-culture",
        "engineering-technology",
        "design-craft",
        "psychology-behavior",
        "everyday-life",
    ]
    estimated_minutes: int | None = Field(default=None, ge=1, le=600)


class RevisionInput(Input):
    editorial_title: Short
    hook: Short
    intro: Copy
    why_worth_it: Copy
    delivery_mode: Mode = "external_link"
    evidence_level: Literal["M0", "M1", "M2"]
    evidence_ids: list[HttpUrl] = Field(min_length=1, max_length=20)


class Decision(Input):
    reason: Copy


class RevisionDecision(Decision):
    revision_id: UUID


class SlateInput(Input):
    date: date
    discovery_ids: list[UUID] = Field(min_length=1, max_length=3)


class FeedbackInput(Input):
    discovery_id: UUID
    slate_id: UUID
    value: Literal["worth_it", "not_for_me"]


class ReportInput(Input):
    discovery_id: UUID
    reason: str = Field(min_length=3, max_length=1000)


class EventInput(Input):
    event_id: UUID
    session_id: UUID
    event_type: Literal[
        "daily_view",
        "discovery_open",
        "source_open",
        "feedback_submit",
        "discovery_save",
        "share_action",
    ]
    discovery_id: UUID | None = None
    occurred_at: AwareDatetime
