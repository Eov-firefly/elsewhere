# Elsewhere Global — Product Requirements Document v0.1

**Audience:** product, design, engineering, editorial. **Product:** Discover Beyond Your Feed. **Market:** English-speaking overseas users. **Experience:** exactly three worthwhile discoveries per day.

## 1. Product thesis
Elsewhere helps people discover surprising, credible, enjoyable ideas without infinite-scroll attention capture. Global science, design, history, engineering and culture are foundational; original Chinese creator content is a differentiated experiment, not a prerequisite for use. The user job is: “I have ten minutes, want something genuinely interesting, and do not want to search for twenty minutes or scroll for an hour.”

## 2. Audience and success hypothesis
Primary persona: curious English readers approximately 22–40 who already use video, articles, Hacker News or newsletters. Secondary: overseas audiences interested in creativity, engineering or everyday life from China. Begin with users reachable in US, UK, Canada and Australia, but do not assume all markets have identical access.

**North star:** Weekly Worthwhile Sessions (WWS), distinct weekly user-session pairs with explicit positive worth-it feedback; always report eligible sessions and feedback response rate as denominator context. Secondary: D1/D7/D14 cohorts, positive feedback rate, shares, saves, user-rated agency, delivery failure and complaint rate. Do not optimize watch minutes.

## 3. Key product principles
- Exactly 3 daily cards in a *finite* feed, followed by a natural ending; no autoplay, infinite scroll, guilt inducing streaks.
- Cross-cultural curiosity without stereotypes or unsupported claims.
- No account required. Allow explicit topic preferences, non-personalized mode and local identity reset.
- All public items require human editorial and rights review.
- Link and official embed are distinct from replication, translation, remix or media hosting.
- The product may be enjoyable without requiring “productive” learning outcomes.

## 4. User stories and acceptance
| ID | Story | Priority | Acceptance |
|---|---|---|---|
| P-01 | As a guest I can view today's three discoveries | P0 | No sign-in, 3 unique published eligible items or honest shortage |
| P-02 | I can understand a card before clicking | P0 | Editorial title/hook, author, platform, type, minutes, topic |
| P-03 | I can consume a discovery | P0 | Verified official player OR clearly labeled external source |
| P-04 | I can finish naturally | P0 | Natural end after third card, no automatic next content |
| P-05 | I can save/share | P0 | Local save, public OG detail URL, Web Share/copy fallback |
| P-06 | I can give feedback | P0 | Worth-it / Not-for-me and separate report issue |
| P-07 | I can choose privacy | P0 | Toggle personalization, erase local ID, documented collection |
| P-08 | Curator can import and verify sources | P0 | Dedupe + evidence + explicit rights decision |
| P-09 | Editor can publish/unpublish safely | P0 | Approval gate and audit, immediate quarantine |
| P-10 | I can explore by topic | P1 | User-initiated finite pagination, no forced feed |
| P-11 | I can synchronize bookmarks across devices | P2 | Not in initial MVP |

## 5. Site map / screens
**/** Daily: concise mission; 3 distinct cards with visual hierarchy; time/type/source; progress indicator (1/3); optional topic selection; end-of-day screen.

**/d/[slug]** Detail: human-reviewed independent English introduction; original source/creator and link; allowed provider embed or CTA opening real source; why-worth-it, save/share, worth-it feedback, complaint. Do not make detailed assertions when only the video title was inspected.

**/saved** device-local saved discoveries, remove option.

**/preferences** explicit topic interests, personalization toggle, reset local identity, privacy links.

**/explore** P1 topic catalog using explicit Next/page controls.

**/admin** authenticated review queue, source metadata, legal evidence, AI draft comparisons, edit/publish/reject/quarantine, audit and failed-job view.

## 6. Content and presentation
Formats are video/article P0, images/discussions P1, audio P2. A *SourceAsset* is an underlying creator work. A *Discovery* is an editorial theme, perhaps referring to multiple assets. An *ExperienceRevision* is the exact localized card/detail presentation, with evidence/rights decisions. First launch usually links one primary asset.

Six editorial categories: science/nature, history/culture, engineering/technology, design/craft, psychology/behavior, remarkable everyday life. Target a catalog of 100 approved items by beta: illustrative mix 70 global, 20 China-origin and 10 open-license native experiences. Actual mix subject to verified supply and feedback.

## 7. Journey
Guest landing → optional preferences → stable 3-item daily slate → tap card → read short original guide → official embed or explicit external link → feedback/save/share → next card → end. Daily reset uses UTC in v0.1, stable per anonymous user and UTC date. Blocked rights or removed content takes precedence over previously persisted slate.

## 8. Experiments and validation
Compare matched quality/topic global-only and global-plus-China slates. Hypothesis: one high-quality Chinese-origin discovery adds surprise and sharing. Log actual exposures; preserve format, quality and placement controls. 200–500 beta users only supports directional evidence for many metrics. Gather qualitative interviews before investment decisions.

## 9. Explicit non-goals
No unauthorized downloading, mirroring, reposting, full-content translation or AI dubbing; no native app, video CDN, subscriptions, live agent, social network, general-purpose search, creator monetization dashboard, RL recommendation or mandatory registration.

## 10. Release gate
100 reviewed discoveries (target), functioning emergency takedown, copyright attribution, target-region playback QA, accessible mobile UX, reliable click/feedback analytics, anonymized privacy controls, no content auto-published from AI output. Public beta may start smaller if honestly framed as private testing.
