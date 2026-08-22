# Why each rule exists

`CLAUDE.md` states the rules in one line each. This file is the reasoning: the specific bug,
review finding or user quote behind every one. Read the entry before you change something a
rule covers — most of these were written *after* the mistake, and several were written twice
because the first fix caused the opposite bug.

Numbering matches `CLAUDE.md`. Nothing here is a suggestion.

---

1. **The rules choose the plan, never the model.** `src/recommend.js` owns the recommendation. The
   AI layer in `src/urby.js` may only acknowledge a free-text answer and rephrase an explanation the
   rules already produced. It must never introduce a number, price, plan name or venue name — there
   is an output guard that rejects this, and it should stay.
2. **The journey works with no AI.** With no `ANTHROPIC_API_KEY` everything functions on rules and
   keyword matching. AI calls time out at 3.5s and fall back. A demo must never hang on a model.
3. **The journey works with no JavaScript.** Every action is a real form POST. Option cards are real
   radio inputs. `public/app.js` is progressive enhancement only. Do not move core flow into JS.
4. **Every recommendation can explain itself.** Each rule that fires appends a reason; the
   "Why this fits" list renders those reasons. If you add a rule, add its reason.
5. **Marketing consent is separate from accepting Terms**, optional, and unchecked by default.
   Marketing content only appears in the follow-up email when consent exists.
6. **Every fact is traceable, and anything approximated says so.** `data/plans.json` carries a
   `sources` map of the pages each price and rule came from; `data/venues.json` carries each venue's
   own `url` plus a `_note` naming the two things that are NOT from the source — the coordinates
   (approximated from the street address, so distances are indicative) and the short blurbs. The
   demo banner and the "simulated payment" notices stay, because the payment really is fake.
   Venue photographs load from Urban Sports Club's own media bucket at runtime; three venues also
   carry an inlined photo from the supplied designs, so a card is never empty offline.
7. **No second auth system.** Resume is one unguessable token in a URL. Do not build login.
8. **One decision per screen.** If a screen starts feeling busy, reduce it. Questions with more
   than four options render as a compact grid for this reason.
9. **At most one main CTA visible per screen.** A "main CTA" is a filled black button. Everything
   else — Ask, Back, Save and come back later, compare, demo tools — is a secondary or link style.
   This is a hard rule from Karim. `standalone/` is checked by a script that walks every screen at
   1440x900 and 390x844, opens every disclosure, and fails if any screen shows two. Two things
   have broken it before: an inline `style="display:flex"` on the mobile `.sticky-cta` (it beat the
   desktop `display:none`, so both CTAs rendered), and giving a secondary action `.btn--primary`.
10. **A question fits on one screen.** Four options plus the CTA must be reachable without
   scrolling at 1440x900, 1280x800, 900x1000 and 390x844. Free text stays collapsed behind
   "Answer in my own words instead" on every viewport.
11. **Never ask twice.** If an email or a consent decision has already been given, no screen and
   no modal may ask for it again. The exit modal has three states for exactly this reason:
   ask for an email, ask for consent, or ask for nothing and play back what Urby heard.
12. **Urby's job is two-sided.** She answers from approved sources, and she records what the
   visitor actually wanted — `intentProfile()` in `standalone/template.html`. It reads back only
   evidence (answers, free text, questions asked, venues opened, plan switches, cities we do not
   cover). The unserved wants are the valuable half: they surface on the journey-data page under
   "Wants we could not serve". Never let that list be inferred or padded.
13. **Coverage is the promise, and it must be countable.** The question the pricing page never
   answers is "which places near me can I use, for what I actually do?". `src/coverage.js` answers
   it by counting the per-plan visit limits each venue publishes — never by estimating. `upsell()`
   may only offer a plan that opens at least one *named* venue the visitor said they would use, and
   `downsell()` exists so that recommending up stays credible: if a cheaper plan loses nothing, say
   so. Any number rendered in the coverage block must be reproducible from `data/venues.json`.
14. **The recommendation screen leads with value, never with a price.** Karim's words: a page that
   opens with "pay this" *"feels like a scam"*. The order is fixed and tested
   (`tests/browser/value-before-price.py`): **the places → what else is included → the week they
   make → why this plan → the counted coverage → Ask Urby → the small print.** It opens on the
   places because they are the thing being argued for; four cards of reasoning before them made
   the page open on the argument instead. The reasons are still there, compressed to a list and
   moved under the week, where they read as support rather than as a wall. The plan and its price live in the sticky right column on desktop and in
   a bottom bar on a phone, so they are always reachable and never the opening argument.
   `src/weekplan.js` builds the week from the answers only: the session count *is* the frequency
   they gave, every venue is real with its real distance, and a session outside their plan says so
   and names the plan that covers it. `perSession()` is plain arithmetic — price ÷ visits a month.
15. **Answers are always visible and always editable, as chips.** `answerChips()` renders every
   answer given so far at the top of the question screens and the recommendation, and each chip is
   its own edit control. A tester went looking for her earlier choices and could not find them —
   they were in a side panel that only displayed them and a disclosure at the very bottom. Going
   back must keep the previous choice selected, so changing an answer is a change, not a restart.
16. **The early questions own the screen.** No side panel, no open Ask box on the first questions —
   the same tester called them a distraction. Ask Urby is one quiet line that expands in place, and
   what we found nearby appears inline only once an area has been given. On the recommendation, one
   section is open by default (why this plan), the coverage detail and the small print are
   collapsed, and four venue cards show at a time. `tests/browser/first-steps-calm.py` counts these.
17. **The reasons must be about the plan on screen.** `reasonsFor()` recomputes every plan-specific
   line for the plan currently chosen. The rules' own reasons argue for the plan *they* picked, so
   rendering them under a different plan's heading made the page say "Why Classic" above four
   bullets about Premium. When the chosen plan is not the recommendation, the block is titled
   "What X means for you" and carries one line back to Urby's pick.
