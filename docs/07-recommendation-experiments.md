# Recommendation, Metrics and Controlled Experiments

## 1. Optimization philosophy
Optimize user-reported worthwhile discovery, not watch-time, forced repeat, or infinite consumption.

**WWS:** count distinct (user, session) pairs with explicit positive “worth it” during a week. Always show response coverage and number of eligible sessions. External destination opens are *not* evidence of full consumption.

## 2. Candidate eligibility / hard filters
A Discovery is rankable only if published, both human editorial and rights approval present and current, selected delivery mode permitted, moderation clear, original source legitimate, target region accessibility checked and non-expired, no quarantine/complaint. Re-evaluate when serving persisted slates.

## 3. Baseline score
```text
score(user,discovery) =
  0.40 * editorial_quality +
  0.25 * explicit_topic_interest +
  0.20 * novelty +
  0.15 * session_fit
```
All features in [0,1] with calibration documented and fixed during experiments. Without preferences, use common interest baseline, not behavioral tracking. Novelty is topic/creator distance to recent exposure, where legally and consensually retained. Estimated length and format define session fit.

## 4. Slate construction
Three slots: (1) known-interest high-quality, (2) adjacent-interest, (3) serendipity/wildcard. Stable seeded selection for user + UTC date. No repeated creator within one slate; same topic max twice; exclude seen within 14 days where known. If <3 rights-cleared items, show honest shortage or verified evergreen fallback.

Example:
```python
def eligible(items, country):
    return [x for x in items
      if x.published and x.editorial_approved
      and x.rights_approved and not x.quarantined
      and x.availability_for(country) == "passed"]

def rank(x, explicit_topics):
    return (0.40*x.quality + 0.25*x.interest(explicit_topics)
          + 0.20*x.novelty + 0.15*x.session_fit)
```
Experiment assignment happens before pool construction; separate experiment quota constraints from general scoring. Do not promote a weaker asset solely because it originates in China.

## 5. Experiment A: cross-cultural novelty
A: quality-matched global discoveries, no guaranteed China slot. B: at most 1/3 cards from a China-origin creator **if** topic/quality/length and access match. Pre-register whether China-origin items are fully excluded in control or can naturally appear; document this before running. Assignment stable by server secret salt and anonymous ID, 50/50. Log actual exposure, not just assignment.

Primary: Worth-it response plus denominator response coverage; secondary D7 retention, saves and share actions. Analyze sample ratio mismatch, confidence intervals, access failures and creator/topic imbalance. 200–500 beta users make small effects hard to detect; findings directional.

## 6. Required event schema
| Event | Trigger | Important properties |
|---|---|---|
| daily_view | first page render | slate, date, experiment |
| discovery_impression | >=50% visible for >=1s | asset/position |
| discovery_open | detail open | id and source |
| source_open | explicit outbound click | domain, delivery |
| embed_play_observed | official player API confirms event | provider; optional |
| feedback_submit | response confirmed | worth_it/not_for_me |
| discovery_save | saved state change | item |
| share_action | native share completion or copy success | method/outcome |
| report_submit | report submitted | issue category |

Each event has unique ID for dedupe, timestamps and anonymous session. Do not collect sensitive demographics, precise location, IP-based fingerprints or third-party playback completion.

## 7. Reporting
- Worth-it rate = valid positive responses / all valid feedback; separate `feedback_coverage = responses / detail_opens`.
- D7 = first-time cohort revisiting on calendar day 7; don't conflate with any-return-within-first-week.
- WWS weekly, grouped by experiment and source mix, along with small-N caveats.
- Share action rate = successful user actions / active users; distinguish confirmed referrals where possible.
- Quarantine count, rights-review coverage, target-region playable rate and editorial hours/cost per approved asset.

## 8. Upgrade path
v0.1 rules & human quality; v0.2 embeddings + controlled semantic recall after enough content; v0.3 learning-to-rank with reliable exposure logging and pairwise judgements. No RL before measurable reward, counterfactual logging and robust constraints.
