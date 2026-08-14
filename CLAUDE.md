# Context for Claude Code

## Do this first, without being asked

You are in the Urby project. Before anything else, in one command:

```bash
npm run verify
```

That builds the demo, stages it, and runs 58 unit assertions plus 13 browser suites in
about 90 seconds — one screen of output. It tells you the project is healthy and gives you
the current state. Then read the rules below and do what Karim asked. He should not have to
tell you to read this file or to run the tests.

If he only wants a quick answer and no code change, skip the verify.

Read this first. It is deliberately short, because it is re-read on every single tool call
and you pay for it every time. The long version — every rule with the bug or the user
quote behind it — is in **`DECISIONS.md`**. Read that only when you are about to change
something it covers, or when a rule looks arbitrary and you want to know why it exists.

## Who you are working with

Karim El Didi, Urban Sports Club. **Not an engineer, no engineering support.**

- Plain language. Explain what changed, not how.
- Never leave `npm start` broken — it is his only way to see his work.
- Run `npm run verify` before saying anything is done. If it fails, say so.
- He describes outcomes ("it feels pushy"), not implementations. Translate it yourself.
- He has said: *"you have all the control, don't ask me"* and *"think smart not hard"*.
  Pick a sensible default and say what you picked; don't hand him a choice he can't evaluate.

## Working cheaply — read this before you start

Every tool call re-reads the whole conversation, so cost grows with session length, not
with the difficulty of the work. In one long session a call went from ~17k to ~73k
effective units for identical work.

- **One command, not eleven.** `npm run verify` builds, stages and runs everything —
  58 unit assertions and 13 browser suites, ~90s, one screen of output. Never run the
  suites one at a time. `npm run verify -- reco` filters; `-- --units` skips the browser.
- **Don't re-read files you just wrote.** Edit and Write fail loudly if they didn't apply.
- **Screenshot once, at the end.** Not to confirm each step.
- **Say it once.** Long recaps of work he watched you do are pure cost.

## What this project is

A working MVP of an AI-guided B2C signup journey for Urban Sports Club. A visitor lands,
optionally gives an email, answers four short questions from a guide called **Urby**, then
sees real places near them, a possible week built from their answers, one recommended
membership with reasons, and a counted answer to "what can I use, near me?". Any answer is
editable. Then details and a simulated payment. Leave and a resume link brings it all back.

A **pilot**: real published prices and terms, real Berlin venues from urbansportsclub.com,
simulated payment, local storage only. Nothing touches a live Urban Sports Club system.

## Run and test

Node 22.5+. No dependencies, no install, no build step for the server.

```bash
npm start          # http://localhost:3000
npm run verify     # build + all tests + one summary   ← use this
npm run build      # rebuild standalone/usc-ula-demo.html only
npm run reset:db   # wipe the pilot database
```

`standalone/template.html` + `standalone/build.py` inline the CSS, JSON and images into a
single ~1 MB `usc-ula-demo.html`. **That file is the demo Karim sees.** The `src/` server
app shares the rules and data but its screens lag behind the standalone redesign.

Deploying: `git push` is blocked in this sandbox. The live copy is GitHub Pages from the
separate public repo `karim-eldidi/usc-ula-demo` — upload `index.html` through the GitHub
web UI. The banner carries a build stamp so you can tell whether he is looking at your
work; the CDN caches for ~10 minutes.

## The rules, in one line each

Full reasoning, and the specific bug behind each, in `DECISIONS.md`. Numbering matches.

**Truth**
1. Rules choose the plan, never a model. `src/recommend.js` owns it.
2. Works with no AI key. 3. Works with no JavaScript — real form POSTs.
4. Every recommendation explains itself; a new rule brings a new reason.
6. Every fact traceable; anything approximated says so.
13. Coverage is counted from published per-venue limits, never estimated.
22. A tier above the frequency floor needs a named venue as evidence.
36. **The check-in allowance is a hard constraint and the last word.** Essential is 4/month;
    others are one a day. Cost-per-session divides by what the plan *permits*.
32 / 41. Never offer an alternative that opens nothing, in either direction, and state what
    an option costs, not only what it saves.
