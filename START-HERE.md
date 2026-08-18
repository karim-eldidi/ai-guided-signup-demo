# Start here

This folder is the project. It lives on your Desktop at `~/Desktop/ai-guided-signup-demo`, so it
does not disappear when a session ends and you never have to attach anything.

---

## Every new session, do this

1. Start a new Cowork task.
2. Connect this folder — `Desktop/ai-guided-signup-demo` — when it asks which folder to use.
3. Paste this, with your changes in the list:

> Read `CLAUDE.md` in this folder, then make these changes. Run `npm run verify` at the
> end and tell me what changed in a few lines. Keep it cheap: verify once rather than
> running suites one at a time, no confirmation screenshots, skip the recap.
>
> 1. …
> 2. …
> 3. …

That is the whole ritual. `CLAUDE.md` carries the ~50 rules, the file map and the working
discipline. `DECISIONS.md` holds the reason behind every rule and is only read when needed.

**Why bother:** every step in a session re-reads the whole conversation, so the same work
costs four or five times more at the end of a long session than at the start. A fresh
session per batch of changes is the single biggest saving available to you. Nothing is
lost — it is all written down in this folder.

---

## Put several changes in one message

Five changes in one message costs roughly a fifth of five separate messages, because each
message triggers its own build-and-test cycle. Collect your notes, then send them together.

---

## Which model

Switch with `/model`.

| Sonnet is fine for | Use Opus for |
|---|---|
| Copy and wording | The recommendation logic, or any number on screen |
| Renames, moving things around | A bug you cannot explain |
| Updating tests after a change | Design and layout judgement |
| Deploying | Reviewing someone else's review |

The test: if being wrong means "redo it", Sonnet. If being wrong means shipping something
misleading, Opus. The bug where the page recommended a plan allowing four visits a month to
someone going eight times was worth Opus. Renaming Ula to Urby was not.

---

## Testing

```bash
npm run verify              # build + 58 unit + 11 browser suites, ~90s, one screen
npm run verify -- reco      # only suites matching "reco"
npm run verify -- --units   # unit tests only, ~1s, no browser
```

One command, not eleven — that alone was costing about ten times what it needed to.

---

## Deploying the live demo

`git push` is blocked in the sandbox, so the live copy goes up through the GitHub web UI.

1. `npm run verify` — this also writes a fresh `index.html` to the session's outputs
2. github.com/karim-eldidi/ai-guided-signup-demo → **Add file** → **Upload files**
3. Drop `index.html`, commit to `main`
4. Pages redeploys; the CDN caches about ten minutes

The black banner shows a build stamp like `build 13 Aug 13:25 UTC`. **Check it before
reporting a bug** — three times in this project a "bug" turned out to be an old cached
build. Hard-refresh with Cmd+Shift+R.

Claude can do steps 2–3 through the Chrome extension, but it costs about eight steps.
Doing it yourself is free and takes thirty seconds.

---

## What is in here

| File | What it is |
|---|---|
| `CLAUDE.md` | **Read first.** The rules, the file map, how to work cheaply. |
| `DECISIONS.md` | Why each rule exists — the bug or the quote behind it. |
| `standalone/template.html` | The demo. Every screen and all the logic, one file. |
| `standalone/build.py` | Inlines CSS, data and images into one shareable HTML file. |
| `data/*.json` | Real plans, venues and the App Catalog, with sources. |
| `src/` | Recommendation rules, coverage, week plan — shared and unit-tested. |
| `tests/` | 58 unit assertions and 11 browser suites. |
| `scripts/verify.mjs` | The one test command. |
| `PORTING.md` | How this would ship inside Urban Sports Club for real. |
| `usc-urby-pilot.zip` | A copy of everything, in case you want to send it to someone. |

---

## Where the work stands

Live and working:
- Non-tollgate landing page with instant venue search and "Find my fit" entry point.
- 4-question fit journey with natural language support and skip capabilities.
- Curated Activities gallery with match percentages, category filters, distance toggles, and carousel navigation.
- Calm, spacious "My week" routine builder with universal 7-day venue scheduling and session swapping.
- Deterministic membership recommendation with monthly/annual commitments and transparent alternative comparison.
- Universal 7-day venue scheduling with dynamic feedback notices.
- Save for later modal with unguessable resume tokens and cross-session restoration.
- Simulated checkout with order summary and terms.
- Multi-viewport responsive layouts (Desktop 1440px/1280px and Mobile 390px).