18. **The week is theirs to change, but it is never a booking.** Days are pickable (7 toggles,
   minimum one), and picking them *sets* the frequency answer — so the plan, the price and the
   per-session figure all follow the schedule, which is the honest direction of causation. A session
   can be swapped to another real venue for that activity. There are no times and no reservations,
   because we have no live timetables; the footnote says so.
19. **Holding an email is not permission to keep it.** `S.email` is the address we hold;
   `S.saveOptIn` is the separate fact that the visitor *asked* us to keep their progress. Only the
   landing form and the save screen set it. The membership email on the details form must never
   flip a guest into "Saved to you@example.com" — an external reviewer found exactly that, and it is
   the kind of bug that costs a demo its credibility. The details field is labelled "Email for your
   membership" and says what it does not do.
20. **Validation belongs to the screen that produced it.** `go()` clears ERRORS, FIELDS, NOCHOICE and
   UNCLEAR, because the save screen's email error was appearing under the details form's own field.
21. **Option cards are native inputs, focusable and full-size to the browser.** The input is
   visually hidden with the clip technique, never `opacity:0;width:0`, and the label carries no
   tabindex. That is what makes Tab, arrow keys within a radio group, Space, and screen-reader
   checked-state announcements work. `tests/browser/review-findings.py` asserts all of it.
   **Every card in the app uses the same shape**, including the payment methods: the tick lives
   *inside* `.option-card__icon`, and `.option-card` is `position: relative`. The payment cards
   were the last two left on the old markup, and when the tick became `position:absolute;inset:0`
   they had no positioned ancestor — so the tick painted a full-page black circle over the payment
   screen. `tests/browser/layout.py` now walks the payment and plans screens and fails on any
   element wider than 1.3 viewports, or any tick outside its icon.
22. **A tier above the frequency floor needs evidence, and never sells an unused advantage.**
   Two rules used to bump on a keyword ("you said unwind, so Classic"), which recommended 75 € to
   someone going once a week and then priced it at ~20 € a visit on the same screen. Those are gone.
   A bump now requires a named venue the cheaper plan does not include (`activity-not-covered`), and
   `no-upsell-without-benefit` runs last and undoes any bump when a cheaper plan opens exactly the
   same places. That is why 'daily' no longer forces Max.
23. **The upgrade names what you gain, not just how many venues.** Benefits come from
   `plans.json.benefits`, quoted from the public pricing page (online classes, video on demand,
   wellbeing apps, merchandise voucher, Plus check-ins including massages).
24. **The steps carry nothing but the question.** No side panel, no Ask box, no venue cards, no
   "what we found" strip on the four questions. Ask Urby lives on the landing and the recommendation.
25. **The landing says what you get, once, and the email is not a toll gate.** Karim's boss would
   not hand over an address to see a recommendation and did not know what he would get for it —
   the third time that has come back in three reviews. So **the email field is optional and
   `Find my fit` works with it empty**: an empty field is a choice, not a validation error, and
   there is no second "start without an email" control to choose between. We ask again on the save
   screen, once there is something worth keeping. The layout is Karim's August 13 one: hero line,
   one sentence of what this is, the "Not sure where to start?" block saying what happens next and
   that no email is needed, the field with **Find my fit**, one line on what an address buys you,
   consent, terms, "Already know what you want? View memberships". Nothing else, and each thing
   said once — earlier versions said the same thing four ways.
26. **Never state an assumption the visitor cannot correct.** The detected city is shown as
   "Looks like you're in Berlin" with a Change link, and Change tells the truth about what the
   pilot can show rather than pretending to cover every city.


## Where the design came from

The visual design was supplied by Karim as screenshots (desktop landing, the Urby question screen,
the follow-up email, mobile landing, mobile question screen, and the "Before you go" modal). The
colours in `public/styles.css` `:root` were sampled directly from those images, and the venue and
hero photography was extracted from them. Keep the designs recognisable; sensible responsive
adaptation is preferred over pixel-for-pixel copying where that would hurt usability.

Venues without a photo intentionally render a branded yellow icon tile. Real photos can be dropped
into `public/images/` and referenced from `data/venues.json`.

## The wider Urban Sports Club context

Established from their Confluence, and relevant when anyone asks "how would this ship?":

- **Landing pages are Contentstack content rendered by a Next.js app** (`urbansportsclub/cms`),
  composed from modular sections in `src/ui/components/sections`. Contentstack already supports
  A/B testing pages.
- **The platform monolith is USCWEB** — PHP 8 (Phalcon) + Postgres. Documented policy is to reach
  monolith data through the **BFF API (RFC-58)**, not the database. New work stays out of the monolith.
- **Precedent exists**: the *Web Offer Search MVP* is a standalone Next.js app for logged-out
  discovery. This project is its conversational sibling — coordinate, don't duplicate.
- **Payments** are Adyen. **CRM** is HubSpot. **Experiments** run on Statsig / GA.
- There is already an epic for a **Member Growth Service** (`PDR-96`) — the natural production home.

`PORTING.md` maps every integration point. Read it before proposing architecture changes.

## If asked to convert this to Next.js

It was built dependency-free because the environment it was written in had no access to the npm
registry, and because one command is the right ergonomics for a non-technical owner. Converting to
Next.js + TypeScript would match the `cms` repo and make it directly liftable — a reasonable move
**once the concept has been validated**, not before. If you do it: port `src/recommend.js`,
`src/venues.js` and `src/questions.js` unchanged (they are pure functions), keep the tests, and
reuse `porting/nextjs-sections/` as the pattern for components.

## Conventions

- ES modules, `.js`, no TypeScript in the pilot (the `porting/` folder is the exception).
- Files/folders `kebab-case`, components `PascalCase`, variables `camelCase`, constants
  `UPPER_SNAKE_CASE` — matching the CMS repo's guide.
- Comments explain *why*, not *what*. There are several in this codebase explaining product
  decisions; keep that habit.
- All user-facing strings are British English ("realise", "favoured", "neighbourhood").

27. **One line, one card.** An option card is icon, label, and a check — on one
    line. A two-line tile makes four choices look like eight and pushes the CTA
    off the screen. Scope every `.options--*` override to `.options--x .option-card`;
    an unscoped `.option-card` rule silently restyles every question in the app.
