from datetime import datetime, timezone
from urllib.parse import parse_qs, urlsplit, urlunsplit

from fastapi import HTTPException
from sqlalchemy import select

from .models import Asset, Availability, Rights

COUNTRIES = ("US", "GB", "CA", "AU")
# Import stores URLs only; no user-controlled URL is fetched server-side.
ARTICLE_HOSTS = {
    "www.nasa.gov",
    "science.nasa.gov",
    "www.si.edu",
    "en.wikipedia.org",
    "paulgraham.com",
    "www.quantamagazine.org",
}


def fail(code, message, status=400):
    raise HTTPException(status, {"code": code, "message": message})


def utc(dt):
    return (
        dt.replace(tzinfo=timezone.utc)
        if dt.tzinfo is None
        else dt.astimezone(timezone.utc)
    )


def normalize_url(value):
    url = urlsplit(str(value))
    if (
        url.scheme != "https"
        or url.username
        or url.password
        or url.port not in (None, 443)
    ):
        fail("INVALID_REQUEST", "Only canonical HTTPS source URLs are supported.")
    host = (url.hostname or "").lower()
    if host in {"youtube.com", "www.youtube.com", "youtu.be"}:
        import re

        video_id = (
            url.path.strip("/")
            if host == "youtu.be"
            else parse_qs(url.query).get("v", [""])[0]
        )
        if (host != "youtu.be" and url.path != "/watch") or not re.fullmatch(
            r"[A-Za-z0-9_-]{11}", video_id
        ):
            fail("INVALID_REQUEST", "Use a YouTube watch URL with a valid video ID.")
        return f"https://www.youtube.com/watch?v={video_id}", "youtube", video_id
    if host not in ARTICLE_HOSTS:
        fail(
            "INVALID_REQUEST", "Source domain is not on the reviewed import allowlist."
        )
    return urlunsplit(("https", host, url.path or "/", url.query, "")), host, None


def eligible(db, discovery, revision, countries=COUNTRIES, published=True):
    if not discovery or not revision or revision.discovery_id != discovery.id:
        return False
    if published and discovery.publication_state != "published":
        return False
    if not revision.editorial_approved_at or not revision.rights_approved_at:
        return False
    asset = db.get(Asset, discovery.asset_id)
    if not asset or asset.is_demo or asset.moderation_state != "clear":
        return False
    current = datetime.now(timezone.utc)
    rights = db.scalars(
        select(Rights)
        .where(Rights.asset_id == asset.id)
        .order_by(Rights.reviewed_at.desc(), Rights.id.desc())
    ).first()
    if (
        not rights
        or rights.review_status != "approved"
        or rights.revoked_at
        or utc(rights.expires_at) <= current
    ):
        return False
    if not rights.permits_link or (
        revision.delivery_mode == "official_embed"
        and (not rights.permits_embed or asset.platform != "youtube")
    ):
        return False
    for country in countries:
        check = db.scalars(
            select(Availability)
            .where(
                Availability.asset_id == asset.id,
                Availability.country_code == country,
                Availability.delivery_mode == revision.delivery_mode,
            )
            .order_by(Availability.checked_at.desc(), Availability.id.desc())
        ).first()
        if not check or check.result != "passed" or utc(check.expires_at) <= current:
            return False
    return True


def card(db, discovery, revision, position=None):
    asset = db.get(Asset, discovery.asset_id)
    return {
        "id": discovery.id,
        "slug": discovery.slug,
        "title": revision.editorial_title,
        "hook": revision.hook,
        "topic": discovery.topic,
        "content_type": asset.content_type,
        "estimated_minutes": discovery.estimated_minutes,
        "creator": asset.creator,
        "delivery_mode": revision.delivery_mode,
        "position": position,
    }
