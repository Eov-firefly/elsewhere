"""Synthetic browser fixtures in a fixed disposable TEST database only."""

import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATABASE_URL"] = "sqlite:////tmp/elsewhere-e2e.db"
from datetime import datetime, timedelta, timezone
from app.db import Base, engine, SessionLocal
from app.models import (
    Asset,
    Availability,
    Discovery,
    Revision,
    Rights,
    Slate,
    SlateItem,
)

# This path is reserved for the automated browser suite, never the development DB.
Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
with SessionLocal() as db:
    slate = Slate(slate_date=datetime.now(timezone.utc).date())
    db.add(slate)
    db.flush()
    titles = [
        "A different way to see the stars",
        "The quiet joy of making things",
        "An ordinary day, seen differently",
    ]
    topics = ["science-nature", "design-craft", "everyday-life"]
    for i in range(3):
        mode = "official_embed" if i == 1 else "external_link"
        asset = Asset(
            canonical_url="https://www.youtube.com/watch?v=TESTVIDEO01"
            if i == 1
            else f"https://example.com/synthetic-test-{i}",
            platform="youtube" if i == 1 else "example",
            external_id="TESTVIDEO01" if i == 1 else None,
            original_title="Synthetic browser test work",
            creator="Test fixture creator",
            content_type="video" if i == 1 else "article",
            moderation_state="clear",
            is_demo=False,
        )
        db.add(asset)
        db.flush()
        rights = Rights(
            asset_id=asset.id,
            permits_link=True,
            permits_embed=i == 1,
            evidence_url="https://example.com/synthetic-test-evidence",
            review_status="approved",
            reviewed_by="automated-test-fixture",
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        db.add(rights)
        for country in ("US", "GB", "CA", "AU"):
            db.add(
                Availability(
                    asset_id=asset.id,
                    country_code=country,
                    delivery_mode=mode,
                    result="passed",
                    method="Synthetic automated fixture, not real availability evidence",
                    expires_at=datetime.now(timezone.utc) + timedelta(days=1),
                )
            )
        discovery = Discovery(
            asset_id=asset.id,
            slug=f"test-discovery-{i}",
            topic=topics[i],
            estimated_minutes=[12, 8, 15][i],
            publication_state="published",
        )
        db.add(discovery)
        db.flush()
        revision = Revision(
            discovery_id=discovery.id,
            revision_number=1,
            editorial_title=titles[i],
            hook="A small invitation to step outside the familiar and find a little wonder.",
            intro="Synthetic test copy. This fixture exercises the reading experience without representing a real editorial endorsement.",
            why_worth_it="Synthetic test rationale. These records only exist in the disposable browser-test database.",
            evidence_level="M0",
            evidence_ids=[asset.canonical_url],
            editorial_approved_at=datetime.now(timezone.utc),
            rights_approved_at=datetime.now(timezone.utc),
            editor_id="automated-test-fixture",
            delivery_mode=mode,
        )
        db.add(revision)
        db.flush()
        discovery.published_revision_id = revision.id
        db.add(
            SlateItem(
                slate_id=slate.id,
                rank=i + 1,
                discovery_id=discovery.id,
                experience_revision_id=revision.id,
            )
        )
    db.commit()
print("Synthetic browser-test edition created in /tmp/elsewhere-e2e.db only.")
