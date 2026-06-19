# Project Journal - undercurrent

## 2026-05-14 | SHIP | 86efbe7

Shipped: Taste audit auto-fix pass. Dashboard visual quality jumped from 9/18 to 16/18 across T1-T10 taste evals and P1-P8 Power Design evals. All custom easing, hero entrance choreography, 8-pt grid compliance, measure constraints, accent discipline, and composition break now live at undercurrent.washyaderner.workers.dev.
Commits: 1 since last ship (first journal entry, 7 total on main)
Key changes:
- Custom cubic-bezier easing replaced all CSS keyword easing (T8/CA-18)
- Hero entrance stagger on header/stats/trends heading (UX-22)
- All spacing snapped to 8-pt grid: py-0.5->py-1, px-1.5->px-2, p-5->p-6, etc. (P1)
- Tags neutralized from cyan accent to surface-hover/dim (T6/P7)
- Asymmetric sig-divider gradient between trends and psychosis sections (T10/VD-6)
- h1 bumped to text-4xl (36px) for heading tightening threshold (T1)
- max-w-[65ch] on analysis summaries, briefs, footer (T3)
- Three hover vocabularies: glow (cards), lift (buttons), color-snap (links) (UX-23)
Lesson: CSS-only fixes (easing, animations, utility classes) can flip 3-4 evals without touching HTML structure. Neutralizing accent elements (tags to surface-hover) is higher ROI than removing them.

## 2026-05-14 | SHIP | 75ff9f2..9e885ea

Shipped: Dashboard visual hierarchy redesign. Actions section moved below trends and psychosis filter, restoring the core value proposition (trend intelligence) above the fold. Auto-approved items collapsed to one-line summary, review items capped at 5 with expand toggle, compact card design with left-border risk colors and hover-reveal dismiss.
Commits: 2 since last ship
Key changes:
- Actions section relocated from above trends to below psychosis filter
- Auto-approved items hidden behind "N items auto-approved this cycle" summary
- Review items capped at 5 visible with "Show N more" toggle
- Compact cards: line-clamp-2 descriptions, no reason line, p-3 padding, border-l-2 colored by risk (red/amber)
- Approve button filled green, dismiss text-only on hover
- Fade-out animation on approve/dismiss uses custom easing
Lesson: Information hierarchy is the product. Derived features (action recommendations) placed above core value (trends) invert the user experience regardless of how well they work technically. Always ask "what is this product about" before placing new sections.

## 2026-05-14 | SHIP | 86efbe7..75ff9f2

Shipped: Phase 3 Inbound Shield. Deterministic content safety scoring with three screening layers (URL, prompt injection, dangerous code patterns). Shield scores stored in D1, surfaced on dashboard and kit markdown. Backfill completed on 91 existing items (90 clean, 1 expected false positive).
Commits: 1 since last ship
Key changes:
- src/analysis/shield.ts: 15 bad domains, 14 shorteners, 5 typosquat targets, 14 injection patterns, 7 social engineering patterns, 15 dangerous code patterns
- Shield wired into analysis pipeline, runs alongside Claude analysis
- Dashboard shows conditional S:XX indicators on flagged items (>0.2 threshold)
- Kit markdown adds [SHIELD WARNING] / [REVIEW] labels and Security Notes section
- /api/backfill-shield endpoint for one-time migration of existing items
Lesson: Deterministic regex heuristics at zero cost/latency are the right first layer. The single false positive (prompt injection discussion flagged at 0.8) validates that the scanner catches the patterns it should - context-aware filtering can come later if needed.
