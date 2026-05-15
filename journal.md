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
