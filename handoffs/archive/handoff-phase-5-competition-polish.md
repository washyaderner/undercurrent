# Handoff: Phase 5 - Competition Polish

> Phases 0-4 shipped. Dashboard redesign completed 2026-05-14 (trends above fold, compact actions below). This is the final push before the May 27 Skool submission.

---

## What's Done

- **Phase 0:** Core pipeline (ingest, analysis, trends, dashboard, kit delivery)
- **Phase 1:** Setup wizard at /setup (stack config, absorption scoring, relevance tags)
- **Phase 2:** Taste audit (16/18 visual score)
- **Phase 3:** Inbound Shield (deterministic content safety scoring, 3 screening layers)
- **Phase 4:** Approval Gate (risk classification, action queue with approve/dismiss)
- **Dashboard Redesign:** Actions moved below trends, auto-approved collapsed, review items capped at 5, compact cards with left-border risk colors

All live at `undercurrent.washyaderner.workers.dev`. Git main at `9e885ea`.

---

## Read First

1. `PLAN.md` - Phase 5 spec starts at line 177
2. `journal.md` - ship history
3. `dashboard/src/pages/index.astro` - the dashboard page
4. `dashboard/src/styles/global.css` - design system
5. `README.md` - current state, needs screenshots

---

## Phase 5 Scope

### 5a: Loom Script (60 seconds)

Write the script. Russ records. Exact timing from PLAN.md:

- **0-10s:** Hook. "Every AI trend you've heard of was discussed by 4-5 people weeks before it went mainstream. Undercurrent finds those people."
- **10-25s:** Dashboard demo. Trends, psychosis filter (hype vs genuine side by side), kit download.
- **25-40s:** Setup wizard. "Install in 60 seconds. It learns your stack and tells you what to absorb."
- **40-55s:** Stack diff. Show a kit with personalized assessment. "It knows what you already have. It only shows you what's new."
- **55-60s:** Close. "Trend detection is people detection. Link in comments."

Deliver as `loom-script.md` at project root.

### 5b: README Polish

Current README has architecture info but needs:
- Screenshots from the live dashboard (above-fold trends view, psychosis filter, action cards, kit download)
- Competition context section
- Quick-start instructions
- Screenshots go in `.tmp/` or committed as assets

### 5c: Submission Post

Draft a Skool post for the "May Comp" thread:
- Lead with the insight ("trend detection is people detection"), not the tool
- Links: GitHub repo + live dashboard + Loom
- Keep it punchy, no em dashes

---

## What NOT to Change

- Worker code, API endpoints, analysis pipeline - all stable
- Dashboard layout (the redesign just shipped)
- Schema or D1 data
- Design system tokens

---

## Success Criteria

1. Loom script is exactly 60 seconds, no filler
2. README has real screenshots from the live dashboard
3. Submission draft is ready to paste into Skool
4. Shows real data, not mocked

---

## Competition Details

- **Where:** Jack Roberts' AI Automations Skool
- **Deadline:** May 27, 2026
- **Prizes:** $500 first, $300 most creative
- **Deliverables:** 60-second Loom + GitHub repo + Skool post

---

## PLAN.md Update Needed

Phase 4 is shipped but not marked [DONE] in PLAN.md. Update it at session start.

---

## Pickup Prompt

```
Read handoff-phase-5-competition-polish.md at project root. Phases 0-4 all shipped, dashboard redesign done. Phase 5 is competition polish: write a 60-second Loom script, add screenshots to README, draft the Skool submission post. Deadline May 27. Don't touch the worker or dashboard code. Deliver the script, polished README, and submission draft.
```

---

Context budget: ~30% at handoff time.