17. The reasons on screen must argue for the plan on screen.
52. Every dynamic line is recomputed from the plan selected **now**, or it is cleared.
53. A choice the visitor made is never relabelled as Urby's recommendation.
54. Three counts, one match: places doing what they asked, of those the ones the plan
    opens, and everything else in range. Never call an adjacent venue a match.
63. A search answers with a membership, not with a venue: every row names the cheapest
    plan that opens the place. Deterministic matching, no distance we cannot measure,
    and a miss says how small the pilot's sample is.

**Trust**
5. Marketing consent is separate from Terms, optional, unchecked.
7. No second auth system — resume is one token in a URL.
11. Never ask twice for an email or a consent decision.
19. Holding an email is not permission to keep it. `S.email` ≠ `S.saveOptIn`.
25 / 61 / 70. **The email is not a toll gate — not on the landing page, and not across the
    checkout either.** Four reviews called it one while it was optional. Saving and signing
    up are two intentions and two screens: `Continue with [plan]` goes straight to `details`,
    always; `saveScreen` is a way out, reached by choosing it, and it shows what it keeps
    before it asks where to send it. Saving ends on the saved confirmation, not on the form.
71. A way out that refuses to open is not a way out: `Save and exit` reaches the save
    screen from any point in the journey, and there it says only what is true that early —
    the answers so far and the question they stopped on, no plan, no price, no places.
62 / 66. The front door offers instead of asking, and it asks its one question itself: the
    guide's first question and its three answers are in the panel, the search is one tap
    behind them, and the page below carries only Ask Urby. The cards are the question, not
    a menu — choosing one answers it. One route into the four questions, still.
26. Never state an assumption the visitor cannot correct.
72. The recommendation opens by saying back what it heard — the goal in the title, the four
    answers as one sentence under it, recomputed from the week on screen (rule 52).
59. Bound a field by arithmetic, never by a policy we cannot source. No minimum age until
    `data/plans.json` carries one.
12. Urby records what the visitor wanted, including what we could not serve.
55. Marketing consent needs an address to attach to; unasked is not the same as declined.

**Shape**
8. One decision per screen. 9. **At most one filled black button visible per screen** —
    and the action must own the strongest edge on the screen, or the outlined thing beside
    it becomes the call to action instead (rule 66).
10. A question fits one screen at 1440×900, 1280×800, 900×1000 and 390×844.
14 / 68 / 72. **Value before price**, and the week is the value: the hero says back what
    they asked for → the week → the places → the apps → the questions. Four things in the
    story column, nothing else; everything about money is in the column beside it. The apps
    row wears the places' shape — a claim, two logos picked from the answers, the rest behind
    `See all apps`.
61. An app is shown "closest to" what they picked, never "for" it. Categories are the
    catalogue's own; the join from an activity to a category is ours (`APP_MATCH`), so it
    is never counted or called a match the way venues are (rule 54).
70. The save screen carries no checkout stepper — it is a way out, not a step of buying.
    The details form is grouped (About you / Contact / Address) with the plan, the term and
    three places it opens in a sticky column beside it.
15. Answers are always visible and editable as chips. 24. The steps carry only the question.
58. Nested progress is drawn nested: the four questions are segments inside step 1, and
    only the inner counter shows a number.
16. The end of the recommendation stays calm: one section open, the rest collapsed.
43 / 72. Four things in the story column, not nine. 45. Support goes behind the choice.
67 / 70 / 72. **All of the reasoning folds, because the plan card argues in numbers** —
    price, cost per session, what it opens. A closed drawer cannot argue (rule 17), so the
    card must. The reasoning is one of the three sections behind `Questions and details`,
    which names all three on its handle. Outside every fold: the way back to Urby's pick.
60 / 72. **The week is open and it leads** — a cream card, one white row per session, each
    row carrying the day, the activity, the photograph, the distance and the published limit.
    What folds is *adjusting* it, and that opens itself while a day note is live (rule 46).
66. The front door asks its question instead of pointing at it; the search box is one tap
    behind it. 72. **Three rows at the foot, one shape**: an icon, the claim, the figure
    behind it, and what you can do about it. Places, apps, questions — never three folds that
    each announce themselves differently.
