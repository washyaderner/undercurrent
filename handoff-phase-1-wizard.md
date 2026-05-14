# Handoff: Phase 1 - Setup Wizard

> Prior session shipped Phase 0 (full pipeline + dashboard + kit delivery). This handoff picks up at Phase 1.

## Prerequisites

- [x] Worker deployed at `undercurrent.washyaderner.workers.dev` (dashboard + API unified)
- [x] D1 database with ~92 items, ~76 analyzed, 5 trends
- [x] Kit download endpoint working (`/api/kit?topic=X&download=1`)
- [x] GitHub repo at `washyaderner/undercurrent` (3 commits on main)
- [x] Cron running every 6 hours (data accumulating)

## Read First

1. `PLAN.md` - Full master plan with all phases
2. `src/worker.ts` - Current Worker (API routes + pipeline)
3. `dashboard/src/pages/index.astro` - Current dashboard
4. `wrangler.toml` - Worker config (note `[assets]` for static serving)
5. `schema.sql` - Current D1 schema

## Scope: Phase 1 (Setup Wizard)

### 1a: Wizard UI
- New Astro page at `dashboard/src/pages/setup.astro`
- Multi-step form, 5-6 questions (see PLAN.md Phase 1a for details)
- Dark terminal aesthetic matching existing dashboard
- Progress indicator, keyboard nav, smooth transitions
- Must look polished for the Loom demo

### 1b: my-stack.md Generation
- Wizard output is structured markdown
- Store in localStorage + offer download
- Sections: identity, stack, tools, infra, priorities, trusted sources

### 1c: Personalized Dashboard
- After wizard, dashboard filters/badges signals by stack relevance
- Kit downloads include stack context
- "Relevant to your stack" indicator

### Build steps
1. Create `dashboard/src/pages/setup.astro` with multi-step wizard
2. Add client-side JS for step transitions, form state, localStorage
3. Generate my-stack.md from form data
4. Add download button + localStorage persistence
5. Update index.astro to read localStorage and show personalized view
6. Rebuild dashboard, deploy unified Worker
7. Verify wizard flow end-to-end in browser

### Verification
- Complete wizard in < 60 seconds
- my-stack.md is well-structured
- Dashboard changes after wizard completion
- Kit download button still works
- Deploy to `undercurrent.washyaderner.workers.dev` and verify live

## Things NOT To Do
- Don't touch the ingestion pipeline or analysis logic
- Don't add Twitter/X integration (Phase 6, post-competition)
- Don't build the full stack diff engine yet (Phase 2)
- Don't modify the D1 schema for wizard data (localStorage only for now)

## Decisions Resolved
- Wizard is web-based (dashboard page), not CLI
- my-stack.md stored client-side (localStorage), not server-side
- Single Worker domain for everything (no separate Pages project)
- Kit download links use relative paths (`/api/kit?topic=X&download=1`)

## Pickup Prompt

```
Read /Users/studio/Build/undercurrent/PLAN.md and /Users/studio/Build/undercurrent/handoff-phase-1-wizard.md first. Then read the current dashboard at dashboard/src/pages/index.astro and the worker at src/worker.ts. Build Phase 1: the setup wizard. Start with the wizard UI (setup.astro), then wire up my-stack.md generation, then personalize the dashboard. Deploy and verify in browser.
```

## End-of-Chat Handoff
When Phase 1 is done, write `handoff-phase-2-stackdiff.md` before closing.

## Context Budget
~45% at handoff write time.
