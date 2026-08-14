# Getting started — no engineering background needed

Written for you, Karim. Follow it top to bottom once; after that you only ever do step 5.

---

## 1. Get the project onto your Mac

1. In our chat, find the file **`usc-ula-pilot.zip`** and download it.
2. It lands in **Downloads**. Double-click it — you get a folder called **`usc-ula-pilot`**.
3. Drag that folder somewhere you'll find it again. **Documents** is fine.

---

## 2. Open it in VS Code

Open VS Code → menu **File → Open Folder…** → select the **`usc-ula-pilot`** folder → **Open**.

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
4. It asks for a repository name (`usc-ula-pilot` is fine) and whether it should be **private** —
   choose **private**.

Done. Your project is now on GitHub, and every future change can be saved with a message.

**From then on**, to save your work: Source Control panel → type a short message like
"made Ula's questions shorter" in the box → click **Commit** → click **Sync Changes**.

Or just ask Claude Code: *"save my changes to GitHub with a sensible message."*

---

## 6. How to ask for changes

Claude Code reads a file called `CLAUDE.md` in this project, which tells it everything about how
this works and what it must not break. So you can describe outcomes, not code.

Things that work well:

> The recommendation feels too pushy. Make Ula sound more like she's helping me decide than selling.

> Add a fifth question asking what time of day they usually train, and use it in the recommendation.

> Change the sample city from Berlin to Milan with realistic Milan venues and neighbourhoods.

> The mobile version of the recommendation screen is too long. Shorten it to the one decision.

> Add German as a second language, with a language switcher on the landing page.

> Show me what this looks like on a phone — take screenshots and let me see them.

**Always finish with:** *"then run the tests and tell me if anything broke."*

There are 31 tests covering the rules and the whole journey. They're your safety net — they catch
it if a change accidentally breaks something you weren't looking at.

---

## 7. Showing it to other people

Right now it runs only on your Mac. Three ways to share, easiest first:

| Way | What's involved |
| --- | --- |
| **Show it live** in a meeting, on your screen | Nothing extra. Just run it. |
| **Screenshots or a screen recording** | Ask Claude Code: *"walk the whole journey and give me screenshots I can put in a deck."* |
| **A web address anyone can open** | Ask Claude Code: *"deploy this so I have a link I can send to colleagues, and walk me through it click by click."* You'll need a free hosting account in your name; it's about 15 minutes once. |

For a stakeholder review, the live demo plus the `/admin/journeys` page is the strongest
combination — that page is the thing that turns the concept into a measurable experiment.

---

## The demo path worth rehearsing

1. Landing page → tick the marketing box → any email → **Find my fit**
2. Answer Ula's four questions. On one of them, type instead of clicking — try
   *"realistically about twice a week"* — so people see it handles real language.
3. On the recommendation, press **Change** on the frequency answer and let them watch the
   recommendation update. This is the moment that lands.
4. Press **Save and exit** → choose an email preference → copy the resume link → open it in a
   **private window**. Everything comes back. This is the second moment that lands.
5. Show `/preview/email` — note the marketing content only appears because consent was given.
6. Finish through details and payment.
7. End on `/admin/journeys`.

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
