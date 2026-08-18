# Getting started — no engineering background needed

Written for you, Karim. Follow it top to bottom once; after that you only ever do step 5.

---

## 1. Get the project onto your Mac

1. In our chat, find the project archive and download it.
2. Double-click it — you get a folder called **`ai-guided-signup-demo`**.
3. Drag that folder somewhere you'll find it again. **Desktop** or **Documents** is fine.

---

## 2. Open it in VS Code

Open VS Code → menu **File → Open Folder…** → select the **`ai-guided-signup-demo`** folder → **Open**.

If VS Code asks *"Do you trust the authors of the files in this folder?"* → **Yes, I trust the authors.**

You should now see the file list on the left: `server.js`, `data`, `src`, and so on.

---

## 3. Check you have the right Node version

The project needs Node 22.5 or newer. Claude Code needs Node too, so you probably have it — but
maybe an older one.

Open Claude Code in VS Code and paste this:

> Check my Node version. The project needs Node 22.5 or newer because it uses Node's built-in
> SQLite. If mine is older, tell me exactly how to update it on a Mac, step by step, assuming I've
> never used a terminal.

Then do whatever it tells you. This is a one-time thing.

---

## 4. Run it once

Paste this into Claude Code:

> Start the pilot and tell me the address to open in my browser.

You should get **http://localhost:3000**. Open it. You'll see "Your way to move."

To stop it later, just close the terminal panel at the bottom of VS Code, or ask Claude Code to
stop the server.

---

## 5. Connect it to GitHub

This is 4 clicks, no terminal.

1. In VS Code, click the **Source Control** icon in the left bar — it looks like a branching line
   (third icon down usually).
2. Click **Publish to GitHub**.
3. VS Code asks you to sign in to GitHub → do that in the browser window it opens.
4. It asks for a repository name (`ai-guided-signup-demo` is fine) and whether it should be **private** —
   choose **private**.

Done. Your project is now on GitHub, and every future change can be saved with a message.

**From then on**, to save your work: Source Control panel → type a short message like
"made Urby's questions shorter" in the box → click **Commit** → click **Sync Changes**.

Or just ask Claude Code: *"save my changes to GitHub with a sensible message."*

---

## 6. How to ask for changes

Claude Code reads a file called `CLAUDE.md` in this project, which tells it everything about how
this works and what it must not break. So you can describe outcomes, not code.

Things that work well:

> The recommendation feels too pushy. Make Urby sound more like he's helping me decide than selling.

> Add a fifth question asking what time of day they usually train, and use it in the recommendation.

> Change the sample city from Berlin to Milan with realistic Milan venues and neighbourhoods.

> The mobile version of the recommendation screen is too long. Shorten it to the one decision.

> Add German as a second language, with a language switcher on the landing page.

> Show me what this looks like on a phone — take screenshots and let me see them.

**Always finish with:** *"then run the tests and tell me if anything broke."*

There are 58 unit tests and comprehensive browser journey tests (`npm run verify`). They're your safety net — they catch it if a change accidentally breaks something you weren't looking at.

---

## 7. Showing it to other people

Right now it runs only on your Mac. Three ways to share, easiest first:

| Way | What's involved |
| --- | --- |
| **Show it live** in a meeting, on your screen | Nothing extra. Just run `npm start` or open `index.html`. |
| **Screenshots or a screen recording** | Ask your assistant: *"walk the whole journey and give me screenshots I can put in a deck."* |
| **A web address anyone can open** | Deploy to GitHub Pages: `index.html` at the repository root is automatically served by Pages. |

For a stakeholder review, the live demo plus the `/admin/journeys` page is the strongest combination — that page turns the concept into a measurable experiment.

---

## The demo path worth rehearsing

1. Landing page → search for a favourite studio or click **Find my fit** / **Start with one answer** (notice email is not requested upfront).
2. Answer Urby's four questions. On one of them, type instead of clicking — try *"realistically about twice a week"* or *"I live in 12045"* — so people see it handles natural language.
3. On the recommendation, explore the **Activities gallery** and **My week** routine. Tap **Swap** or add studios across any of the 7 days (`MON`–`SUN`).
4. Press **Save for later** in the top right → enter an email → copy the resume link → open it in a **private window**. Everything comes back instantly.
5. Finish through details and simulated checkout.
6. End on `/admin/journeys` (server mode) to view the funnel analytics.

---

## If something goes wrong

Paste the error into Claude Code and add: *"explain what this means in plain language and fix it."*

If it's badly stuck, the reset switch is:

> Reset the pilot database and restart the server.

That clears all test visitors. It never touches your code.

---

## Starting a *new* Claude session

Read **`START-HERE.md`**. Short version: long sessions get expensive because every step
re-reads the whole conversation, so start a fresh session for each batch of changes, attach
`usc-urby-pilot.zip`, and say "read CLAUDE.md, then…". Nothing is lost — it is all written
down.

And use one command for testing: `npm run verify`.
