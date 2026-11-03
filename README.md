# Elsewhere Global — MVP Product & Engineering Specification

> Version 0.1 | 2026-11-03 | English-first, 3 curated discoveries per day

Elsewhere is a finite, multilingual-content discovery product for English-speaking audiences. Global content is the foundation; notable original work from Chinese creators is a differentiated experiment. It is **not** a video mirror, unauthorized translation service or infinite recommendation feed.

## Documentation map

- [Product specification and UX](docs/01-product-prd.md)
- [Functional requirements and delivery backlog](docs/02-requirements-backlog.md)
- [Technical architecture](docs/03-technical-architecture.md)
- [Database schema](docs/04-data-model.md)
- [REST API contracts](docs/05-api-contract.md)
- [Content rights and AI editorial policy](docs/06-content-rights-ai.md)
- [Recommendation algorithm and experiments](docs/07-recommendation-experiments.md)
- [Operations, testing and release](docs/08-operations-testing.md)
- [Ticket-ready engineering tasks](docs/09-engineering-tasks.md)
- [Decisions and risks](docs/10-decisions-risks.md)

## Core MVP contract

- Responsive web app, no login required, English first.
- Exactly three editorially reviewed discoveries per daily slate, no autoplay or endless feed.
- Multi-modal Discovery objects: video and article first, images/discussions later.
- Only canonical outbound links or provider-approved embeds by default; self-host third-party media only if rights are verified.
- Human editorial/rights approval is mandatory before publication; AI must be evidence-limited.
- Stable, consent-aware anonymous user experience and non-personalized mode.
- First milestone is a 10-item end-to-end vertical slice; six-week beta *targets* 100 approved discoveries and 200–500 invited users.

## Proposed development stack

Next.js + TypeScript + Tailwind; FastAPI + Pydantic; PostgreSQL; optional pgvector; Redis/RQ for jobs; official YouTube and Hacker News APIs, allowlisted RSS, manually verified creator submissions; rules-first recommendation.

## Start coding

Start with tickets T-001–T-004 in [engineering work packages](docs/09-engineering-tasks.md). This repository is a specification baseline, **not yet a working implementation**. Local commands described in operations documentation are implementation targets.

## Reference policies

- YouTube: https://developers.google.com/youtube/terms/developer-policies
- YouTube API: https://developers.google.com/youtube/data/getting-started
- Hacker News API: https://github.com/HackerNews/API
- Creative Commons: https://creativecommons.org/share-your-work/cclicenses/

