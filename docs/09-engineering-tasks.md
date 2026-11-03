# First Development Sprint — Ticket-ready Work Packages

**Sequence:** Build one complete 10-item vertical slice *before* generalizing crawlers and model-driven ranking. Dependencies: F01→F02→F03→F04. Avoid declaring “done” from code alone; demonstrate acceptance in a running test environment.

## Sprint 0: First three working days

### T-001 — Repository scaffold (P0; 0.5–1 day)
Target: Next.js + TypeScript/Tailwind at `apps/web`; FastAPI at `apps/api`; docker-compose with PostgreSQL; `.env.example` and `Makefile`; unit test/test configuration. **Done:** one documented local command starts homepage, API health and DB; no secrets committed.

### T-002 — Database migration and 10 genuine sources (P0; 0.5–1 day)
Implement core SourceAsset, Rights, Discovery, Revision and Slate entities. Curate 10 **actual links** manually and review permission, player accessibility and creator. **Done:** fresh migration passes, all published fixtures have real rights evidence; no auto-marked synthetic reviews.

### T-003 — Daily and detail read API (P0; 0.5 day)
Implement `GET /daily` and `GET /discoveries/{slug}`, eligibility checks and stable date policy. **Done:** three unique or honestly fewer, blocked source returns no public media.

### T-004 — Guest UI and simple feedback (P0; 1 day)
Three-card homepage, detail, official player or source link, worth-it feedback, end-of-session panel. **Done:** mobile responsive; no autoplay; a real tester can finish journey.

## Sprint 1: Supply and review

### T-005 — URL safety/dedupe
Provider allowlist; HTTPS only; private IP/metadata/redirect rejection; idempotency. **Done:** security tests, repeated import same ID.

### T-006 — YouTube videos.list adapter
Known video IDs, official metadata, allowed iframe; quota and retention compliance. **Done:** absent/private/non-embeddable source cannot be embedded; never download.

### T-007 — Hacker News + allowlisted RSS adapters
Polling, backoff, source IDs and provenance, bounded retry. **Done:** ≥100 candidate records and source errors visible.

### T-008 — Rights & availability admin review
Per-action permission matrix, evidence, country/media test, expiry and revocation. **Done:** missing/expired rights cannot publish.

### T-009 — Editorial admin console
Import queue, asset details, AI original draft revision, human approve, publish and quarantine. **Done:** unpublished drafts invisible, every mutation logged.

### T-010 — AI evidence-limited draft worker
M0/M1/M2 validation, original English hook/why worth it, quality rubric and uncertainties. **Done:** model output cannot automatically publish or claim unseen video knowledge.

## Sprint 2: Product behavior and experiments

### T-011 — Recommendation baseline
Filter eligible, normalize scores, 3 slots, diversify creators/topics, no seen recent items, persist UTC date. **Done:** stable, never revoked, good scarcity fallback.

### T-012 — Anonymous preferences and local saves
No registration, opt-out personalization and local deletion. **Done:** ranking changes with explicit preference and off mode has no behavioral personalization.

### T-013 — Event collection
Typed event IDs, dedupe, consent controls, reliable impressions and explicit external clicks. **Done:** no double counting, visible funnel.

### T-014 — Share cards and SEO
Public detail Open Graph, native share or copy. **Done:** shares produce legitimate and attributed preview; no unlicensed thumbnails.

### T-015 — Mobile/accessibility/region QA
Viewport, keyboard, source availability check, outage fallback. **Done:** documented passes and fixes.

## Sprint 3: Market evidence and release

### T-016 — China-origin content track
10–20 verified original creator official overseas uploads. **Done:** creator provenance, legal review per content and no Bilibili mirroring assumption.

### T-017 — A/A then A/B comparison
Stable cohort, actual exposure logging, quality/topic matching and metrics. **Done:** sample ratios monitored, results qualified by N and feedback response coverage.

### T-018 — Security/ops hardening
Rate limit, admin auth/MFA, URL SSRF, backups/restore, takedown, error monitoring. **Done:** emergency unpublish invisible within one read, restore drill documented.

### T-019 — Research and beta recruitment
Recruit 30–50 private testers, then aim 200–500 (not guaranteed). Collect interviews and qualitative feedback. **Done:** report channel and satisfaction data.

### T-020 — Six-week go/no-go memo
Assess WWS/feedback coverage, D7, source access, cost per accepted item, China exposure benefit and legal risks. **Done:** quantified recommendation and next sprint priorities in repo.

## Dependency / task triage
| Priority | Must never cut | May defer |
|---|---|---|
| P0 | source rights, human gate, safe URL, quarantine, 3-card finite UX, basic events | — |
| P1 | AI embeddings, Explore, richer native licensed experiences | if timeline slips |
| P2 | accounts, subscriptions, dubbing, social graph, RL, automatic media mirror | outside MVP |

## Ticket definition of done
Acceptance test runnable; code/test check passes; API/schema docs updated; failure mode and permissions reviewed; no secret or sensitive data; a staging demonstration recorded.