28. **A receipt, not a headline.** Confirmations of things the visitor already knows
    — their own email address, that progress is saved — are the smallest type on the
    screen and never compete with the question.
29. **Home and work.** Where to search accepts two answers, and distance is measured
    from whichever one is nearer. When we still come up short we ask for the place
    they wish were there and record it as demand, instead of widening a radius
    silently.
30. **Story order.** The recommendation reads: why this fits you, the week that
    follows from it, the real places, then the counting. Price sits alongside, never
    first.
31. **The commitment is part of the price.** Monthly / 12 / 24 months sits next to
    the number it changes, not in the small print — and it is what unlocks the app
    catalogue, so say that where the apps are.
32. **Never offer an alternative that opens nothing.** A cheaper plan that covers
    none of their places is not a saving, it is a trap. When the cheaper tier loses
    everything, compare upwards instead.
33. **Say a thing once per screen.** Urby used to repeat the previous answer back as a
    chat bubble on question two. The answer chips above it already showed it, so the
    screen stated the same fact twice and pushed Continue below the fold. She
    introduces herself on question one and then gets out of the way.
34. **A comparison table is a grid, not four columns of different lengths.** The plan
    cards stretch to one height, the badge slot is reserved in every card so the four
    names sit on one line, and every CTA lands on the same line — a column that ends
    120px short of its neighbour reads as broken. The chosen commitment is highlighted
    in the brand yellow, not filled black: a black pill among four cards reads as a
    fifth CTA. Say the commitment once, on the toggle, not again in all four cards.
35. **No orphaned words.** Ledes and standfirsts carry `text-wrap: balance`, so a
    sentence breaks into even lines instead of a full line and one word alone.
36. **The check-in allowance is a hard constraint, and the last word.** `monthlyAllowance()`
    reads it from the published data — Essential is 4 a month in total, every other plan
    is one a day. `frequency-allowance-floor` runs after every other rule and may not be
    overridden: a plan that cannot carry the visits someone told us about must never be
    recommended for them. `downsell()` walks up from the cheapest and skips plans that
    cannot carry the frequency, so "cheapest with the same coverage" can never mean
    "cheapest and unusable". `perSession()` divides by `min(visits wanted, visits
    permitted)`; dividing 35 € by 8 on a plan that allows 4 produced "about 4.40 € a
    session", which an external reviewer found and which would have discredited every
    other number on the page. `tests/allowance.test.js` walks frequency × activity ×
    area and asserts the recommendation can always be used as promised.
37. **Only one link is shareable, and it is the one that carries the answers.** The route
    lives in `history.pushState` state, never in the address bar. Writing
    "#recommendation" minted URLs that looked like deep links and silently dropped
    someone on the landing page. Anyone arriving on an old route hash is told plainly
    that the link points at a step rather than at their answers.
38. **Figures are a type role.** Prices, counts, distances and visit numbers carry
    `tabular-nums`, so columns of numbers align and swapping 75 € for 59 € does not
    shift the words beside it. From the frontend-design method: typography carries
    meaning for data as much as for headlines.
39. **The week is the signature.** No pricing table can show someone a week, so the
    week block is the one place boldness is spent: seven days, always visible, the ones
    they would go filled, and it is its own control rather than a list with a picker
    behind a link. Everything around it stays quiet. The chosen days are brand yellow,
    not filled black — black chips counted as main CTAs and broke rule 9.
40. **Reduced motion includes the motion you wrote in JavaScript.** The simulated "Urby
    is typing" beat is skipped entirely when the visitor's system asks for less motion.
    CSS turning animations off is not enough when the delay lives in a `setTimeout`.
41. **State what an option costs, not only what it saves.** A cheaper alternative that
    cannot carry their week says so on its own card. And never head a richer plan "if
    you want more places open" when it opens exactly the same places — that is the
    upsell version of rule 32, and it shipped once.
42. **The places are a rail you can open.** Six or ten venue cards in a horizontal,
    scroll-snapped rail with each card's plan tier on it, and one link to lay them all
    out as a grid. The rail is the same component on a phone, which is one of the few
    parts of this page that already survives the small screen. The per-session figure
    is stated once, in the plan column — it was in the week block as well.
43. **Two sections in the story column, not six.** Karim: "I don't know why you made so
    many containers, I want simplicity." The main column holds the places and the week,
    separated by headings and space rather than a border each. The plan, why it fits and
    what it opens are one argument, so they live together in the plan column — which is
    also what fixed the seam where "from your four answers…" ran straight into "Classic
    gets you into 2 of the 4 places" and read as one broken sentence. The primary CTA
    stays above that reasoning; the reasoning is support, not a gate.
44. **A rail needs its explicit template cleared.** `.venue-grid--big` sets
    `grid-template-columns: repeat(3, minmax(0,1fr))`. Inside a horizontally scrolling
    rail those tracks resolve to zero, so the first three cards rendered 2px wide and
    833px tall while only the implicit tracks looked right — which is why the carousel
    appeared to hold four venues. The rail sets `grid-template-columns: none` and a
    fixed `grid-auto-columns`.
45. **Support goes behind the choice, not in front of it.** Karim's boss could not find the second
    membership option: it sat under ~600px of reasoning in the plan column. The order there is
    price → term → benefits → CTA → the alternative → **"Why X for you" as a disclosure, closed**.
    That also halved the plan column (1212px to 831px), so it can actually behave as a sticky
    column. Tests that read the coverage caveat or the activity-by-activity detail have to open
    that disclosure first.
46. **When an interaction changes the recommendation, say so at the moment it happens.** Karim's
    boss played with the day strip and never realised the plan on the right was following him.
    Tapping a day now prints what moved, in the two numbers that moved: the plan if it changed,
    otherwise the per-session price, otherwise "no change". Clear `S.chosenPlanId` when the
    frequency moves and the plan is not overridden, or the note reads the stale id and announces
    the plan they just left.
