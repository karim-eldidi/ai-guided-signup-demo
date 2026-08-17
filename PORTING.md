# Porting the pilot into the existing stack

Written for the engineers who would take this further. It maps the pilot onto what Urban Sports
Club already runs, so the pilot is a starting point rather than a throwaway.

## What already exists (and why the pilot is shaped this way)

- **Landing pages are Contentstack content rendered by a Next.js app** (`urbansportsclub/cms`).
  Pages are composed from modular sections in `src/ui/components/sections`, TypeScript, routed
  dynamically at `src/app/[locale]/[page]/page.tsx`. Contentstack already supports A/B testing
  of pages, so the pilot can be experimented against the current journey.
- **The platform monolith is USCWEB** — PHP 8 (Phalcon), Postgres. The documented rule is to read
  and write monolith data through the **BFF API (RFC-58)**, not the monolith database.
- **There is precedent for standalone Next.js apps outside the monolith** — the *Web Offer Search
  MVP* ("offer-search") was scoped exactly that way for logged-out discovery. This pilot is the
  conversational sibling of that work and should be coordinated with it rather than duplicating it.
- **Payments** run through Adyen (Web Drop-in on USCWEB). **CRM** is HubSpot. **Experiments** run
  on Statsig / GA.

The pilot is a zero-dependency Node app so it runs and demonstrates with one command. The *markup,
copy, styling and logic* are what transfer — not the server.

## Step 1 — the two landing sections into Contentstack

`porting/nextjs-sections/` contains React/TypeScript versions of the two landing-page sections,
written to the conventions in the CMS engineering guide (folder per section, `domain/types.ts`,
props named to match Contentstack field ids):

```
porting/nextjs-sections/
├── hero-signup/
│   ├── HeroSignup.tsx
│   └── domain/types.ts
└── urby-guide/
    ├── UrbyGuide.tsx
    └── domain/types.ts
```

Drop each folder into `src/ui/components/sections/`, create the matching content type in
Contentstack with the field ids from `domain/types.ts`, and the section becomes editable by the
content team. Copy currently in the pilot views becomes CMS fields — nothing is hard-coded that
an editor would reasonably want to change.

The pilot's CSS custom properties (top of `public/styles.css`) map to the component library's
tokens; the values were sampled from the supplied designs, so they are a reference, not a
replacement for the design system.

## Step 2 — where the pilot's own logic should live

The conversation needs server state, which a CMS page cannot provide. Options, in order of
increasing commitment:

1. **Keep it as a separate small service** behind a route on the main domain (there is already a
   technical proposal for publishing CMS pages on the main domain). The landing page stays in
   Contentstack; `/find-my-fit` is the app. Lowest risk, fastest to test.
2. **Fold it into the `cms` Next.js app** as route handlers plus a small store. Fewer moving
   parts, but couples an experiment to the content app's release cycle.
3. **A Member Growth service.** There is already an epic for one (`PDR-96`). If this journey
   survives the experiment, that is where it belongs.

## Step 3 — replacing the sample data

Every integration point is isolated in one file, so swapping a data source touches one place.

| Pilot file | Replace with |
| --- | --- |
| `data/venues.json` via `src/venues.js` | the existing mobile venue/filter APIs (same ones offer-search uses) |
| `data/plans.json` via `src/recommend.js` | plan and pricing data through the BFF API |
| `src/db.js` | the pilot store, or the Member Growth service |
| simulated payment in `server.js` | the existing Adyen drop-in / current checkout |
| demo Google & Apple buttons | the real SSO providers |
| `recordEvent()` in `src/db.js` | Statsig / GA events, matching the existing data-layer naming |
| the follow-up email preview | HubSpot, gated on the stored marketing consent |

Keep `src/recommend.js` as-is when you do this. It is deliberately pure — answers and a venue
match in, a recommendation out — so it can be unit-tested and reviewed by product without a
running backend.

## Step 4 — what needs a decision from other teams

- **Consent and data retention.** The pilot captures marketing consent separately from Terms
  acceptance and only puts marketing content in the follow-up email when consent exists. The
  retention period, the lawful basis for the resume link, and the final wording are Legal's call.
- **Resume links.** A single unguessable token is fine for a pilot and not fine for production.
  Expiry, single use, and rate limiting need deciding.
- **The AI layer.** The pilot's guardrail is that the model may never introduce a number, price,
  plan or venue name. Whoever owns this in production should keep that constraint, or replace it
  with something stronger — not loosen it.
- **Experiment design.** Which city, what counts as an eligible new visitor, and the true baseline.
  The pilot logs source, campaign, every step, the exit point, returns and conversion so the
  experiment can be measured, but it does not define the experiment.

## Testing

`tests/journey.test.js` uses only Node's built-in test runner. The recommendation and matching
tests are pure functions and port directly to Vitest or Jest with no changes beyond the import
of `test`/`expect`. The end-to-end tests drive real HTTP and would become Playwright specs.
