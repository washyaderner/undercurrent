# Undercurrent

AI trend intelligence that finds what's emerging before it goes mainstream.

Scans Hacker News, Reddit, and GitHub every 6 hours. Filters AI-generated hype with a two-layer psychosis detector. Surfaces the specific people who were talking about it first.

**Live:** [undercurrent-dashboard.pages.dev](https://undercurrent-dashboard.pages.dev)

## Architecture

```
Every 6 hours (cron)
        |
        v
+------------------+     +------------------+     +------------------+
|   HN Algolia     |     |  Reddit JSON     |     |  GitHub Search   |
|   13 AI queries  |     |  8 subreddits    |     |  5 topic queries |
|   points > 10    |     |  rising + hot    |     |  stars > 5       |
+--------+---------+     +--------+---------+     +--------+---------+
         |                         |                        |
         +------------+------------+------------------------+
                      |
                      v
           +---------------------+
           |   D1 (SQLite)       |
           |   content_items     |
           +----------+----------+
                      |
                      v
           +---------------------+
           |  Psychosis Filter   |
           |                     |
           |  Layer 1: Rules     |  <-- slop words, hedging, em-dash density
           |  (deterministic)    |      code/numbers/tools = genuine signals
           |                     |
           |  Layer 2: Claude    |  <-- Haiku with prompt caching
           |  (ambiguous items)  |      8 scoring dimensions
           +----------+----------+
                      |
                      v
           +---------------------+
           |  Trend Engine       |
           |                     |
           |  velocity x         |
           |  cross_platform x   |
           |  novelty_bonus      |
           |  / (1 + saturation) |
           +----------+----------+
                      |
                      v
           +---------------------+
           |  People Board       |
           |                     |
           |  Per-author scores  |
           |  avg originality    |
           |  avg depth          |
           |  avg psychosis      |
           |  = quality voice?   |
           +---------------------+
```

## The Thesis

Trend detection is people detection. The interesting signal isn't "RAG is trending." It's "these 4 people on HN and Reddit were building RAG pipelines 3 weeks before the wave hit, and their posts scored 0.8+ on originality with near-zero psychosis."

## Psychosis Filter

Two layers prevent AI-generated hype from polluting the signal:

**Layer 1 (Deterministic):** Scores text on slop-word density ("delve", "tapestry", "leverage"), hedging phrases, em-dash overuse, listicle structure. Rewards: specific numbers, code snippets, named tools.

**Layer 2 (Claude Haiku):** Items scoring between 0.15-0.6 go to Claude for nuanced analysis across 8 dimensions: psychosis, originality, technical depth, practical utility, topic tags, analysis summary, implementation brief, emerging status.

Items scoring > 0.6 are auto-flagged as slop. Items < 0.15 pass as genuine.

## Stack

- **Runtime:** Cloudflare Workers (edge, ~0ms cold start)
- **Database:** Cloudflare D1 (SQLite at edge)
- **Analysis:** Claude Haiku with ephemeral prompt caching
- **Frontend:** Astro + Tailwind v4 on CF Pages
- **Cost:** ~$0/month (Workers free tier + D1 free tier + Haiku per-call)

## API

All endpoints at `https://undercurrent.washyaderner.workers.dev/api/`

| Endpoint | Description |
|---|---|
| `GET /api/trends?days=7` | Emerging trends with emergence scores |
| `GET /api/signals?limit=50&min_originality=0.5` | Filtered content signals |
| `GET /api/voices` | Quality voices (consistent, original authors) |
| `GET /api/psychosis` | Highest psychosis vs most genuine content |
| `GET /api/stats` | Pipeline statistics |
| `POST /api/run` | Trigger manual pipeline run |

## Setup

```bash
# Clone
git clone https://github.com/washyaderner/undercurrent.git
cd undercurrent

# Backend
npm install
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put GITHUB_TOKEN
wrangler d1 create undercurrent-db
wrangler d1 execute undercurrent-db --file=schema.sql
wrangler deploy

# Frontend
cd dashboard
npm install
npm run build
wrangler pages deploy dist --project-name undercurrent-dashboard
```

## What's Next

- Twitter/X integration ($100/mo API for targeted timeline polling of 50-100 AI builders)
- Historical backfill for velocity baseline
- Implementation onramp (tool assessment + setup guides for discovered trends)
- Cross-platform cascade detection (arXiv -> HN -> GitHub -> Reddit -> YouTube)
