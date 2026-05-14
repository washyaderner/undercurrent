# Handoff: Phase 3 - Inbound Shield

> Prior sessions shipped Phase 0 (pipeline + dashboard), Phase 1 (setup wizard + personalized dashboard), and Phase 2 (stack diff engine + absorption scoring). This handoff picks up at Phase 3.

## Prerequisites

- [x] Worker deployed at `undercurrent.washyaderner.workers.dev` (unified API + dashboard)
- [x] D1 database with ~98 items, ~86 analyzed, 5 trends
- [x] Setup wizard at `/setup/` generating my-stack.md (localStorage)
- [x] Kit endpoint accepts POST with stack data, returns personalized Stack Assessment via Haiku
- [x] Absorption scores displayed on trend cards (fetched via `/api/absorption`)
- [x] GitHub repo at `washyaderner/undercurrent` (6 commits on main)
- [x] Cron running every 6 hours

## Read First

1. `PLAN.md` - Full master plan, Phase 3 spec at lines 118-142
2. `src/worker.ts` - Current Worker (API routes + pipeline + stack diff)
3. `src/analysis/psychosis.ts` - Existing deterministic pre-screening (extend, don't replace)
4. `src/analysis/analyze.ts` - Claude Haiku analysis pipeline
5. `dashboard/src/pages/index.astro` - Dashboard (needs shield score display)
6. `schema.sql` - Current D1 schema (may need shield_score column on content_items)

## Scope: Phase 3 (Inbound Shield)

Content that passes the psychosis filter still needs security screening before anything touches the user's system.

### 3a: URL/Payload Screening
- Known-bad domain list (phishing, typosquatting of popular AI tools)
- Suspicious URL patterns (URL shorteners hiding destinations, lookalike domains)
- Flag content that asks users to run arbitrary code without context
- New file: `src/analysis/shield.ts`

### 3b: Prompt Injection Detection
- Scan `implementation_brief` and `content_preview` for injection patterns
- "Ignore previous instructions" variants
- Hidden instructions in code snippets
- Social engineering patterns ("just paste this into your terminal")

### 3c: Code Safety Heuristics
- Flag code snippets that: `curl | bash` from unknown sources, modify system files, install unsigned packages, access credentials
- Not blocking, flagging with severity level
- Shield score added to each content item (0 = clean, 1 = dangerous)

### Build steps
1. Create `src/analysis/shield.ts` with three screening functions (URL, injection, code safety)
2. Add `shield_score` column to D1 schema (REAL, nullable, 0-1 scale)
3. Wire shield scoring into the analysis pipeline (run after psychosis, before/during Haiku analysis)
4. Add shield score display to dashboard (on signal cards, next to psychosis/originality scores)
5. Add shield indicators to kit markdown (flag dangerous items)
6. Rebuild dashboard, deploy unified Worker
7. Verify: inject test content with known-bad patterns, confirm flagging works

### Verification
- Content with `curl | bash` URLs gets shield_score > 0.5
- Known prompt injection patterns ("ignore previous instructions") get flagged
- Legitimate technical content stays at shield_score < 0.2
- Shield score visible on dashboard signal cards
- Kit markdown includes shield warnings for flagged items
- Deploy to `undercurrent.washyaderner.workers.dev` and verify live

## Things NOT To Do
- Don't modify the wizard or stack diff logic (Phase 1-2, done)
- Don't add Twitter/X integration (Phase 6, post-competition)
- Don't build the approval gate yet (Phase 4)
- Don't block content based on shield score, only flag it
- Don't use an external API for shield scoring (keep it deterministic + fast)

## Decisions Resolved
- Shield scoring is deterministic (regex + heuristics), not AI-powered. Fast and free.
- Shield score is 0-1 float, same convention as psychosis_score
- Shield runs in the analysis pipeline, stored in D1 alongside other scores
- Display on dashboard uses the same color coding as psychosis (green/amber/red)

## Pickup Prompt

```
Read /Users/studio/Build/undercurrent/PLAN.md and /Users/studio/Build/undercurrent/handoff-phase-3-shield.md first. Then read src/analysis/psychosis.ts (the pattern to follow), src/worker.ts (where to wire it in), and dashboard/src/pages/index.astro (where to display it). Build Phase 3: the inbound shield. Create src/analysis/shield.ts with URL screening, prompt injection detection, and code safety heuristics. Add shield_score to D1, wire into pipeline, display on dashboard. Deploy and verify.
```

## End-of-Chat Handoff
When Phase 3 is done, write `handoff-phase-4-gate.md` before closing.

## Context Budget
~50% at handoff write time.
