# AI-guided signup demo: agent instructions

## Mission

Maintain a credible, testable pilot of an AI-guided Urban Sports Club signup journey.
The product guide is Urby. Payment is simulated and nothing connects to a live USC system.

Karim is the product owner and is not an engineer. Explain outcomes in plain language, make
sensible low-risk decisions, and do not hand him implementation choices unless they materially
change the product.

## Start here

1. Read the request and `git status --short --branch`.
2. Read only the files needed for the task. Use `DECISIONS.md` only for the relevant product rule.
3. For a quick answer or documentation-only change, do not run the full browser suite.
4. For code changes, use targeted checks while iterating and run `npm run verify` once before
   declaring completion.
5. Report what changed, what was verified, and any remaining risk. Never claim success when a
   required check failed or was skipped.

## Commands

```bash
npm start                       # local app at http://localhost:3000
npm run verify -- --units       # fast unit-only check
npm run verify                  # build + unit + browser verification
npm run verify -- reco          # browser suites whose names contain "reco"
npm run build                   # rebuild standalone/usc-ula-demo.html
npm run reset:db                # delete local pilot database
```

Node 22.5+ is required. Do not add a dependency unless the task genuinely requires it and explain
the cost. Never expose or commit secrets. Preserve unrelated user changes.

## Source of truth

- `standalone/template.html`: primary demo screens and client logic.
- `public/styles.css`: design tokens and styling.
- `standalone/build.py`: creates the single-file demo and published `index.html`.
- `data/*.json`: plans, prices, venues, apps, FAQs and their source notes.
- `src/recommend.js`: deterministic membership choice. A model never chooses the plan.
- `src/plans.js`, `src/coverage.js`, `src/weekplan.js`, `src/venues.js`: product rules and math.
- `src/ula.js`: optional wording layer with deterministic fallbacks.
- `scripts/verify.mjs`: authoritative verification command.
- `DECISIONS.md`: detailed product rationale; read on demand, not at every session start.
- `PORTING.md`: production integration guidance.

The standalone demo is the presentation artefact. The server shares rules and data but some of its
screens may lag behind the standalone redesign. If a change affects the demo, rebuild and verify
that `index.html` is current.

## Non-negotiable product rules

- Recommendation and coverage are deterministic, traceable, and work without an AI key.
- Published plan allowances are hard constraints. Never invent prices, distances, coverage, terms,
  ages, venue facts, or live availability.
- Value comes before price. Show the visitor's goal, possible week, and relevant places before the
  commercial argument.
- The visitor can edit every answer. Recompute all dependent copy and numbers after a change.
- Email is optional and never a toll gate. Marketing consent is separate, optional, and unchecked.
- Saving progress and joining are different intentions and different screens.
- Simulated payment and pilot limitations must stay explicit.
- One decision and at most one filled black primary button per screen.
- Question screens must fit at 1440x900, 1280x800, 900x1000, and 390x844.
- Keep keyboard access, reduced motion, responsive layout, and honest empty/error states working.
- User-facing copy uses British English and calls the guide **Urby**.

When a task touches one of these rules, read its numbered explanation in `DECISIONS.md` before
editing. Do not load the entire document for unrelated work.

## Coding conventions

- ES modules and JavaScript; no TypeScript in the pilot.
- `kebab-case` files, `camelCase` variables, `UPPER_SNAKE_CASE` constants.
- Comments explain why, not what.
- Prefer small changes that preserve the dependency-free runtime.
- Do not rewrite working areas outside the request.

## Efficient agent behaviour

- Search first; do not repeatedly reread large files or dump entire generated files into chat.
- Batch related read-only checks and run one final verification command.
- Use screenshots only when visual evidence is needed, normally once after the implementation.
- Do not keep long sessions alive after a clean handoff. Start a fresh task for unrelated work.
- Never run multiple agents against overlapping files or the same branch. Use separate branches or
  worktrees for genuinely independent tasks, then merge only after each branch passes verification.
- If blocked, state the concrete blocker and the smallest action needed from Karim.

## Definition of done

- Requested behaviour works in the relevant desktop and mobile views.
- Appropriate tests pass; `npm run verify` passes for code or presentation changes.
- Generated/published artefacts are current when applicable.
- `git diff` contains only intentional changes and no secrets or machine-specific files.
- The handoff is short, factual, and names any check that was not run.
