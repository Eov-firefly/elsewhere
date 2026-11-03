# Open Decisions, Risks and Product Hypotheses

## Decision register
| Decision | v0.1 choice | Confidence |
|---|---|---|
| Target users | overseas English readers; curious, multi-interest | hypothesis |
| Promise | 3 worthwhile discoveries per day | product principle |
| China track | differentiated optional category / A/B experiment | hypothesis |
| Delivery | link, official embed; native only if licensed | policy |
| Content formats | video/article P0, visual/discussion P1 | plan |
| Application | responsive web first, no login | plan |
| Recommendation | human-reviewed, rules first | plan |
| AI | offline editorial draft with human publication | policy |
| Infra | Next.js + FastAPI + Postgres | architecture |
| Date reset | UTC daily slate | reversible tech decision |

## Decisions to resolve before broader public beta
1. Brand and domain ownership; trademark clearance for “Elsewhere.”
2. Geography: US-only early vs US/UK/CA/AU simultaneously; target-country media QA accordingly.
3. Exact consent/privacy approach for analytics vendors and anonymous ID in each launch jurisdiction.
4. Whether all official YouTube embeds are allowed for the selected placement/business model; check policies and per-video permissions.
5. Creator authorization template, editorial attribution and takedown handling.
6. Whether experiment A fully excludes China-origin content or lets it appear organically; pre-register.
7. Date reset in user’s local timezone or UTC; UI should never imply an unimplemented local midnight.

## Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Player blocked/geo-limited | high | test country and device; official link fallback |
| Copyright/API terms violation | critical | per-item reviewed rights & audit, rapid unpublish |
| AI hallucinated explanations | high | M0/M1/M2 evidence ceiling + editor |
| Outbound breaks seamless experience | high | compare source-link vs compliant native, survey |
| Users do not return | high | high-quality finite content and honest measurement |
| China-content is niche rather than broad | medium | matched experiments rather than assumed appeal |
| High creator-rights overhead | high | official overseas creator uploads first |
| Weak catalog freshness | medium | evergreen verified pool, daily supply checks |
| Tracking overreaches privacy | high | opt-out, minimal collection, delete |
| Single-developer scope creep | medium | 10-item vertical slice, defer extras |

## Falsifiable hypotheses
**H1:** curious English readers voluntarily return for a non-infinite 3-item feed.
**H2:** an independently written short guide improves satisfaction over naked links.
**H3:** a quality-matched China-origin discovery raises novelty/saves/shares for some users.
**H4:** lawful links/official embeds suffice to validate demand without media mirroring.
**H5:** editor-reviewed low-volume content is sustainable financially and operationally.

## Stop/go criteria
**No-go/redesign:** rights incidents cannot be resolved rapidly; target regions repeatedly cannot view content; generated editorial claims prove unreliable; sustained low worth-it and retention despite content iteration; content review economics unsustainable.

**Positive:** thoughtful unsolicited feedback, meaningful voluntary return, non-founder shares/referrals, reliable source supply, explicit positive cross-cultural response without higher access/rights failures. Avoid calling small beta A/B differences significant without evidence.

## Sources for current policy checks
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/iframe_api_reference
- https://github.com/HackerNews/API
- https://creativecommons.org/share-your-work/cclicenses/
