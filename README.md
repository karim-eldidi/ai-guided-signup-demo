# Urban Sports Club — Urby pilot

A working MVP of an AI-guided B2C signup journey. A visitor lands, explores venues or starts their fit immediately, answers four short questions from **Urby**, explores curated activity galleries and a personalised weekly routine, sees nearby venues and one recommended membership with plain-language reasons, can change any answer or swap venues across all seven days, then completes details and a simulated payment. If they leave, their progress is saved and a secure link brings them back to exactly where they stopped.

**This is a pilot.** Sample venue and plan data, demo Google/Apple buttons, simulated payment, local storage only. Nothing connects to a live Urban Sports Club system.

---

## Run it

You need **Node 22.5 or newer** and Python 3 (for standalone builds). There is no `npm install`, no external runtime dependencies and no database to set up.

```bash
npm start                       # local app at http://localhost:3000
npm run verify -- --units       # fast 58-unit check (~1s)
npm run verify                  # authoritative build + unit + browser verification
npm run build                   # rebuild standalone/ai-guided-signup-demo.html & index.html
npm run reset:db                # wipe the pilot database and start from zero visitors
```

If port 3000 is busy: `PORT=3010 npm start`.

### Environment variables

| Variable | What it does |
| --- | --- |
| `PORT` | Port for the local server (default `3000`) |
| `ANTHROPIC_API_KEY` | Optional. Enables Urby's AI wording layer; without it everything runs deterministically |
| `ADMIN_TOKEN` | Gates the `/admin/journeys` journey-data page. **Without it that page is switched off** (403) because it shows visitor emails, names, dates of birth, addresses and full event history |

```bash
ADMIN_TOKEN=pick-a-long-secret npm start
# then open http://localhost:3000/admin/journeys?token=pick-a-long-secret
# or send it as a header: curl -H "Authorization: Bearer pick-a-long-secret" http://localhost:3000/admin/journeys
```

The token is never embedded in any page, so the **Journey data** link in the demo banner shows an
honest "switched off" screen until you open the page with the token yourself.

---

## The five-minute demo path

1. **http://localhost:3000** (or open `index.html`) — the landing page. Notice that email is **not** a toll gate (Rule 61). Search for a favourite sport/venue or click **Find my fit** / **Start with one answer**.
2. **Answer Urby's four questions.** Pick Goal, Activities, Area (pick up to 2, e.g. home and work), and Frequency. Use quick choice cards, or type into *"Answer in your own words"* — try *"realistically about twice a week"* or *"I live in 12045"*.
3. **The recommendation.**
   - **My routine**: A practical starting week built from the visitor's answers. Swap a session or add another place to adapt it.
   - **Activities & studios**: Curated venue cards explain the match with traceable reasons such as activity, area, and preference fit, alongside membership access.
   - **Plan choice**: One clear recommended plan, why it fits, monthly/annual commitment options, and transparent comparison with alternative plans.
4. **Routine editing.** Open **Activities & studios**, add a place to the routine, or use **Swap** on an existing session. The plan and coverage feedback update with the visitor's choices.
5. **Press "Save for later"** in the top right. Enter an email to receive your secure resume link. Open that link in a private window to verify your progress, answers, and routine resume instantly.
6. **Finish the journey** — enter details, review the simulated payment screen (order summary, cancellation terms), and confirm.
7. **`/admin/journeys?token=…`** (server mode, needs `ADMIN_TOKEN` — see above) — view the funnel, visitor sources, answer patterns, rule firings, returns, and conversion stats.

---

## How Urby stays credible

Urby does **not** choose the membership. Deterministic product rules in `src/recommend.js` and `src/plans.js` do:

| Rule | What it does |
| --- | --- |
| `frequency-base` | Expected visits per week sets the starting plan |
| `unwind-needs-plus-tier` | Unwinding needs pools and sauna, so never the most limited plan |
| `try-new-needs-breadth` | Trying new things needs more than one venue type |
| `variety-barrier` | Variety named as an obstacle lifts off the most limited plan |
| `nearby-sufficient` | Plenty of venues within walking distance means no need to over-buy |
| `cap-top-plan` | The top plan is never recommended without the frequency to justify it |

Every rule that fires records a plain-language reason in the "Why this fits you" section. The plan set, prices, check-in limits, and allowances all come from `data/plans.json`.

**The AI layer is optional and narrow.** With no API key, the entire journey functions deterministically. Setting `ANTHROPIC_API_KEY` enables optional LLM phrasing for free-text answers and rephrasing explanations:
- Urby may **never** invent prices, numbers, venues, or plans (`src/urby.js` validates and rejects hallucinated outputs).
- Calls time out after 3.5s and fall back gracefully to deterministic copy.

---

## Changing the content

| To change | Edit |
| --- | --- |
| Plans, prices, commitment terms, limits | `data/plans.json` |
| Venues, areas, activities, coordinates | `data/venues.json` |
| App integrations & activations | `data/apps.json` |
| FAQs and knowledge base | `data/faqs.json` |
| Standalone demo UI & logic (Primary Artefact) | `standalone/template.html` |
| Design tokens, typography & styling | `public/styles.css` |
| Recommendation engine & business math | `src/recommend.js`, `src/plans.js`, `src/weekplan.js` |
| Server views (SSR fallback) | `src/views/` |

After editing `standalone/template.html` or `public/styles.css`, run:
```bash
python3 standalone/build.py && cp standalone/ai-guided-signup-demo.html index.html
```

---

## Project structure

```
standalone/template.html   Primary presentation artefact & client application
standalone/build.py        Inlines templates, styles, data, and assets into standalone HTML
index.html                 Published root demo file (synced with standalone build)
public/styles.css          Design tokens, layout, and styling
data/plans.json            Published plans, prices, rules, and commitments
data/venues.json           Curated Berlin venues, coordinates, and categories
data/apps.json             Partner app catalogue and commitment unlock rules
data/faqs.json             Knowledge base and FAQ answers
src/recommend.js           Deterministic membership recommendation engine
src/plans.js               Plan math, pricing, and allowance rules
src/weekplan.js            Deterministic weekly routine builder
src/venues.js              Spatial matching, distances, and category grouping
src/urby.js                Optional AI wording layer with strict validation
server.js                  Zero-dependency Node HTTP server (optional pilot backend)
tests/                     58 unit tests and comprehensive browser journey suites
scripts/verify.mjs         Authoritative verification script (units + browser tests)
DECISIONS.md               Detailed product decisions & architectural rationale
PORTING.md                 Production migration guide for USC engineering
```

---

## Accessibility and robustness

- Native keyboard navigation, focus trapping in sheets/modals, and full `aria-*` attributes.
- Respects `prefers-reduced-motion` across animations and programmatic scrolling.
- Responsive across all viewports (1440×900, 1280×800, 900×1000, 390×844).
- 58 unit tests and automated multi-viewport Playwright verification.
