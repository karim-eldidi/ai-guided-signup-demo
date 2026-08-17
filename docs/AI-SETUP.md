# AI environment setup

This repository uses one canonical instruction file: `AGENTS.md`. Platform-specific files are tiny
adapters so the same rules are not copied into every model's context.

## Files and ownership

| Environment | File it should use |
| --- | --- |
| Codex / coding agents | `AGENTS.md` |
| Claude Code | `CLAUDE.md`, which imports `AGENTS.md` |
| Gemini CLI | `GEMINI.md`, which imports `AGENTS.md` |
| VS Code GitHub Copilot | `AGENTS.md` plus `.github/copilot-instructions.md` |
| ChatGPT Project | project instructions below; add the GitHub repository or selected files as sources |
| Claude Project | project instructions below; use Claude Code for live repository edits |
| Gemini web / Workspace | create a Gem for the project; use Gemini CLI for live repository edits |

Do not create `agent.md`, `agents.md`, or `cloud.md`. The portable filename is exactly `AGENTS.md`;
Claude's filename is exactly `CLAUDE.md`; Gemini CLI's default is exactly `GEMINI.md`.

## ChatGPT Project

Create a project named **AI-guided signup demo**. Use project-only memory. Add the GitHub repository
or, if repository access is unavailable, add these files as sources:

1. `AGENTS.md`
2. `README.md`
3. `DECISIONS.md`
4. `PORTING.md`

Project instructions:

> Act as a product and engineering partner for the AI-guided signup demo. Treat AGENTS.md as the
> operating contract. Use plain language with Karim. Ground product decisions in DECISIONS.md and
> technical claims in the repository. For implementation work, inspect the current repository,
> preserve unrelated changes, run the checks required by AGENTS.md, and report exactly what was
> verified. Do not invent USC facts or claim a change works without evidence.

Use ChatGPT Projects for durable product context and discussion. Use Codex against the local Git
checkout for edits, tests, commits, and browser verification.

## Claude

For live code work, open the repository in Claude Code from its root. Run `/memory` or inspect the
loaded context to confirm `CLAUDE.md` imported `AGENTS.md`. Use `/clear` between unrelated tasks and
`/compact` only when a long task genuinely needs to continue.

For a Claude Project, add the same four source files listed above and set these instructions:

> Follow AGENTS.md as the shared operating contract. Use DECISIONS.md on demand for product
> rationale. Be concise, verify implementation claims, preserve unrelated work, and explain outcomes
> to a non-engineer. Use Claude Code, not the chat project, when a task needs direct repository edits.

Claude Project knowledge is useful for planning and review, but it is not a substitute for the live
checkout. Refresh uploaded files when the repository changes.

## Gemini and Google Workspace

For code, run Gemini CLI from the repository root. Use `/memory show` to inspect the loaded context
and `/memory reload` after editing instructions.

For Gemini web and the Workspace side panel, create a Gem named **AI-guided signup demo**. Add
`AGENTS.md`, `README.md`, `DECISIONS.md`, and `PORTING.md` as knowledge, preferably from Google Drive
when you want updates to follow the Drive files. Use these Gem instructions:

> Treat AGENTS.md as the operating contract for the AI-guided signup demo. Use DECISIONS.md only for
> relevant product rationale. Give Karim concise, plain-language answers. Never invent product facts,
> and distinguish planning from verified implementation. For live code edits, tell Karim to use
> Gemini CLI in the repository checkout.

Gemini in Workspace personalization is account-wide and separate from Gemini Apps/Gems. Keep only
general preferences there, such as "use concise plain language". Do not paste project-specific rules
into account-wide Workspace instructions.

## VS Code Copilot

Open the repository folder itself, not its parent Desktop folder. Ensure GitHub Copilot Chat is signed
in and Agent mode is selected for multi-file work. In the first chat, ask:

> Summarise the active repository instructions and list the verification command. Do not edit files.

It should mention `AGENTS.md` and `npm run verify`. If it does not, reload the VS Code window, confirm
the workspace root is this repository, and check that instruction-file support is enabled in the
current Copilot settings.

Do not use vague commands such as "fix everything". Give one bounded outcome, acceptance criteria,
and permission to run the relevant checks. Example:

> On mobile 390x844, keep the recommendation plan card above the week without changing desktop.
> Preserve all product rules in AGENTS.md, add or update the relevant browser assertion, run the
> targeted suite while iterating, then run npm run verify once. Show me the final result and report
> the changed files.

## Parallel work without conflicts

Different agents can work simultaneously only when their file scopes do not overlap. Use a separate
Git branch or worktree per task. Give each agent one bounded outcome and explicit owned files. Never
let two agents edit `standalone/template.html`, `public/styles.css`, or the same test at the same time.

Before merging an agent's branch:

1. Review its diff.
2. Rebase or merge the latest `main`.
3. Run `npm run verify` once on the combined result.
4. Merge only if the verification is green.

## Token-saving rules

- Keep `AGENTS.md` concise and stable; detailed rationale stays in `DECISIONS.md` and loads on demand.
- Start a fresh chat for a different task instead of carrying an unrelated transcript.
- Ask for one outcome at a time with measurable acceptance criteria.
- Use targeted checks during iteration and the full verification once at the end.
- Ask agents to summarise command output and avoid pasting generated `index.html` into chat.
- Save durable decisions in the repository, not only in a model's private memory.
- Prefer live repository tools for code and Projects/Gems for planning, critique, and durable context.

## Health check prompt

Use this after setting up any environment:

> Read the repository instructions without editing anything. Tell me: (1) the source of truth for
> agent rules, (2) the primary demo file, (3) who chooses the membership, (4) the full verification
> command, and (5) when DECISIONS.md should be read.

Expected answers: `AGENTS.md`; `standalone/template.html`; deterministic rules in
`src/recommend.js`; `npm run verify`; only when the task touches a documented product rule.
