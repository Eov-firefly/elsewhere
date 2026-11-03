# MVP Requirements, Priorities and Delivery Plan

Priority meanings: **P0** beta blocking; **P1** next iteration; **P2** explicitly postponed. The first milestone is a **10 real-source content vertical slice**, not an elaborate content pipeline.

## Workstream backlog
| ID | Priority | Task | Dependencies / acceptance |
|---|---|---|---|
| F01 | P0 | Next.js + FastAPI monorepo, Docker local Postgres | `make dev-up`, health API and browser app |
| F02 | P0 | Alembic migrations and fixtures | Clean DB migrates deterministically |
| F03 | P0 | Secure admin login / RBAC / audit | Public cannot call admin mutation |
| S01 | P0 | Manual HTTPS URL import | SSRF-protected, URL normalized, deduped |
| S02 | P0 | YouTube adapter | `videos.list`, official player validation; no media download |
| S03 | P0 | HN best/top stories adapter | Official API, provenance and bounded polling |
| S04 | P0 | Allowlisted RSS adapter | No unauthorized full-text crawl |
| S05 | P0 | Creator-approved source intake | Ownership verification and separate rights fields |
| R01 | P0 | Rights-by-action evidence | Link/embed/thumbnail/excerpt/translate/rehost separated |
| R02 | P0 | Region and media check | Per country/date/method playback result |
| R03 | P0 | Quarantine/takedown | Removed asset excluded from all feeds immediately |
| AI01 | P0 | Evidence-level classification M0/M1/M2 | M0 never infers unseen video facts |
| AI02 | P0 | Topic/quality scoring + English editorial drafts | Output schema/uncertainties, manual review |
| AI03 | P0 | Model/prompt/evidence lineage | Repeatable, auditable revisions |
| A01 | P0 | Admin list/detail/review/publish UI | Rights and editorial checks gate publish |
| W01 | P0 | Guest daily card UI | Exactly 3 items when supply available; end screen |
| W02 | P0 | Detail + official embed/external link | Full creator attribution; accessible fallback |
| W03 | P0 | Feedback + local saves + share | Deduped feedback, OG page, Web Share |
| W04 | P0 | Topic and personalization settings | Opt-out changes ranking; reset identity |
| REC01 | P0 | Eligibility + rules rank + diversity | Rights hard gate, stable daily slate |
| DAT01 | P0 | Typed event API + analytics | No fabricated external completion |
| DAT02 | P0 | Stable A/B assignment and exposure tracking | Sample ratio monitor and A/A check |
| SEC01 | P0 | URL safety, rate limits, CSP, privacy and backups | Basic security/restore tests |
| QA01 | P0 | Region playback QA + a11y smoke | Sample US/UK/CA/AU networks/devices |
| W05 | P1 | Explore by topic | Explicit pagination |
| REC02 | P1 | Embedding retrieval and calibration | After sufficient catalog and logs |
| S06 | P1 | Wikimedia/Smithsonian licensed-native | Per item license verification |
| W06 | P2 | Accounts/sync, payments, creator dashboard | Only after retention signal |

## Six-week delivery roadmap
**First 72 hours:** Build manually curated 10-link vertical slice with the web home, real detail, source link/embed, feedback, and deployment. Do not fabricate permissions or manually mark source playback as passed without testing.

**Week 1:** Environment, DB migrations, URL importer, official YouTube/HN connectors; >100 candidate records (not automatically publishable).

**Week 2:** Rights evidence, evidence-limited AI drafting, review console; ~50 manual approvals where justified.

**Week 3:** Complete 3-card finite flow, persistence, guest preferences/saves/share, initial event instrumentation.

**Week 4:** Add RSS and 10–20 China-origin candidate works from verified official overseas channels, region QA; aim 100 reviewed catalog items and 30–50 private testers.

**Week 5:** Experiment activation, seed community distribution, 200+ invited real users if achievable; verify instrumentation and sample-ratio balance.

**Week 6:** Analyze worth-it feedback with response coverage, D1/D7, accessibility failures, China exposure effects and cost per approved discovery; publish go/no-go memo.

## Cut order under delay
Cut embeddings, Explore, rich content remix, scaled RSS, fancy AI chat and accounts before touching review, permissions, takedown, safe URLs, feedback or finite-feed UX.

## Story definition of done
Code and tests; API contract maintained; editorial source attribution; permissions audit; error/empty state; accessibility; staging demonstration; secrets/PII protected; deployment rollback documented.

## Release gates
No published item without human rights and editorial approvals; no untested media delivery; user can stop naturally; real reports can force unpublish; user data preferences respected; backups tested; no fake claim that external video finished.