47. **The guide is Urby.** Renamed from Ula on 13 August, at Karim's request and matching
    the PM session (Guy and Cristiano both preferred it). One replace across
    `standalone/template.html`, `src/`, `server.js`, the tests and the docs; the internal
    CSS class names (`.ula-section`, `.ula-demo`) were left alone because they are ids,
    not copy.
48. **Every ancestor of a scroller needs `min-width: 0`.** A grid item defaults to
    `min-width: auto`, so the venue rail's 2,500px of scroll content was forcing its
    whole column wide — and on a phone the layout viewport with it, which zoomed the page
    out and made the carousel feel broken. `.two-col__main`, `.reco-tail`, `.places`,
    `.card` and `.week` all carry it.
49. **A scroller needs a visible way to scroll.** The rail always worked with a trackpad
    and never with a mouse, because there were no arrows and the scrollbar is an overlay.
    Arrows appear under `@media (hover: hover) and (pointer: fine)`; a touch device
    already knows how to swipe.
50. **How far we looked is a control, not a fact.** Walking distance / 8 km / all of
    Berlin, with the count of what was found beside it. Changing it rebuilds the week and
    lets the rules re-pick the plan, because both follow from what is in range.
51. **A sticky column must fit the viewport or scroll itself.** `max-height: calc(100vh -
    44px)` and `overflow-y: auto` — otherwise the bottom of the plan column is
    unreachable until you have scrolled past the whole page, which is what Karim hit. It
    must also be *reset* at the mobile breakpoint: left sticky and clipped there, the plan
    column became a small inner scroller sitting on top of the fixed price bar.
    **And fitting beats scrolling.** Karim: *"is it possible to make this side bar smaller
    vertically — more compact in terms of design, not just make everything smaller."* The
    honest fix was pairing rows, not shrinking type: the name shares a baseline with the
    price, the term shares a line with the per-session figure, the three benefits wrap
    instead of stacking, the small print shares a line with the way out to all four plans,
    and in the alternative the price difference sits in the headline row with the name and
    the price rather than owning a row of its own. Same facts, same type scale, 864px down
    to 626px — which is the first time the column fits a 1280×800 window without an inner
    scrollbar at all.
52. **Every dynamic line is recomputed from the state selected now.** A reviewer changed the
    days, read "three days a week brings Classic to about 6.30 € a session", then switched to
    Essential — and the line stayed, naming a plan he had just left. It was true when written
    and false when read, which is the worst kind of wrong because it looks live. Switching the
    plan now rewrites that note from the plan that is current, or clears it. Rule 46 says say it
    at the moment it happens; this says *unsay it* the moment it stops being true.
53. **A choice the visitor made is never relabelled as advice.** The save screen said "Your
    Essential recommendation" to someone who had deliberately overridden Urby's Classic. A guide
    that quietly takes credit for your decision is a guide you stop believing on the decisions
    that matter — prices, limits, cancellation. It reads "The Essential membership you chose",
    and the sidebar badge already flips from "Recommended for you" to "Your choice".
54. **Three counts exist and only one of them is a match.** Places near you that do what you
    asked (`nearby`); of those, the ones this plan opens (`included`); and everything else in
    range, which is neither. The save screen was printing `match.venues.length` — the matcher's
    surfaced list — as "6 venue matches" to someone who had just read "Essential opens 1 of your
    3 places". Same for the places heading: it counts the exact matches only, and where the
    padding starts there is a visible seam. Never call an adjacent venue a match.
55. **Consent needs something to attach itself to.** The marketing checkbox could be ticked with
    the email field empty, promising email to someone who had given us no way to send it — and
    it filed an unasked question as answered, burning rule 11's one shot so the save screen never
    asked. The row appears when an address is typed and folds away (unticked) when it is cleared,
    and `S.marketingAsked` is only set when there was an address. Note `display: flex` beats
    `[hidden]`, so the row needs `.consent-row[hidden] { display: none; }` or none of this works.
56. **Amends 50: the radius is measured, not named.** "Walking distance" was the first option and
    nobody could say whether it meant 1 km, fifteen minutes, or from where. The options are 3 km /
    8 km / all Berlin, and because `auto` widens when it cannot find three places inside 3 km, the
    count line states the radius that actually got used.
57. **The demo banner collapses; it does not disappear.** It was the loudest thing on every screen
    and said the same sentence every time, but nobody may mistake a simulated payment for a real
    one. Collapsed it keeps "Pilot demo" and the build stamp, both as real elements rather than
    `::before` content so a screen reader and a test can still read them, and the choice persists
    in `localStorage`.
58. **Nested progress is drawn nested, and only the inner counter gets a number.** Karim:
    *"some people said it's weird that we have step 1 of 3 and 1 of 4 at the same time."*
    Both were true — four questions inside step one of three — but they were drawn as peers:
    two tracks of similar weight, stacked, each with its own "x of y". So the sub-progress
    moved inside the thing it belongs to. Step 1 of the stepper now carries four small
    segments under its label — answered ones filled, the current one mid-grey — and the line
    below keeps `Question 2 of 4` but loses its bar and drops to 13px. One journey bar, one
    question count, and the geometry says which contains which. On mobile there is only ever
    one bar, so the questions nest inside its first third: finishing the fourth question is
    what completes step 1, which the old flat `step / 3` fill claimed before a single
    question had been answered. The segments are `aria-hidden`; the visible count is the
    accessible one.
59. **The signup age requirement is enforced, not merely suggested.** Urban Sports Club signup
    requires the member to be at least 18 years old. Date of birth therefore has a latest valid
    date of exactly 18 years before today, as well as a defensive earliest date 120 years ago.
    The typed value is re-checked on submit because the form is `novalidate` and input bounds
    alone only guide the browser widget. The checkout explains the 18+ requirement beside the
    field so a visitor knows why the information is needed.

    Also, rule 33 applied to the longest page we have: the landing panel asks *"Not sure where
    to start?"* and the Urby section a scroll below it asked the identical question again.
    Two asks of the same question read as persuasion repeating itself rather than the page
    moving on, so the lower heading became *"Start with one answer."* — the eyebrow and the
    avatar already say whose section it is.
