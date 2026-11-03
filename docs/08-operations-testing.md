# Developer Operations, QA and Release Gates

## 1. Local runtime plan
The development MVP now implements the commands below using Node 24 LTS, Python 3.12+, PostgreSQL 16 and Docker Compose. See [the development guide](12-development.md) for editor access, tested workflows and remaining production gates. Redis is deferred.
```bash
cp .env.example .env
make install
make dev-up
make db-migrate
make seed-demo
make test
make dev-down
```
Never commit real credentials. `.env.example` contains only names/placeholders.

If you copy `.env.example` yourself, generate a random `ADMIN_TOKEN` of at least 32 characters before starting. Alternatively omit the copy: `make dev-up` generates `.env` and a local token automatically when the file is absent. Integration variables below describe the original planned stack; only `DATABASE_URL`, `ADMIN_TOKEN`, `API_INTERNAL_URL` and `FRONTEND_PUBLIC_URL` are currently required/supported by this slice.

| Environment variable | Purpose |
|---|---|
| DATABASE_URL | Postgres connection |
| REDIS_URL | queue connection |
| YOUTUBE_API_KEY | official metadata API |
| LLM_PROVIDER, LLM_API_KEY | offline drafting adapter |
| ADMIN_OIDC_ISSUER, ADMIN_OIDC_CLIENT_ID, ADMIN_OIDC_CLIENT_SECRET | protected curator SSO |
| FRONTEND_PUBLIC_URL, API_PUBLIC_URL | origin config |
| EXPERIMENT_SALT | server-side fixed assignment |
| EVENTS_ENABLED | privacy/analytics control |

## 2. CI plan
On PR: Python format/lint, TypeScript ESLint/typecheck, schema checks, isolated Postgres migrations, unit/integration test suite, dependency/secret scans and build smoke. On staging: E2E browser test. On production: human release approval and health check. Never store live creator assets in public fixture data unless licensed.

## 3. High-value tests
| Type | Case | Expected |
|---|---|---|
| Import | same URL twice | one asset, idempotent response |
| Security | URL to localhost / cloud metadata / private IP / redirect | blocked |
| Rights | unknown/revoked grant or expiry | publish blocked / item hidden |
| Video | YouTube private, geo blocked, non-embeddable | no embed rendered |
| AI | M0 title only | no fake full-video recap |
| Editorial | AI drafts without human signoff | invisible |
| Ranking | 3 available, same creator, same day | stable diverse slate |
| Takedown | already shown item quarantined | blocked at read time |
| Analytics | duplicate event sent 3 times | one event |
| Privacy | personalization off | no topic-interest scoring |
| UX | last card opened | natural endpoint, no autoplay |
| Recovery | Postgres snapshot restored | migrations and data coherent |

## 4. Security release checklist
- HTTPS and safe headers/CSP, allowed embed host only.
- Server-side admin auth, MFA, roles, CSRF; audit logs.
- No arbitrary HTML/iframe from untrusted source, no SSRF open proxy.
- API rate limit, payload cap, SQL binding, error handling.
- Secrets isolated in server config, monitoring/logs scrubbed.
- Data minimization, retention and deletion path; privacy terms jurisdiction reviewed.
- Source/creator complaint contact and one-action emergency quarantine.
- Daily backups and demonstrated restore, alert on missed backup.
- Official API quotas and metadata TTL review.

## 5. Performance and availability
Beta design hypothesis under 5k DAU, <=300 reviewed items, <=500 new candidates/day. Aim API p95 <500ms under measured target load excluding external playback latency. Test actual official embeds and source links in sampled US/UK/CA/AU networks; HTTP 200 is insufficient.

Target ≥95% media-open/play success across declared sampled country/device matrix, but report sample counts and failure modes. A response may be link-only if embed is not permitted.

## 6. Observability
Track API error rate and latency, jobs/queue age, API rate/quota, model spend, editorial approval/rejection, active/revoked rights, broken source count, freshness pool, page consent and privacy deletion completion. Alert immediately on rights or content leakage, critical 5xx, broken backups and takedown failures.

## 7. Publishing and rollback
Deployment with immutable image and migration record; staged rollout; cache purge on publish and quarantine. Failed release rolls back app version. Avoid destructive schema migration without backup. Rights incident: quarantine first, trace assets/dependencies, clear media links, notify parties and review evidence before reinstating.

## 8. Launch gate
Guest experience working; 100 audited approved discoveries target; verifiable creator attribution and compliant access; incident handling ready; clean CI; correct privacy and opt-out; analytics A/A validated; 30–50 private testers before larger experiment.

## 9. Indicative resources
Working cash budget for a six-week low-volume beta approximately USD 200–1,000 excluding labor, professional legal review, substantial licensing and paid acquisition. This is planning range rather than vendor quote.
