# Urban Sports Club — Urby pilot

A working MVP of an AI-guided B2C signup journey. A visitor lands, gives an email, answers
four short questions from **Urby**, sees nearby venues and one recommended membership with a
plain-language reason, can change any answer, then completes details and a simulated payment.
If they leave, their progress is saved and a secure link brings them back to exactly where
they stopped.

**This is a pilot.** Sample venue and plan data, demo Google/Apple buttons, simulated payment,
local storage only. Nothing connects to a live Urban Sports Club system.

---

## Run it

You need **Node 22.5 or newer** and nothing else. There is no `npm install`, no build step and
no database to set up.

```bash
npm start
```

Then open **http://localhost:3000**

```bash
npm test          # 31 tests covering the rules and the whole journey
npm run dev       # same as start, but restarts when you edit a file
npm run reset:db  # wipe the pilot database and start from zero visitors
```

If port 3000 is busy: `PORT=3010 npm start`.

---

## The five-minute demo path

1. **http://localhost:3000** — the landing page. Tick the marketing checkbox, enter any email,
   press **Find my fit**. (Or use the Google / Apple buttons — they create a clearly-labelled
   demo identity, since the pilot has no live SSO credentials.)
2. **Answer Urby's four questions.** Use the quick choices, or type into "Or tell Urby in your own
   words" — try *"realistically about twice a week"* or *"I live in 12045"*.
3. **The recommendation.** One plan, why it fits, the limitations that actually affect the
   decision, nearby venues, and a cheaper / richer alternative. Press **Change** on any answer
   to watch the recommendation update.
4. **Press "Save and exit"** in the top right. Choose an email preference. You get the saved-progress
   screen with the resume link — **open that link in a private window** to prove the journey
   resumes with no password and no lost answers.
5. **See the follow-up email** at `/preview/email`. Note that marketing content only appears when
   consent was given.
6. **Finish the journey** — details, then the payment screen (full order summary, cancellation and
   renewal terms), then confirm.
7. **`/admin/journeys`** — the funnel, every visitor, their source and campaign, answers,
   which rules fired, what they chose, how many times they came back, and whether they converted.

---

## How Urby stays credible

Urby does **not** choose the membership. `src/recommend.js` does, using rules you can read:

| Rule | What it does |
| --- | --- |
| `frequency-base` | Expected visits per week sets the starting plan |
| `unwind-needs-plus-tier` | Unwinding needs pools and sauna, so never the most limited plan |
| `try-new-needs-breadth` | Trying new things needs more than one venue type |
| `variety-barrier` | Variety named as the obstacle lifts off the most limited plan |
| `nearby-sufficient` | Plenty of venues within walking distance means no need to over-buy |
| `cap-top-plan` | The top plan is never recommended without the frequency to justify it |

Every rule that fires records a reason, which is what the "Why this fits" list shows. The plan
set, prices, check-in limits and limitations all come from `data/plans.json`.

**The AI layer is optional and narrow.** With no API key the journey is fully functional. Set
`ANTHROPIC_API_KEY` and Urby additionally (a) acknowledges free-text answers in her own words and
(b) rephrases the explanation the rules produced. She may not add a number, a price, a plan name
or a venue name — `src/urby.js` rejects the model's output if it tries. Calls time out after
3.5 seconds and fall back to the rules, so the demo cannot hang in front of an audience.

```bash
ANTHROPIC_API_KEY=sk-ant-... npm start
```

Free text works without a key too, via keyword and postcode matching. When Urby genuinely cannot
tell what someone means, she says so and asks them to pick the closest option rather than guessing.

---

## Changing the content

| To change | Edit |
| --- | --- |
| Plans, prices, commitment terms, limitations | `data/plans.json` |
| Venues, areas, activities, coordinates | `data/venues.json` |
| Urby's questions, options, order | `src/questions.js` |
| The recommendation rules | `src/recommend.js` |
| Venue matching and distances | `src/venues.js` |
| Urby's fallback wording | `src/urby.js` |
| Colours, type, spacing | the `:root` block in `public/styles.css` |
| Any screen's markup | `src/views/` |

Adding a question is a single entry in `src/questions.js` — the conversation screen, the
"Your fit so far" panel, the resume logic and the answer-review list all read from that array.

---

## What is stored, and where

One SQLite file at `.data/pilot.db`, created on first run. Per visitor: email, auth method,
marketing consent, answers, the recommendation, chosen plan and commitment, details, start date,
payment status, last completed step, resume token, acquisition source and campaign, and a return
counter. Plus an event log (`events`) for the funnel.

There is deliberately **no second membership or authentication system**. Resuming is a single
unguessable token in a URL — enough for a pilot, and explicitly not production auth.

Details entered on the details screen never leave the machine running the app.

---

## Project structure

```
server.js                  HTTP server and all routes (one file, top-to-bottom readable)
data/plans.json            SAMPLE membership plans
data/venues.json           SAMPLE Berlin venues and areas
src/questions.js           Urby's question set
src/venues.js              venue matching, distances
src/recommend.js           the recommendation rules  ← owns the plan choice
src/urby.js                optional AI wording layer, with deterministic fallbacks
src/db.js                  SQLite storage
src/views/                 one file per screen, plus shared layout, icons and the fit panel
public/styles.css          design tokens and all styling
public/app.js              progressive enhancement only — every screen works without it
tests/journey.test.js      rules, matching, free text, and the full journey
porting/                   Next.js versions of the two landing sections, for the CMS repo
```

---

## Accessibility and robustness

Every action is a real form submit, so the whole journey works with JavaScript disabled. Option
cards are real radio inputs, reachable and selectable by keyboard. There is a skip link, visible
focus rings, `aria-expanded` on the collapsibles, a focus-trapped modal that closes on Escape,
and `prefers-reduced-motion` is respected. Verified at 1440px and 390px with no console errors.

## Known limits of the pilot

- Venue photos come from the supplied designs; venues without one show a branded icon tile.
  Drop real images into `public/images/` and point `data/venues.json` at them.
- Google and Apple buttons create a demo identity. No live SSO.
- No payment provider is contacted. In production this is where the existing Adyen drop-in goes.
- Distances are straight-line from an area centroid, not travel time.
- English only. The Contentstack app already handles locales; see `PORTING.md`.
- `/admin/journeys` has no authentication. It is a demo surface, not a dashboard.