60. **Reasons argue out loud; only the long tail folds.** A review of the recommendation page
    asked for a shorter page and listed twelve default-visible blocks. Four of those were
    already collapsed — the app catalogue, the small print, the partner request, and the
    reasoning — and the same review asked for the reasoning to be *visible*, which was the
    useful half of it. Rule 45 put support behind the choice for a real reason (Karim's boss
    could not find the second membership option under ~600px of it) but the fix overshot: the
    plan column ended up showing a price, three benefits and a chevron, and rule 17 says the
    reasons on screen must argue for the plan on screen. A closed drawer does not argue. So
    the head of the argument is stated outright — the first two reasons, plus the way back to
    Urby's own pick when the visitor has overridden it — and the tail stays folded in
    `.planbox__more`: the remaining reasons, the caveats, and coverage activity by activity.
    Two reasons is also the most the sticky column can carry and still fit inside the
    viewport (rule 51); at 1440×900 it measures 825px against 856px available.

    Two things were declined. **The week stays open.** It is the only thing on the page a
    pricing page with a postcode filter could not produce, and the number of days chosen is
    what selects the plan — collapsing it would leave venues, a price and a paragraph, which
    is the page this pilot exists to beat (rules 18 / 39). And the block *count* is the wrong
    measure: twelve is only too many when every block makes a claim of the same size, and here
    two carry the argument while the rest are already folded.

    What did come down was the tail and the duplication. **Ask Urby folds** on the
    recommendation only — there it is the last thing below the decision and the least likely
    to move anyone, so it costs a click instead of a screen. It renders itself `open` whenever
    there is an answer on screen, or submitting a question would hide its own answer on the
    re-render. On a question screen it stays a live box, because there the ask is the whole
    point of the column. And the places footer said the distance twice: the selected chip read
    *3 km* one gap from a count reading *7 places found within 3 km*, with *See all 7* beside
    it. The chip owns the distance, the count owns the number, the button owns the verb — and
    the count names a distance only when the automatic radius had to reach past what the chip
    claims, which is new information rather than an echo (rule 33).
61. **The email is not a toll gate, so it is not on the front door.** Rule 25 already made
    the landing field optional and `Find my fit` already worked with it empty. It was not
    enough. A fourth review — the first from outside the team — said *"asking the user from
    the jump for an email could be asking for too much commitment from someone who just met
    the brand. Signing up for emails always means battling for weeks to get out of their
    lifecycle."* That is the same objection Karim's boss raised and the same one Cristiano
    raised in the PM session, which makes four in four reviews. "Optional" is a property of
    the form; being asked is what people react to, and no amount of small print under a field
    changes the fact that the first thing the page did was ask for something.

    So the field is gone from the landing page entirely, and with it the conditional consent
    row and the *"By continuing you agree…"* line, because nothing there collects anything
    any more — the Terms and Privacy links moved to the footer, where a page that makes no
    request can still carry them. The address only ever existed to power the resume link, and
    `saveScreen` already asks for it at the moment it buys something the visitor can see:
    their week, their plan, and a link back to both. Making it *smaller* was considered and
    rejected — a smaller ask is still an ask, and it would have cost the page its one clear
    action while answering nobody's objection.
62. **The front door offers instead of asking.** The same review: *"I wanted to view venues
    but I couldn't find a way to look up my local yoga studio to see if it's available on
    USC."* The pilot had no answer to the most common real-world question about this product.
    Worse, it *invited* the question and then dropped it: the only field that accepted a place
    name was the partner request under the venue rail, which files the name as demand for the
    partnerships team and tells you nothing. Asking someone to name their studio and then not
    saying whether it is included is the search version of a broken link.

    What replaced the email field is a search box, which is also the answer to the other half
    of that review — *"I did not really know where to begin"*. A search field is the most
    familiar control on the internet; a wizard with a field in it is not. The guide sits
    directly under it as the way in for anyone with no name to type, which is also the shape
    the Urban Sports Club design team is exploring from the other direction: browse first,
    with a *help me choose* tool one tap away. This journey is that tool.
63. **A search answers with a membership, not with a venue.** `searchPlaces` handles three
    shapes of query — a name, a thing, a place — and every row it returns ends in the cheapest
    plan that opens that venue and what that plan costs. A finder that stops at *"yes, we have
    that"* is a directory, and the argument of this whole journey is the join between the
    place and the price. The matching is the same deterministic pass over `data/venues.json`
    the recommendation uses, so it works with no AI key and cannot invent a venue (rules 1
    and 2), and it never prints a distance it cannot stand behind: with no area to measure
    from, a row says *in Berlin* rather than a number counted from the middle of the city
    (rule 6). A miss says how many venues this pilot actually has loaded, so nobody reads a
    gap in the sample as a gap in Urban Sports Club — and it still collects the name (rule 12).
    A search that recognised an area fills that answer in on the way into the guide rather
    than asking for it twice (rule 11); it arrives as an editable chip, not as a silent
    assumption (rules 15 and 26).
64. **A recommendation contains its alternatives.** *"I clicked around and it offered me a
    plan of 115 € which is quite expensive. How do I see all the plans? Update: I found it
    after reading the card. I did not expect to see Compare on the plan card."* Karim's
    instinct was that nobody compares all four and the guide should just serve the closest
    fit. The review is what happens when that is wrong: the reviewer went back to the
    homepage several times hunting for a price list, which is a person leaving the funnel to
    look for a number they will find on somebody else's page. At 75–165 € a month comparing
    is default behaviour, not a niche need, and hiding the comparison does not prevent it —
    it relocates it.

    So all four plans sit inside the plan card, one tap from the recommendation, as a four-row
    grid: name, price at the term selected now, and *what each one opens near this visitor* —
    the one column a published pricing table cannot fill. It stays a disclosure rather than a
    grid on the page, because rule 16 keeps the end of this screen calm, and the row for the
    plan on screen is labelled *your choice* when the visitor picked it and *recommended* only
    when Urby did (rule 53). The separate `plans` screen stays, reachable from the landing and
    from the bottom of the table, for everything each plan includes.
