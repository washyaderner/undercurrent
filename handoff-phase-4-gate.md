# Handoff: Phase 4 - Approval Gate

> Phase 3 (Inbound Shield) shipped 2026-05-14 at 75ff9f2. This handoff covers Phase 4: the approval gate that auto-approves obvious wins and flags significant changes for human review.

---

## Prerequisites

All prior phases are complete and deployed:

- **Phase 0 (Core Pipeline):** Ingestion, analysis, trends, dashboard. Verified: live at undercurrent.washyaderner.workers.dev, cron running every 6h.
- **Phase 1 (Setup Wizard):** /setup page generates my-stack.md, stored in localStorage. Dashboard filters by declared stack.
- **Phase 2 (Stack Diff):** Absorption scoring compares kit signals against my-stack.md. Three buckets: new-to-you, upgrade, you're-ahead.
- **Phase 3 (Inbound Shield):** `src/analysis/shield.ts` scores content safety (0-1). 91 items backfilled. Dashboard shows conditional S:XX indicators. Kit markdown includes [SHIELD WARNING]/[REVIEW] labels.

---

## Read First

1. `PLAN.md` - Phase 4 spec (lines 147-172)
2. `src/worker.ts` - Main worker with all API routes + pipeline
3. `src/analysis/shield.ts` - Shield scoring pattern (deterministic heuristics, same approach applies to risk classification)
4. `dashboard/src/pages/index.astro` - Dashboard for adding the action queue UI
5. `schema.sql` - Current D1 schema

---

## Scope: Phase 4 Build Steps

### 4a: Risk Classification Engine

Create `src/analysis/gate.ts`:

- Three risk tiers: `auto-approve`, `suggest`, `require-approval`
- Input: kit signals (topic_tags, implementation_brief, absorption score from Phase 2)
- Classification rules:
  - **Auto-approve:** monitoring tools, new sources, author bookmarks, reading recommendations
  - **Suggest:** package installs, config changes, new dependencies
  - **Require approval:** auth changes, infra modifications, core tool replacements, unfamiliar code execution
- Deterministic first (keyword matching on implementation_brief), Claude Haiku fallback for ambiguous cases
- Output: `{ risk: 'auto' | 'suggest' | 'approve', reason: string, action: string }`

### 4b: Action Queue

D1 schema addition:
```sql
CREATE TABLE IF NOT EXISTS action_queue (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  trend_topic TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  source_kit TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (content_item_id) REFERENCES content_items(id)
);
```

API endpoints:
- `GET /api/actions` - list pending actions, sorted by risk level
- `POST /api/actions/:id/approve` - mark action approved, log feedback
- `POST /api/actions/:id/dismiss` - mark action dismissed, log feedback

Dashboard section: "Recommended Actions" between trends and signals. Each action card shows: what, why, risk badge (green/amber/red), source signal, approve/dismiss buttons.

### 4c: Feedback Loop (stretch)

Track approve/dismiss ratios per action_type. After N dismissals of same type, suppress future suggestions. After N approvals, auto-approve. Store in a simple `action_feedback` table or as metadata on the action_queue rows.

This is the stretch goal. Ship 4a+4b first; 4c only if time permits before Phase 5.

---

## Success Criteria

1. Risk classification matches intuition: monitoring/reading = auto, packages = suggest, infra = require
2. Action queue renders on dashboard with approve/dismiss UI
3. At least one auto-approved action visible from existing kit data
4. Actions sourced from real signals (not mocked data)

---

## Things NOT to Do

- Don't add actual automation (Phase 4 recommends actions, it doesn't execute them)
- Don't change the shield scoring or psychosis scoring - those are stable
- Don't modify the setup wizard or my-stack.md format
- Don't add auth to the action queue (single-user tool, same as the rest)
- Don't over-engineer the feedback loop - a counter column is fine

---

## Decisions Resolved in Advance

- **Risk classification is deterministic-first, Haiku-fallback.** Same pattern as psychosis scoring and shield scoring. Keeps costs near zero for the common case.
- **Action queue is D1, not localStorage.** Actions persist across sessions and are visible from any device.
- **No real execution.** Phase 4 generates recommendations. "Run this" actions produce implementation instructions, not actual shell commands.

---

## Loose Ends from Phase 3

These are not Phase 4 scope but worth noting:

- `/api/backfill-shield` endpoint is unauthenticated. Remove or add API key check when convenient.
- `/api/content` endpoint doesn't include shield_score/shield_flags in its SELECT. Minor gap.
- Shield threshold tuning (0.3/0.5) is hardcoded. Could become env vars later.

---

## Pickup Prompt

```
Read handoff-phase-4-gate.md at project root, then PLAN.md Phase 4 (lines 147-172). Phase 3 just shipped - shield scoring is live and backfilled. Build Phase 4: risk classification engine in src/analysis/gate.ts, action_queue table in D1, API endpoints for listing/approving/dismissing actions, and a dashboard section showing recommended actions. Deterministic classification first, Haiku fallback for ambiguous. Ship when done.
```

---

## End-of-Chat Handoff

When Phase 4 is done, write `handoff-phase-5-polish.md` before closing. Phase 5 is competition polish: Loom script, README screenshots, Skool submission post. Deadline May 27.

---

Context budget: session was compacted and resumed. Write the next handoff before context fills.
