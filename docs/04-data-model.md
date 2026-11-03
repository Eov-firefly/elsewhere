# PostgreSQL Data Model v0.1

This is the original design baseline. The implemented editorial MVP uses a single source per discovery and globally shared daily slates, per the later product discussion. Executable schema lives in `apps/api/migrations/versions`; see [implementation differences](12-development.md#api-and-model-changes-from-the-v01-plans). Personalized-user, multi-asset and experiment structures below remain future targets.

## Model
`SourceAsset` = canonical underlying video, article, image, thread or audio. `Discovery` = editorially chosen question/story (1–N assets). `ExperienceRevision` = versioned localized presentation and permitted delivery mode. Every rights decision is per action, linked to evidence and reviewer. Every published slate uses a frozen revision but current policy gates override stale visibility.

## Minimal migration-ready core schema
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE content_sources (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 platform TEXT NOT NULL UNIQUE,
 source_kind TEXT NOT NULL,
 policy_url TEXT, enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE source_assets (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 source_id UUID REFERENCES content_sources(id),
 platform TEXT NOT NULL,
 external_id TEXT,
 canonical_url TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL CHECK (content_type IN ('video','article','image','thread','audio')),
 original_title TEXT NOT NULL,
 creator TEXT, original_language TEXT, origin_region TEXT,
 duration_seconds INT CHECK (duration_seconds IS NULL OR duration_seconds>=0),
 metadata JSONB NOT NULL DEFAULT '{}',
 metadata_checked_at TIMESTAMPTZ, metadata_expires_at TIMESTAMPTZ,
 availability_state TEXT NOT NULL DEFAULT 'unknown',
 moderation_state TEXT NOT NULL DEFAULT 'pending',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(platform,external_id)
);
CREATE TABLE asset_rights (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 asset_id UUID NOT NULL REFERENCES source_assets(id),
 grant_source TEXT NOT NULL, license_identifier TEXT,
 evidence_url TEXT, evidence_record_id TEXT,
 permits_link BOOLEAN NOT NULL DEFAULT FALSE,
 permits_embed BOOLEAN NOT NULL DEFAULT FALSE,
 permits_thumbnail BOOLEAN NOT NULL DEFAULT FALSE,
 permits_excerpt BOOLEAN NOT NULL DEFAULT FALSE,
 permits_translate BOOLEAN NOT NULL DEFAULT FALSE,
 permits_modify BOOLEAN NOT NULL DEFAULT FALSE,
 permits_rehost BOOLEAN NOT NULL DEFAULT FALSE,
 permits_commercial BOOLEAN NOT NULL DEFAULT FALSE,
 geo_restrictions JSONB NOT NULL DEFAULT '{}',
 terms JSONB NOT NULL DEFAULT '{}',
 review_status TEXT NOT NULL DEFAULT 'pending',
 reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
 expires_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE asset_availability_checks (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 asset_id UUID NOT NULL REFERENCES source_assets(id),
 country_code CHAR(2) NOT NULL,
 delivery_mode TEXT NOT NULL, result TEXT NOT NULL,
 method TEXT NOT NULL, checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 details JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE discoveries (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 slug TEXT NOT NULL UNIQUE,
 topic TEXT NOT NULL, origin_region TEXT,
 estimated_minutes INT, quality_score FLOAT,
 publication_state TEXT NOT NULL DEFAULT 'draft',
 published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE discovery_assets (
 discovery_id UUID NOT NULL REFERENCES discoveries(id),
 asset_id UUID NOT NULL REFERENCES source_assets(id),
 ordinal INT NOT NULL DEFAULT 0,
 is_primary BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY(discovery_id,asset_id)
);
CREATE UNIQUE INDEX discovery_one_primary ON discovery_assets(discovery_id) WHERE is_primary;
CREATE TABLE experience_revisions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 discovery_id UUID NOT NULL REFERENCES discoveries(id),
 revision_number INT NOT NULL,
 locale TEXT NOT NULL DEFAULT 'en',
 editorial_title TEXT NOT NULL,
 hook TEXT NOT NULL, intro TEXT, why_worth_it TEXT,
 delivery_mode TEXT NOT NULL CHECK(delivery_mode IN ('external_link','official_embed','licensed_native')),
 evidence_level TEXT NOT NULL CHECK(evidence_level IN ('M0','M1','M2')),
 evidence_ids JSONB NOT NULL DEFAULT '[]',
 model_name TEXT, prompt_version TEXT,
 editor_id TEXT, editorial_approved_at TIMESTAMPTZ,
 rights_approved_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(discovery_id,revision_number,locale)
);
ALTER TABLE discoveries ADD COLUMN published_revision_id UUID REFERENCES experience_revisions(id);
CREATE TABLE users (
 id UUID PRIMARY KEY,
 personalization_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 preferences JSONB NOT NULL DEFAULT '{}',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);
CREATE TABLE daily_slates (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id),
 slate_date DATE NOT NULL, experiment_key TEXT,
 experiment_variant TEXT, algorithm_version TEXT NOT NULL,
 generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,slate_date)
);
CREATE TABLE daily_slate_items (
 slate_id UUID NOT NULL REFERENCES daily_slates(id),
 discovery_id UUID NOT NULL REFERENCES discoveries(id),
 experience_revision_id UUID NOT NULL REFERENCES experience_revisions(id),
 rank INT NOT NULL CHECK(rank BETWEEN 1 AND 3),
 PRIMARY KEY(slate_id,rank),
 UNIQUE(slate_id,discovery_id)
);
CREATE TABLE events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id TEXT NOT NULL UNIQUE,
 user_id UUID REFERENCES users(id),
 session_id TEXT NOT NULL,
 discovery_id UUID REFERENCES discoveries(id),
 event_type TEXT NOT NULL,
 experiment_variant TEXT,
 properties JSONB NOT NULL DEFAULT '{}',
 occurred_at TIMESTAMPTZ NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE content_reports (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 asset_id UUID REFERENCES source_assets(id),
 discovery_id UUID REFERENCES discoveries(id),
 reason TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'open',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE admin_audit (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id TEXT NOT NULL, action TEXT NOT NULL,
 object_type TEXT NOT NULL, object_id TEXT NOT NULL,
 before_json JSONB, after_json JSONB,
 reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Critical invariants / indexes
- Publish runs transactionally and validates current reviewed rights for *every displayed asset* and correct revision ownership; don't enforce only in UI.
- Quarantine overrides already-saved slates at read time.
- Never expose a PENDING rights state as approved; all permission booleans default false.
- Stable daily slate key `(user_id,slate_date)`; unique event IDs prevent double counts.
- Add indexes for `(publication_state,topic,published_at)`, `(asset_id,country_code,checked_at)` and `(user_id,occurred_at)`.
- Embeddings are P1: optional table keyed by `discovery_id,model_id`, vector dimension matching selected model.
- For GDPR/privacy requests, delete or anonymize linked anonymous visitor events/slates according to policy. Proposed raw event retention 90 days subject to legal review.
- This schema is a baseline: migration tests, FKs to active revision, admin identities, secure privacy deletion and triggers belong to implementation work.