65. **On a phone the plan leads and the places fold.** *"Especially on mobile, which is how
    I'm viewing the prototype. There are too many buttons and options."* Stacked in DOM order
    the recommendation put a twelve-card venue rail, a week, and a fold of apps between the
    visitor and the answer to *what does this cost* — a desktop reads the plan column beside
    the story, and a phone has nowhere to put it but underneath. So `MOBILE()` orders that one
    screen by viewport as well as by state: the plan card moves up directly under the answer
    chips, and the story follows it.

    Two things were held. **Value still comes before price** (rule 14), so the plan card now
    carries *what it opens near you* on the card with the number, not two folds below it. And
    **the week does not fold** (rule 60) — it sits immediately under the plan card, because it
    is the argument for the figure just above it. What folds is the long tail: the places
    section becomes a disclosure whose heading keeps the count, since a fold that does not say
    what it is hiding reads as an empty section. It is open and inert above 980px, where the
    room exists — a heading must not become a control on a screen with no reason to collapse
    anything. Because the render now depends on the viewport, a resize that crosses the
    breakpoint re-renders, preserving scroll position.

    The rail's arrows moved from beside that heading down into the places footer, next to
    *See all* and the radius chips: a button inside a `<summary>` either swallows its own
    click or toggles the section by accident, and all three are answers to *show me more*.
66. **The front door asks the question instead of pointing at it.** *"I like this more… just
    the two choices at the bottom don't look too nice… we don't need the extra question below."*
    The panel held a search box, then a paragraph explaining the guide, then a button to start
    it — three objects standing between arriving and doing anything — and the guide's first
    question sat a full screen below the fold, where the same page also asked *Not sure where
    to start?* for a second time. Two of those things were arguments for a question we were
    perfectly able to just ask.

    So the question came up into the panel with its three answers, and everything that had been
    standing in front of it went behind it. The cards are the first question, not a menu:
    choosing one answers it and lands on the second (rule 11). The way in for anyone who is
    none of those three is a link on the hint line, which opens the same question with its own
    words field — so there is still exactly one route into the four questions, and the section
    below the fold now carries only the thing the panel cannot do: take a question of your own.
    The search box is one tap behind the question rather than in front of it; rule 62's point
    survives, because the front door still offers rather than asks.

    Then the first build got the weight backwards. *"The three buttons are not clear enough —
    I really wanted to click on find a venue and compare plans, which as a PM I didn't want
    them to push. The box with the black button was a clear CTA; here it became confusing."*
    Three hairline cards on a yellow field lost to two outlined pills underneath, because the
    outline was the strongest edge on the page and the eye takes the strongest edge as the
    action. The cards took the black border and the lift and fill black under the cursor; the
    two ways past them gave up their outline and became one quiet underlined row beneath a
    rule. Rule 9 is intact — nothing is filled black at rest, and only one thing is being
    offered. The ranking of an action is set by its edge, not by its position on the page.

67. **The reasoning folds, because the card argues in numbers.** *"Could you make this section
    collapsed by default."* — Karim, 14 Aug, pointing at *Why Premium for you*. Rule 60 had
    opened it for a real reason: rule 17 says the reasons on screen must argue for the plan on
    screen, and at the time the plan column was a price, three benefits and a chevron, which
    argues nothing. That is no longer what the column is. Rule 64 put what the money opens on
    the same card as the money — the price, the cost per session, and how many of the places
    near this visitor the plan includes — so the card makes its case in figures before a word
    of reasoning is read. The words are the working, and working belongs behind a heading.

    So the whole argument now sits in one disclosure titled *Why Premium for you, and what it
    opens near you*: every reason, the caveats, and coverage activity by activity. One fold,
    not the fold-inside-a-fold it had become, which is also the honest fix for rule 51 — the
    sticky column now fits at every height rather than fitting by rationing itself to two
    reasons. Two things stay outside it, because a closed drawer cannot offer them: the way
    back to Urby's own pick when the visitor has overridden it (rule 53), and the line saying
    the answer came from their four answers and each plan's published access rules (rule 6).
    Supersedes rule 60's placement; rule 60's principle — a closed drawer cannot argue — is
    what the plan card is now required to satisfy on its own.

68. **The app catalogue sits with the places, not at the end of the page.** *"Move the app
    section below the venues."* It had drifted to the closing tail, under Ask Urby, on the
    argument that nobody joins for the apps. True, and beside the point: it answers the same
    question the places answer — *what can I actually use* — and a whole conversation panel
    standing above it made it read as an afterthought tacked on after the goodbye. This is
    rule 14's published order restored (*the places → what else is included → the week*), not
    a new one. It keeps the shape rule 61 gave it: a claim, four apps chosen from the answers,
    the rest behind *See all*. The tail is now Ask Urby and the small print, which is the
    right thing to leave someone with.

