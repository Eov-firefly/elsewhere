# Development guide — editorial MVP

The first implementation uses Next.js App Router + TypeScript + Tailwind, FastAPI + Pydantic, SQLAlchemy + Alembic, and PostgreSQL 16. It implements the manually curated vertical slice. Redis, workers, automated ingestion, AI drafts, experiments, and personalized ranking remain deferred per the product discussion in document 11.

## Start locally

Prerequisites: Node.js 24 LTS, Python 3.12+, uv, Docker with Compose. Use the existing checkout; cloud tasks are already isolated and do not require a worktree.

```bash
make install
make dev-up
```

`dev-up` creates an ignored, owner-readable `.env` if absent, generates a random local admin token, starts Postgres, applies migrations, imports ten **pending candidates**, and starts API port 8000 and web port 3000 in the foreground. Stop with Ctrl+C; `make dev-down` also stops the database without deleting its volume. Do not commit `.env` or copy its token into source. Read `ADMIN_TOKEN` locally to unlock `/admin`; the browser holds it in memory only. If editing credentials, restart the API. The web proxy never injects the admin token into public requests.

Next.js uses its supported Webpack backend because Turbopack's PostCSS process IPC is unavailable in some managed containers. No Google Font request or external image download is needed to render the UI. Decorative artwork is CSS, independent of creator thumbnail rights.

## What is implemented

- Finite, globally shared daily editions, maximum three unique entries, explicit UTC date. Editors select the edition; public reads never generate or personalize it.
- Editorial detail pages, real source attribution, canonical external link or click-to-load official YouTube embed. No autoplay or fabricated playback completion.
- Local collection, share/copy, explicit feedback with edit-in-place per guest/discovery/UTC day, content reports, optional analytics off by default, linked-data deletion.
- Local editor desk: URL import/dedupe, rights decision, region checks, draft creation, immutable revisions, approval, publication, daily selection, source quarantine, recent reports and audit.
- Read-time rights, approval, moderation and region checks even for old editions. A source quarantine hides all dependent discoveries. Unsafe slots are left empty; no unreviewed replacement.
- DB transactions and optional `Idempotency-Key` receipts for POST retries. Same key/path/identity + different payload returns 409; receipt and mutation commit together. Database uniqueness also prevents duplicate imports, editions and feedback rows.
- Request IDs, bounded schemas, allowlisted HTTPS links, no server fetch of imported URLs, no raw source HTML rendering, restrictive iframe hosts, no-store responses, basic single-process rate limiter.

## Content workflow

1. `make seed-demo` imports ten actual source URL candidates. Their titles/identity and current availability still require verification. The command is repeatable and never creates rights grants, availability passes or a public edition.
2. On `/admin`, inspect each original and record **actual** rights evidence for the intended delivery mode. Link permission does not imply embed, thumbnail, translation or rehosting permission; unsupported modes are not implemented.
3. Record actual delivery observations for US, GB, CA, AU with method and expiry. HTTP 200 is insufficient. These four countries conservatively retain the original spec's market assumption; it can be changed in a later product decision.
4. Write an editorial revision with source evidence. M0 means metadata only: do not claim to have seen or summarize the full work. Read the exact copy in the desk, approve it, then publish it. The server blocks approval/publish when rights or checks are missing/expired.
5. Select 1–3 published entries and publish an edition for a UTC date. An edition is immutable; repeat with the same retry key is safe. Quarantine handles removals, leaving an honest shortage.

Public pages deliberately start empty until an editor completes actual reviews. Candidate imports are not a substitute for the real-source acceptance work in T-002. Browser tests use clearly synthetic records in `/tmp/elsewhere-e2e.db`, never in the development database.

## Validate

```bash
make test
make build
# Postgres-backed integration suite; uses isolated schemas and cleans them afterward:
cd apps/api
TEST_DATABASE_URL=postgresql+psycopg://elsewhere:elsewhere@127.0.0.1:5432/elsewhere uv run pytest -q
uv run alembic check
cd ../web
npx playwright install chromium
npm run test:e2e
```

The browser suite starts its own API (8100) and production web server (3100). Build first; ports must be free. Tests run desktop and phone Chromium, check the finite edition, save persistence, feedback, reports, privacy reset, admin authentication, removed links and horizontal overflow. The suite overwrites only its fixed disposable test database. Normal API tests use SQLite by default; `TEST_DATABASE_URL` exercises actual PostgreSQL.

CI runs migrations/schema comparison, seed repeatability, PostgreSQL-backed API tests, type checking, production build and browser tests. It validates code; it does not deploy or publish content.

## API and model changes from the v0.1 plans

- `/api/v1/daily` uses one `daily_slates.slate_date` unique row across everyone. No per-user slate, ranking or experiment assignment. `country` accepts US/GB/CA/AU, default US; region only filters access, never fills or reorders slots.
- Public `GET /discoveries/{slug}` returns the current published revision; daily cards retain their frozen revision. Both recheck the same current source eligibility.
- A discovery has exactly one primary source for this slice. Multi-asset experiences and licensed native delivery are not implemented. IDs are UUID strings in the ORM; PostgreSQL FKs, unique constraints and migration history are enforced.
- Feedback and optional analytics use `X-Guest-ID` (random UUID). Identity is generated only on explicit feedback or analytics opt-in. An issue report carries no guest identity. Client analytics cannot prove content consumption or consent; never treat these signals as verified completion.
- `POST /privacy/delete` deletes linked feedback, events and retry receipts. Local saves are cleared separately by the browser after successful deletion. Old daily editions are global and contain no guest data.
- `PUT /preferences` and `/explore` are intentionally absent. Preferences UI controls analytics, local deletion and explains shared selection.
- Additional implemented endpoints: `GET /admin/discoveries`, `POST /admin/slates`, `GET /admin/reports`. Interactive schema at API `/docs` is authoritative for implemented request fields.

## Public launch limitations

This is a development MVP, not a production launch claim. The shared bearer token identifies `local-editor`; production requires OIDC/MFA, individual identities/RBAC, hardened admin sessions and deployment-specific CSRF review. Keep the API bound to loopback and the editor desk private until then. The in-memory limiter is only a local safeguard; put per-client limits and body size enforcement at the trusted edge for public use. Forwarded IP headers are intentionally not trusted.

No actual content permission, four-country playback, accessibility audit, user retention improvement, backup restore drill, or staging deployment is claimed by synthetic tests. Add operational secret handling, scheduled retention cleanup (raw events: at most the proposed 90 days after policy review), monitored report handling, backups/restore, HTTPS and deployment health checks before a public beta. Source destinations and official players may still contain their own recommendations, outside Elsewhere's control.

The interface retains the original English-first specification; the discussion about Chinese versus overseas launch users remains open. Long content is allowed, durations are explicit, and the “10 minutes” slogan is not implemented as a duration cap.
