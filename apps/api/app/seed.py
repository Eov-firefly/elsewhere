"""Idempotent real-source candidates; never invent approval or playback evidence."""

from sqlalchemy import select
from .db import SessionLocal
from .models import Asset, Discovery, Revision
from .services import normalize_url

CANDIDATES = [
    (
        "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
        "Steve Jobs’ 2005 Stanford Commencement Address",
        "Stanford",
        "psychology-behavior",
    ),
    (
        "https://www.youtube.com/watch?v=H14bBuluwB8",
        "The power of vulnerability",
        "TED / Brené Brown",
        "psychology-behavior",
    ),
    (
        "https://www.youtube.com/watch?v=Ks-_Mh1QhMc",
        "Your body language may shape who you are",
        "TED / Amy Cuddy",
        "psychology-behavior",
    ),
    (
        "https://www.youtube.com/watch?v=iG9CE55wbtY",
        "Do schools kill creativity?",
        "TED / Sir Ken Robinson",
        "history-culture",
    ),
    (
        "https://www.youtube.com/watch?v=arj7oStGLkU",
        "Inside the mind of a master procrastinator",
        "TED / Tim Urban",
        "psychology-behavior",
    ),
    (
        "https://www.youtube.com/watch?v=8S0FDjFBj8o",
        "The danger of a single story",
        "TED / Chimamanda Ngozi Adichie",
        "history-culture",
    ),
    (
        "https://www.youtube.com/watch?v=qp0HIF3SfI4",
        "The next outbreak? We’re not ready",
        "TED / Bill Gates",
        "science-nature",
    ),
    (
        "https://paulgraham.com/greatwork.html",
        "How to Do Great Work",
        "Paul Graham",
        "design-craft",
    ),
    (
        "https://paulgraham.com/genius.html",
        "The Bus Ticket Theory of Genius",
        "Paul Graham",
        "everyday-life",
    ),
    (
        "https://science.nasa.gov/mission/webb/",
        "James Webb Space Telescope",
        "NASA",
        "science-nature",
    ),
]


def seed():
    with SessionLocal() as db:
        added = 0
        for index, (url, title, creator, topic) in enumerate(CANDIDATES, 1):
            canonical, platform, external_id = normalize_url(url)
            if db.scalar(select(Asset).where(Asset.canonical_url == canonical)):
                continue
            asset = Asset(
                canonical_url=canonical,
                platform=platform,
                external_id=external_id,
                original_title=title,
                creator=creator,
                content_type="video" if platform == "youtube" else "article",
                is_demo=True,
            )
            db.add(asset)
            db.flush()
            discovery = Discovery(
                asset_id=asset.id, slug=f"candidate-{index:02d}", topic=topic
            )
            db.add(discovery)
            db.flush()
            db.add(
                Revision(
                    discovery_id=discovery.id,
                    revision_number=1,
                    editorial_title=title,
                    hook="Candidate for editorial review. Not a public recommendation.",
                    intro="Verify source identity, metadata, factual claims and editorial value before publication.",
                    why_worth_it="An editor must write and substantiate this field after review.",
                    evidence_level="M0",
                    evidence_ids=[canonical],
                    delivery_mode="external_link",
                )
            )
            added += 1
        db.commit()
        print(
            f"Added {added} unreviewed source candidates. No rights, regional checks, approvals or public editions were fabricated."
        )


if __name__ == "__main__":
    seed()