69. **A search reaches the one place you had in mind.** *"I was thinking the venues should have
    search in case I want something specific."* The four questions describe a habit; they are
    the wrong instrument for *is my studio on this*. That question already had an answer on
    the front door (rule 63) but not once you were inside the recommendation, where re-asking
    it meant leaving the page you had just been given.

    So a field sits between the places heading and the list, and filters as you type. It
    searches the whole pool inside the current radius, not only the twelve on show, and it
    matches the way `searchPlaces` matches — the published name, the published activities, the
    area — so a hit here and a hit on the search screen are the same fact. Nothing fuzzy:
    a guess would be a fourth kind of count and rule 54 allows three. While a search is
    running the heading counts the search rather than the radius, the seam is dropped (the
    order is the search's, so it would be marking nothing), and the list becomes a grid,
    because results are read, not pushed sideways. When nothing within the radius matches,
    the way out is offered rather than implied: a wider radius, or the full search across all
    of the pilot's venues — which answers with the cheapest membership that opens the place.
    Every re-render puts the caret and the scroll position back, because a full re-render is
    what recomputes the counts (rule 52) and it must not feel like a page load.

70. **The recommendation is a card that argues, a week that folds, and one shelf for the
    rest.** *"I was thinking we need to simplify the recommendation page a bit… I like the
    collapsed week view… the sidebar is better but still a bit too much… comparing the plans
    is nice but hidden… the more information is nice."* — Karim, 14 Aug, over a mock of a
    simplified page.

    **The week folds.** This reverses rule 60's *"the week stays open"* and rule 65's *"the
    week does not fold"*, and the reason those rules gave is the reason it is now safe. The
    objection was rule 17: a closed drawer cannot argue. That is true of a drawer whose handle
    is a label. It is not true of a handle that carries the claim in full — *3 sessions ·
    Monday, Wednesday and Saturday. All suggested places are within 3 km.* The three things a
    visitor needs from the week are how often, which days and how far, and all three are on
    the outside. What is behind the fold is the working: which venue on which day, the access
    limit each one is subject to, the day picker and the swap. The week is still the argument
    for paying (rules 18 / 39); it is now an argument that fits on one line.

    Two mechanics keep it honest. It renders itself open while a day-change note is live, so
    a claim can never go stale inside a closed drawer (rule 46). And the open state survives
    the re-render (`WEEKOPEN`), because every interaction rebuilds the screen and a fold that
    closed itself every time you changed a day would be closing the thing you were editing.

    **The comparison comes out of hiding.** This supersedes rule 64's *"it stays a
    disclosure"*. Karim went looking for it and reported it hidden, which is the second time
    the same object has been reported missing — the reviewer who was quoted 115 € found it
    only by reading the card. It was a 13.5px summary on a closed drawer below the fold of a
    sticky column: present, and practically invisible. It is now simply on the card.

    That absorbed the separate *alternative* card, which was a second answer to "which
    membership?" in a different shape. Rule 32 exists because singling out one alternative can
    offer a trap — a cheaper plan that opens nothing. A table is not an offer: every row
    states what it opens near this visitor, and any row whose allowance cannot carry their
    week says so on the row (rule 41). The honest comparison is the default rather than a
    guard against a dishonest one.

    **One shelf, three rows that look alike.** The end of the page had a *why* fold inside
    the plan card, a conversation panel and a small-print disclosure — three folds that each
    announced themselves differently, which is most of what made that end of the page read as
    work. They are now three rows of one list under *More information*: the reasoning, Ask
    Urby, and the details and terms. The reasoning leaving the plan card is what made the card
    thin enough to hold the comparison. Rule 67 still governs why it may fold at all — the
    card argues in figures — and the one thing that never folds is still the way back to
    Urby's own pick (rule 53).

    **What the card lost**, in order of size: the separate alternative, the *why* fold, the
    plan's generic benefit list (the small print already carries it), and two prose lines
    saying what three facts now say once — *supports 12 visits a month*, *opens 6 of the 7
    places for gym near Mitte*, *about 6.30 € a session*. All three are numbers, all three are
    recomputed from the plan selected now (rule 52), and they run value before price on the
    one card that has to carry both (rule 14).

70. **Saving and signing up are two intentions, so they are two screens.**

    "Continue with Classic" landed on an email form. `go()` carried a redirect —
    `route==='details' && !S.email → 'save'` — so anyone who had not handed over an address
    by the time they pressed the plan's own call to action was sent to ask for one.

    That is rule 25 defeated one screen later. The address had been taken off the landing
    page precisely because four reviews called it a toll gate; putting it between the
    recommendation and the checkout makes it the same toll gate, collected further down the
    road, at the moment of highest intent. And it is unnecessary: the details form asks for
    an email anyway, as part of creating the membership.

    So the redirect is gone and the two paths are drawn apart.

    **Continue with [plan] → details.** Unconditionally. One filled button in the plan card,
    and the form it opens is grouped — *About you*, *Contact*, *Address* — instead of one
    seven-field wall. Beside it, a summary that stays put: the plan, the price, the term,
    what they chose it for, and three of the places it opens near them, with the way back to
    the recommendation under them. The headline says what the money opens before the first
    field is asked for, because rule 14 applies hardest on the screen where someone is most
    likely to wonder what all this typing is for.

    **Save and exit → save.** Reached from the exit modal, or from a quiet link under the
    plan's CTA — a link, not a second button, because rule 9 allows the screen one filled
    thing and that thing is the way forward. The screen carries no checkout stepper: drawing
    "2 of 3" above someone who has just decided *not* to buy today tells them they are
    mid-purchase. It shows what is being kept — the four answers as chips, the plan, the
    term, the count of places it opens, the places themselves — before it asks where to send
    it. Rule 53 still holds on the heading: *Your recommended membership* only if Urby picked
    it, *The membership you chose* if they did.

    Two consequences worth naming. *Continue without saving* now returns to the
    recommendation instead of dropping the visitor into the details form — the old
    destination only made sense while this screen was a gate across the checkout. And saving
    ends on the saved confirmation with the resume link, not on the details form: someone who
    asked to keep their fit and leave has not asked to start typing an address. The way back
    in is on that screen, because saving is a pause, not an exit.

71. **A way out that refuses to open is not a way out.**

    *Karim, 14 Aug, after the two flows were split:* "if I press Save and exit before
    referencing the first four questions, it doesn't get me to this page. It doesn't do
    anything."

    He was right, and the cause was a guard written for a different screen. `go()` sent
    `save`, `details` and `payment` back to `fit` unless the four questions were finished,
    because all three used to need a chosen plan. `save` no longer does — it is the way out,
    not a step of buying — so on question two the button quietly redirected to question two.
    Nothing moved, nothing errored, and the only honest reading from the outside was that
    the button was broken. Only `details` and `payment` are guarded now.

    Opening the screen is half the fix; the other half is that it must not lie once it is
    open. There is no plan at question two, no match, no price and no places, so it shows
    none of them. It shows the answers given so far as chips, one line saying which question
    they stopped on, and the shield line trimmed to what is actually kept: *Your answers and
    where you stopped will be saved.* The way back reads *Back to your questions*, not *Back
    to recommendation* — they have not seen one. *Continue without saving* returns to the
    questions for the same reason. And the saved confirmation drops its claim to hold "venue
    matches and recommendation" when it holds neither (rule 6).

    The layout changed with it. The recap was a 400px sidebar beside the form, which made
    what you are keeping look like a footnote to the ask; it is the entire reason to hand
    over an address, so it now takes half of one card and all of the cream, with the places
    large enough to recognise. The ask is the other half: a labelled full-width field with
    the black button *under* it rather than a pill with the button inside it, where two
    things of equal weight made neither look like the action (rule 9). Rule 53 survives as a
    small label above the plan name — *Your recommended membership*, or *The membership you
    chose*. On a phone the two halves stack in source order, so the recap still comes first
    and rule 14 holds.

72. **The recommendation is four things tall, and the first of them is their week.**

    *Karim, 14 Aug, with two screenshots:* "i want the recomendation page to look like this
    I share left half, and the second part or the side right bar."

    The page he drew is a story column of four things and nothing else: what he asked for
    said back to him, the week, and then three rows — the places, the apps, the questions.
    Everything about money is in the column beside it. Nine bordered boxes down one column
    became four, and the two that had to go were the ones the page could argue without: a
    twelve-card venue rail above the fold, and a shelf of three folds that each announced
    themselves differently.

    What each piece now carries:

    - **The hero says back what it heard.** *Your plan for moving and unwinding* names the
      goal; under it, one navy sentence — *You want to train three times a week while keeping
      time for recovery — all near Mitte* — is the four answers written as prose, so they are
      checkable at a glance. Every part of it is editable in the chips directly below (rule
      15), and the sentence is recomputed from the week actually on screen (rule 52): drop a
      day and "three times a week" changes with it. The chips' label became *You told us*,
      set as a sentence rather than a small-caps eyebrow, because it is the start of the
      sentence the chips finish.
    - **The week is open and it leads.** Rule 60 folded it and put the claim on the handle,
      because it was competing with a rail of venues for the top of the page. Nothing is
      competing with it now, so it is simply there: a cream card, one white row per session,
      each row carrying the day, the activity, the venue's photograph, the distance and the
      published per-venue limit (rule 13). What folds instead is *adjusting* it — the day
      picker and the swap links — which opens itself while a change note is live (rule 46).
      A session the plan on screen cannot open says which plan would, in the row as a pill
      and once more under the card: *Premium adds Hilton's pool and spa — the recovery option
      that completes your week.*
    - **Three rows, one shape.** An icon, the claim, the figure that backs it, and what you
      can do about it. *4 matching places near Mitte / All 4 with Premium · 3 with Classic*
      is the whole places answer on one line; the cards, the search (rule 69) and the
      distance control (rule 56) are behind it. *Plus 11 fitness apps* proves itself with two
      logos picked from the answers — two, not the four in the design, because the story
      column is 860px wide and a third name had to be cut short to fit, which proves nothing.
      *Questions and details* names its three sections on its own handle — the reasoning, Ask
      Urby, the terms — and each name is the way straight in, one open at a time (rule 16).

    Rule 14 holds throughout, with one change to the order in rule 68: the week comes before
    the places, because the week *is* the value and the places are the evidence for it.

73. **The cheaper option is in the open, and an option that opens nothing is not offered.**

    The right-hand column in Karim's second screenshot has two things under the plan card: a
    *Cheaper option* card with the next plan down, and *Compare all four memberships* as a
    fold. "Is there something cheaper?" is the question everybody asks, so the answer is not
    behind a drawer — and what the cheaper plan cannot do is on its own card, twice if twice
    is true: the allowance it runs out of (*Not enough for your 12-visit routine*) and the
    places it does not open (*opens 0 of 4 places*).

    His drawing gives that card a *Choose Essential* button even in the state where Essential
    opens nothing. That is exactly the trap rule 32 was written for, so it does not ship that
    way: a plan that opens none of the places they asked for keeps its numbers and its
    warning and loses its action, on the card and on its row in the comparison. It is
    information, never an offer. Everything else about the shape is his.

    The comparison starts open, because the complaint that produced rule 64 was that comparing
    the plans was hidden; closing it is how the column gets shorter, which is the other thing
    he asked for. On a phone it starts closed — there the plan card leads (rule 65) and four
    more rows under it push the week off the first screen. Every row states three things now:
    the price, how many visits the allowance permits against the week they asked for (rule
    36), and how many of the places they asked for it opens (rule 54).

74. **The venue page browses, and every control on it is one of Urby's questions.**

    Karim's design, 14 August: a page that opens with a search box, five activity shortcuts,
    a row of real places with a plan badge on each photograph, and Urby at the foot asking
    how often you would go. What it replaces was a page that could only answer a typed
    query — arrive with nothing to type and there was nothing to look at.

    Four things follow from the rules rather than from the drawing:

    - His heading says *Popular near Mitte*. The pilot holds no popularity data, so the
      heading counts instead of flattering: *Places near Mitte*, or *4 places for swimming,
      sauna & spa near Mitte* once a filter is on (rules 6 and 54).
    - The location line is an assumption, so it is labelled as one — *Looks like you're near
      Mitte, Berlin*, with a picker behind *Change location* — and the guess is never written
      into `S.answers`. Once they pick, the line says *Showing places near Kreuzberg* and it
      is their answer to the area question, so Urby does not ask it again (rules 26, 53, 11).
    - The five activity chips and the two dropdowns are not a menu beside the guide, they are
      the guide's own questions in another form (rule 66): the chips and the *All activities*
      select both write the activities answer, and the distance select writes the radius in
      km (rule 56). Which is why the foot of the page can say the answers back.
    - The panel at the foot asks whichever of *how often* and *what would you love to do more
      of* is still unanswered, and answering stays on the page. It is the one thing a row of
      places cannot tell us. `Save these places for later` sits under the action, not beside
      it, so the screen still has one filled black button (rules 9 and 71).

    The card is one shape doing two jobs. Browsing, the badge on the photograph names the
    cheapest membership that opens the place and the card ends in *View venue*; on a searched
    result the foot spells the join out with its price and the badge comes off, because
    naming the plan twice on one card is rule 33 with a picture attached. A search and a
    browse are never both on screen: two lists and two calls to action on one page is two
    decisions on one screen (rules 8 and 9).
