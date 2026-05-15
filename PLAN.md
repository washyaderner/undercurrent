# Undercurrent Master Plan

> AI trend intelligence with an absorption pipeline. Find what's emerging, filter the noise, assess what fits your stack, and install the good parts.

**Competition:** Jack Roberts' AI Automations Skool (deadline May 27, 2026)
**Prizes:** $500 first, $300 most creative
**Deliverables:** 60-second Loom + GitHub repo + Skool post

---

## Architecture Overview

```
INTERNET                    SHIELD                     FILTER                      ASSESS                     ACT
+-----------+          +-------------+          +----------------+          +----------------+          +------------+
| HN        |          | URL/payload |          | Psychosis      |          | Stack Diff     |          | Auto-      |
| Reddit    |  ingest  | scam detect |  score   | Layer 1: rules |  kit     | "what's new    |  gate    | approve    |
| GitHub    | -------> | prompt inj. | -------> | Layer 2: Haiku | -------> |  vs what you   | -------> | or flag    |
| (Twitter) |          | code safety |          | 8 dimensions   |          |  already do"   |          | for review |
+-----------+          +-------------+          +----------------+          +----------------+          +------------+
                                                        |                          |
                                                        v                          v
                                                 +-------------+           +-------------+
                                                 | Trend Engine |           | my-stack.md |
                                                 | People Board |           | (from wizard)|
                                                 +-------------+           +-------------+
```

---

## Phase 0: Core Pipeline [DONE]

Everything below is shipped and running at `undercurrent.washyaderner.workers.dev`.

- [x] Three-source ingestion (HN Algolia, Reddit JSON, GitHub Search API)
- [x] Cron trigger every 6 hours
- [x] D1 schema (content_items, authors, trend_snapshots)
- [x] Deterministic pre-screening (slop words, hedging, em-dash density)
- [x] Claude Haiku analysis with prompt caching (8 scoring dimensions)
- [x] Trend emergence scoring (velocity x cross-platform x novelty / saturation)
- [x] Author quality tracking (originality, depth, psychosis averages)
- [x] Kit generation endpoint (/api/kit?topic=X&download=1)
- [x] Astro + Tailwind v4 dashboard (unified on single Workers domain)
- [x] GitHub repo (washyaderner/undercurrent)

**Stats at Phase 0 close:** ~92 items, 76 analyzed, 5 trends, 0 quality voices (threshold needs more data)

---

## Phase 1: Setup Wizard

> The "install Undercurrent into your workflow in 60 seconds" experience. This is the competition differentiator.

**Goal:** Interactive wizard (web-based, runs on the dashboard) that generates a `my-stack.md` describing the user's current setup. This file drives all downstream absorption decisions.

### 1a: Wizard UI
- Multi-step form on the dashboard (new `/setup` page)
- 5-6 questions, each one screen:
  1. **What are you building?** (SaaS / agency / open-source / personal tools / learning)
  2. **Primary stack?** (checkboxes: Python, TypeScript, Rust, Go, etc.)
  3. **AI tools in use?** (checkboxes: Claude, OpenAI, local models, LangChain, CrewAI, etc.)
  4. **Infrastructure?** (Cloudflare, Vercel, AWS, Railway, Supabase, etc.)
  5. **What matters most?** (rank: cost, speed, quality, privacy, simplicity)
  6. **Sources you trust?** (HN, Reddit, GitHub, specific subreddits, specific authors)
- Dark terminal aesthetic matching the dashboard
- Progress indicator, keyboard navigation

### 1b: my-stack.md Generation
- Wizard output is a structured markdown file
- Sections: identity, stack, tools, infra, priorities, trusted sources
- Stored in browser localStorage + downloadable
- Optional: paste into Claude Code as context

### 1c: Personalized Dashboard
- After wizard completes, dashboard filters signals by relevance to declared stack
- Kit downloads include stack-aware context
- "Relevant to your stack" badge on matching signals

**Success criteria:**
1. Wizard completes in under 60 seconds
2. my-stack.md is well-structured and useful as Claude Code context
3. Dashboard visibly changes after wizard completion
4. Looks polished enough for the Loom demo

---

## Phase 2: Stack Diff (Absorption Assessment)

> Each kit answers: "What here is net-new for me, and what am I already doing better?"

**Goal:** Kits include a delta section that compares discovered tools/approaches against the user's declared stack.

### 2a: Diff Engine
- Compare kit topic_tags and implementation_brief against my-stack.md
- Three buckets:
  - **New to you:** tool/approach not in your stack, worth evaluating
  - **Upgrade opportunity:** you use something similar but this is measurably better
  - **You're ahead:** your current setup already does this or does it better
- Powered by Claude Haiku with my-stack.md as context

### 2b: Kit Enhancement
- Each downloaded kit includes a "Stack Assessment" section
- Assessment is personalized to the user's my-stack.md
- Includes specific migration/adoption steps when relevant

### 2c: Absorption Score
- Per-kit score: 0-100, how much of this kit is actionable for your specific setup
- Surfaced on dashboard as a relevance indicator
- High-absorption kits get promoted in the UI

**Success criteria:**
1. Kit diff correctly identifies overlap vs. net-new
2. Assessment is specific enough to act on (not generic "consider evaluating")
3. Absorption score correlates with actual usefulness

---

## Phase 3: Inbound Shield [DONE]

> Content that passes the psychosis filter still needs security screening before anything touches your system.

**Goal:** Detect and flag scams, prompt injection, malicious code, and social engineering in ingested content.

**Shipped 2026-05-14 at 75ff9f2.** Three-layer deterministic scanner in `src/analysis/shield.ts`. 91 items backfilled (90 clean, 1 expected false positive). Dashboard shows conditional shield indicators. Kit markdown includes warnings.