74. **The venue page browses, and every control on it is one of Urby's questions**: five
    activity chips and an activities dropdown write the activities answer, the distance
    dropdown writes the radius in km, the location line is a labelled guess with a picker
    behind it, and the panel at the foot asks whichever of the other two questions is still
    open — answering any of them stays on the page. One card shape: browsing, the badge names
    the cheapest plan that opens the place; searched, the foot names it with the price. Never
    a search and a browse on screen together.
69. Inside the recommendation, the places carry their own search, behind the places row: it
    filters the pool within the radius, matches the way the site search matches, and hands a
    miss to the full search rather than to a dead end.
64 / 73. A recommendation contains its alternatives, **in the open** — one cheaper option
    spotlit beside the pick, and all four plans in a comparison that starts open on a desktop,
    each counting what it opens and saying where its allowance cannot carry their week.
32 / 73. An option that opens none of the places they asked for keeps its numbers and its
    warning and **loses its action**, on the card and in the table. Information, not an offer.
65. On a phone the plan card leads, the comparison starts closed, and the week follows — the
    plan card carries what it opens, so value still comes before price.
18 / 39. The week is the signature, and it is theirs to change — but never a booking.
50 / 56. How far we looked is a control, and it is measured in km, not adjectives.
57. The demo banner collapses to a marker; it never disappears.
33. Say a thing once per screen. 35. No orphaned words. 38. Figures use `tabular-nums`.
34. A comparison table is a grid: equal heights, aligned CTAs.

**Craft**
21. Option cards are native inputs; the tick lives *inside* `.option-card__icon`.
27. One line per option card. Scope every `.options--*` override.
40. Reduced motion includes motion you wrote in JavaScript.
44. A rail needs `grid-template-columns: none`. 48. Its ancestors need `min-width: 0`.
49. A scroller needs a visible way to scroll. 51. A sticky column must fit or scroll itself.
20. Validation belongs to the screen that produced it.
37. Only the resume link is shareable; the route lives in history state.
46. When an interaction changes the recommendation, say so at that moment.
47. The guide is **Urby** (renamed from Ula, 13 Aug).

## Zero dependencies is deliberate

`package.json` has no dependencies, which is why one command runs it with no toolchain.
Do not add a package without saying what it buys and what it costs.

## File map

```
standalone/template.html    ← THE DEMO. All screens, all logic, one file.
standalone/build.py         inlines CSS + JSON + images into usc-ula-demo.html
public/styles.css           design tokens (:root) and all styling
data/plans.json             real plans, prices, terms, benefits, sources
data/venues.json            real Berlin venues (see its _note for what is approximated)
data/apps.json              the real App Catalog, and which term unlocks it
src/recommend.js            the recommendation rules  ← owns the plan choice
src/plans.js                plan data + monthlyAllowance / visitsWanted / allowanceFloor
src/coverage.js             what a plan opens near you, plus honest upsell/downsell
src/weekplan.js             "a possible week", built only from the answers
src/venues.js               matching and distances
src/ula.js                  optional AI wording layer + deterministic fallbacks
server.js, src/views/       the server app (rules current, screens lag the standalone)
scripts/verify.mjs          the one test command
tests/*.test.js             58 unit assertions, incl. allowance.test.js
tests/browser/*.py          13 Playwright suites, ~424 assertions
DECISIONS.md                why each rule exists — read on demand
PORTING.md                  how this would ship inside Urban Sports Club
```

## Conventions

ES modules, `.js`, no TypeScript. `kebab-case` files, `camelCase` vars,
`UPPER_SNAKE_CASE` constants. Comments explain *why*, not *what* — keep that habit.
All user-facing copy is British English.

## If asked to convert this to Next.js

Reasonable **after** the concept is validated, not before; it would match the
`urbansportsclub/cms` repo. Port `src/recommend.js`, `src/venues.js`, `src/coverage.js`
and `src/plans.js` unchanged — they are pure functions — and keep the tests. `PORTING.md`
maps every integration point.
