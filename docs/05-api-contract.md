# Elsewhere REST API Contract v0.1

Prefix: `/api/v1`; JSON with ISO-8601 UTC timestamps. FastAPI must generate OpenAPI. Every response has `X-Request-ID`. Errors use `{"error":{"code":"INVALID_REQUEST","message":"...","request_id":"..."}}`. Client event POSTs and admin mutation support idempotency keys. Public GET has rate limits; admin endpoints require server-verified authentication/roles, never a client-supplied role.

## Public endpoints
| Verb | Endpoint | Purpose |
|---|---|---|
| GET | `/daily?date=YYYY-MM-DD` | stable UTC-day reviewed slate; default today, no future dates |
| GET | `/discoveries/{slug}` | current published eligible experience |
| GET | `/explore?topic=...&cursor=...&limit=12` | P1, approved paged exploration |
| POST | `/events` | deduped consent-aware event |
| POST | `/feedback` | explicit worth-it / not-for-me response |
| PUT | `/preferences` | explicit topics and opt-out personalization |
| POST | `/privacy/delete` | unlink/delete guest identity and retained data where applicable |
| POST | `/reports` | source or copyright complaint |

### GET /daily sample
```json
{
  "date":"2026-11-03",
  "date_basis":"UTC",
  "slate_id":"<uuid>",
  "algorithm_version":"rules-v0.1",
  "variant":"global_only",
  "items":[{
    "position":1,
    "id":"<uuid>",
    "slug":"sample-craft",
    "title":"An unexpected craft",
    "hook":"A verified original editorial hook",
    "topic":"design-craft",
    "content_type":"video",
    "estimated_minutes":7,
    "creator":"Example creator",
    "origin_region":"CN",
    "delivery_mode":"official_embed"
  }],
  "has_more_daily_items":false
}
```
Production IDs are UUIDs; samples are *not* actual rights-reviewed records. If approved inventory is fewer than three, return fewer with `shortfall_reason="catalog_insufficient"` and honest UI message. Do not silently insert unreviewed items.

### GET /discoveries/{slug} sample
```json
{
 "slug":"sample-craft","revision":2,"locale":"en",
 "editorial":{"title":"An unexpected craft","hook":"...","intro":"...","why_worth_it":"..."},
 "source":{"original_title":"Original work","creator":"Example creator","platform":"youtube","canonical_url":"https://www.youtube.com/watch?v=EXAMPLE"},
 "delivery":{"mode":"official_embed","provider":"youtube","provider_video_id":"EXAMPLE","external_url":"https://www.youtube.com/watch?v=EXAMPLE"},
 "feedback_enabled":true
}
```
The client constructs embeds only for trusted provider IDs; never render arbitrary HTML returned from source metadata. Exclude removed/unapproved source at read-time.

### POST /events sample
```json
{"event_id":"evt_random_unique","session_id":"sess_random","event_type":"discovery_open","discovery_id":"<uuid>","occurred_at":"2026-11-03T12:00:00Z","properties":{"position":1}}
```
Allowed event types: `daily_view`, `discovery_impression`, `discovery_open`, `source_open`, `embed_play_observed` only if officially observable, `feedback_submit`, `discovery_save`, `share_action`, `report_submit`. Never label external clicks as video completion.

### POST /feedback
```json
{"discovery_id":"<uuid>","slate_id":"<uuid>","value":"worth_it"}
```
One response per user/discovery/day unless explicit edit behavior is supported. Duplicate idempotency key returns previous result without double counting.

### PUT /preferences
```json
{"topics":["science-nature","design-craft"],"personalization_enabled":false}
```
Off mode removes inferred-interest ranking; only global quality and diversity remain.

## Admin API
| Verb | Endpoint | Rule |
|---|---|---|
| POST | `/admin/assets/import` | safe URL and dedupe |
| GET | `/admin/assets` | paged status/rights queue |
| GET | `/admin/assets/{id}` | metadata, evidence, errors |
| POST | `/admin/assets/{id}/rights-review` | review actor + action permission evidence |
| POST | `/admin/assets/{id}/availability-check` | region, method, result and timestamp |
| POST | `/admin/discoveries` | create draft / primary source |
| POST | `/admin/discoveries/{id}/revisions` | immutable editorial revision |
| POST | `/admin/discoveries/{id}/approve` | evidence and reviewer gate |
| POST | `/admin/discoveries/{id}/publish` | transaction validates rights + editorial |
| POST | `/admin/discoveries/{id}/quarantine` | immediate global visibility block/cache purge |
| GET | `/admin/audit` | immutable change log |

## Response and security rules
- Error codes `INVALID_REQUEST`, `NOT_FOUND`, `RIGHTS_BLOCKED`, `UNAVAILABLE`, `CONFLICT`, `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `UPSTREAM_ERROR`.
- Guest identity created client-side with a first-party random UUID, subject to consent and deletability; never fingerprint.
- Limit public pages to ≤50 items; cursor pagination.
- Admin publish/unpublish events record actor, reason, old and new revisions and time.
- Avoid exposing private signed media URLs, provider API keys, unpublished creator submissions and raw rights evidence to public API.