### 3a: URL/Payload Screening
- Known-bad domain list (phishing, typosquatting of popular AI tools)
- Suspicious URL patterns (URL shorteners hiding destinations, lookalike domains)
- Flag content that asks users to run arbitrary code without context

### 3b: Prompt Injection Detection
- Scan implementation_brief and content_preview for injection patterns
- "Ignore previous instructions" variants
- Hidden instructions in code snippets
- Social engineering patterns ("just paste this into your terminal")

### 3c: Code Safety Heuristics
- Flag code snippets that: curl | bash from unknown sources, modify system files, install unsigned packages, access credentials
- Not blocking, flagging with severity level
- Shield score added to each content item (0 = clean, 1 = dangerous)

**Success criteria:**
1. Zero false negatives on known prompt injection patterns
2. < 5% false positive rate on legitimate technical content
3. Shield score visible on dashboard items

---

## Phase 4: Approval Gate

> Auto-approve obvious wins. Flag significant changes for review.

**Goal:** When the system recommends absorbing something from a kit, classify the action by risk and either auto-approve or queue for human review.

### 4a: Risk Classification
- **Auto-approve:** adding a new monitoring tool, subscribing to a new source, bookmarking an author
- **Suggest:** installing a package, changing a config value, adding a dependency
- **Require approval:** modifying auth, changing infra, replacing a core tool, running unfamiliar code

### 4b: Action Queue
- Dashboard section: "Recommended Actions"
- Each action shows: what, why, risk level, source kit, one-click approve/dismiss
- Approved actions generate implementation instructions (or trigger them directly if the system has access)

### 4c: Feedback Loop
- Approved/dismissed actions feed back into the absorption scoring model
- "You always dismiss X-type suggestions" = stop suggesting them
- "You always approve Y-type suggestions" = auto-approve next time

**Success criteria:**
1. Risk classification matches human intuition 90%+ of the time
2. Action queue is useful, not noisy (< 5 items per week)
3. Feedback loop measurably improves relevance over 30 days

---

## Phase 5: Competition Polish

> Ship the Loom, README, and submission post.

### 5a: Loom Script (60 seconds)
- 0-10s: Hook. "Every AI trend you've heard of was discussed by 4-5 people weeks before it went mainstream. Undercurrent finds those people."
- 10-25s: Dashboard demo. Show trends, psychosis filter in action (hype vs genuine side by side), kit download.
- 25-40s: Setup wizard. "Install in 60 seconds. It learns your stack and tells you what to absorb."
- 40-55s: Stack diff. Show a kit with personalized assessment. "It knows what you already have. It only shows you what's new."
- 55-60s: Close. "Trend detection is people detection. Link in comments."

### 5b: README Polish
- Architecture diagram (already done)
- Add screenshots from live dashboard
- Competition context section

### 5c: Submission
- Post in "May Comp" Skool thread
- Lead with the insight ("trend detection is people detection"), not the tool
- Link: GitHub repo + live dashboard + Loom

**Success criteria:**
1. Loom is exactly 60 seconds, no filler
2. Shows real data, not mocked
3. Wizard demo is smooth and visually clean

---

## Post-Competition Phases

### Phase 6: Twitter/X Integration
- $100/mo Basic API tier
- Targeted timeline polling: 50-100 curated AI builders
- Bookmark import for personal signal enrichment
- Cross-platform cascade detection (arXiv -> HN -> GitHub -> Reddit -> Twitter -> YouTube)

### Phase 7: Monetization
- Free Substack: weekly trend digest (distribution layer)
- Premium kits on own domain: deeper implementation guides, stack-specific (Stripe checkout)
- Prompt kit downloads (Nate model: click to download .md)

### Phase 8: Historical Backfill
- Query HN/Reddit APIs for 2-4 weeks of history
- Seed velocity calculations (cold start problem)
- Calibrate emergence scoring thresholds with real data

---

## Build Order (Competition Scope)

```
Phase 1 (wizard)  ████████████████░░░░  ~3-4 hours
Phase 2 (diff)    ████████░░░░░░░░░░░░  ~2-3 hours
Phase 3 (shield)  ████████░░░░░░░░░░░░  ~2-3 hours
Phase 4 (gate)    ██████░░░░░░░░░░░░░░  ~1-2 hours
Phase 5 (polish)  ████░░░░░░░░░░░░░░░░  ~1 hour
```

Phase 1 is the priority. It's the demo centerpiece and the thing that makes this a "system you install" instead of "dashboard you look at." Phases 2-4 build on Phase 1's my-stack.md output.

Phase 3 (shield) is independent and can be built in parallel with Phase 2.

---

## Key Files

| File | Purpose |
|---|---|
| `src/worker.ts` | Main Worker: API routes + scheduled pipeline |
| `src/analysis/analyze.ts` | Claude Haiku analysis pipeline |
| `src/analysis/psychosis.ts` | Deterministic pre-screening |
| `src/analysis/shield.ts` | Inbound shield: URL, injection, code safety scoring |
| `src/ingest/hn.ts` | Hacker News ingestion |
| `src/ingest/reddit.ts` | Reddit ingestion |
| `src/ingest/github.ts` | GitHub ingestion |
| `src/trends/score.ts` | Trend computation + author scoring |
| `src/types.ts` | TypeScript interfaces |
| `schema.sql` | D1 database schema |
| `wrangler.toml` | Worker config + D1 binding + static assets |
| `dashboard/src/pages/index.astro` | Main dashboard page |
| `dashboard/src/layouts/Layout.astro` | Base layout |
| `dashboard/src/styles/global.css` | Tailwind v4 theme (navy/cyan/amber/purple) |

---

*Plan created 2026-05-14. Competition deadline: 2026-05-27.*
