# Content Acquisition, Rights, Availability and AI Editorial Policy

**Status:** MVP engineering control policy, not legal advice. Obtain review for actual operating jurisdictions, creator contracts and commercial launch.

## 1. Source strategy
| Source | Allowed first-pass use | Do not assume |
|---|---|---|
| YouTube official creator channel | API metadata, compliant official embed or canonical link | download, mirror, caption extraction, translation, ad suppression |
| Hacker News API | Discovery signals and links | rights to underlying articles/videos/comments |
| Allowlisted RSS | Feed metadata and source link | full article reproduction |
| China-origin verified official overseas creator | Official link/embed; editorial English guide | Chinese platform distribution license transfers to Elsewhere |
| Opt-in creator partner | Precisely enumerated licensed uses | rights to licensed music, footage and faces without checking |
| Wikimedia/open collections | Item-level license compliant original experience | all images share the same license or endorsement |

## 2. Rights are per action, not per platform
Store decisions/evidence for `link`, `official_embed`, `thumbnail`, `quote/excerpt`, `commercial_use`, `translate`, `modify`, `rehost`. Except legitimate ordinary link after source validation, **unknown = denied** until reviewed. Source public accessibility, robots access or an iframe tag is *not* a blanket derivative-work license.

- CC0 generally allows copying/adaptation, subject to other third-party rights.
- CC BY requires attribution, license notice and change indicators.
- CC BY-SA permits commercial adaptation with share-alike obligations.
- CC BY-NC variants prohibit unlicensed commercial use; CC BY-ND variants do not allow distribution of adapted works under that license.
- NASA/Open Access media must be verified **per item** for third-party rights, trademarks, likenesses and commercial contexts.

## 3. YouTube compliance
Use `videos.list` for known video IDs and the official IFrame Player; respect playback features, branding, ads, terms, embedded status, region controls, API quotas and metadata retention. No unauthorized MP4 download or transcript retrieval; no geo bypass. YouTube Data API metadata can have refresh/deletion obligations: implementation must keep policy version, TTL and recheck operations.

## 4. Region QA
For US, UK, CA, AU, record `country_code, check_method, delivery_mode, checked_at, result` at the asset level. Distinguish HTTP status from real playback. Test embedded player, mobile, age/geo limits, source deletion and cookie-related failure. Failed/unknown eligibility means no release to that targeted cohort until resolved.

## 5. Chinese creator partnership
Prefer official YouTube versions from independently verified creators, without reproducing or translating full works. If a native English-localized deliverable is desired, negotiate separately: global/territorial license, duration, commercial use, subtitle/translation/dubbing, derivative editing, thumbnail, storage, attribution, rights-chain warranties for music/third-party footage, revocation and complaint process. MVP should use 10–20 manually sourced candidates before attempting a creator CMS.

## 6. Evidence-level discipline
- **M0:** available title, uploader, public description, permitted metadata. Only cautious hook; cannot assert model saw full video.
- **M1:** licensed/approved excerpt or creator statement. Source-backed specific details allowed with review.
- **M2:** legally accessed full content under terms permitting the processing. Richer description possible; derivative publication still needs separate grant.

**AI model is a drafter, never automatic publisher.** Save input provenance, output, exact model/prompt version, rubric dimensions and uncertainties. Require human verification of factual claims; reject unsupported specifics and exaggerated curiosity bait.

Suggested model JSON:
```json
{
 "evidence_level":"M0",
 "topic":"design-craft",
 "editorial_title":"A question worth exploring",
 "hook":"A concise original, supportable curiosity hook",
 "why_worth_it":"Why it may be interesting",
 "scores":{"curiosity":4,"credibility":3,"clarity":4,"originality":4,"fit":4},
 "verified_claims":[],
 "uncertainties":["No access to the source video body"],
 "human_review_required":true
}
```

## 7. Publication and takedown gate
`source discovered -> permitted metadata -> rights evidence -> availability QA -> AI editorial draft -> human rights + copy approval -> publish`. Any copyright complaint, expiry, geo failure or source removal can quarantine the asset, invalidate all dependent Discoveries and purge cache immediately. Audit who reviewed each action and when. Restore only after clearance.

## 8. Reference links
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/data/getting-started
- https://github.com/HackerNews/API
- https://creativecommons.org/share-your-work/cclicenses/
- https://commons.wikimedia.org/wiki/Commons:Licensing
- https://www.si.edu/openaccess
- https://www.nasa.gov/nasa-brand-center/images-and-media/
