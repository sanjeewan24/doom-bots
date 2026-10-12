# DOOM-Bots

Marcus and his agentic workforce, launched from any project folder.

## Install (once)

```
git clone https://github.com/<you>/doom-bots
cd doom-bots
npm link
```

`npm link` puts the `doom` command on your PATH. The first `doom` run also copies the nine agents into `%USERPROFILE%\.claude\agents` and the skill packs into `%USERPROFILE%\.claude\doombots\skills`. Run `doom install` after you edit any agent or skill file here.

Needs: Node 18+, Claude Code on PATH (`claude`), and the `caveman` and `ponytail` skills installed in Claude Code.

## Use

```
cd <any project folder>
doom
```

A browser tab opens with the chat. Tell Marcus about the project. That is all. Options: `doom --new` (fresh session), `doom --safe` (keep Claude Code's permission prompts), `doom --port N`, `doom --no-open`.

Marcus sorts the request and picks the route:

| Request | Route |
|---|---|
| New project | Sage, Forge, 4 reviewers, Themis |
| Bug fix | Scout, Sage (short fix spec), Forge, 4 reviewers, Themis |
| Feature on existing code | Scout, Sage (plan for the change only), Forge, 4 reviewers, Themis |
| Codebase Marcus does not know | Scout (full map), Sage, Forge, 4 reviewers, Themis |

Reviewers send CHANGES back to Forge (2 loops max, then you decide). Themis approves low risk changes for Marcus to merge. Anything risky waits for you: press Approve in the chat (or type `approve`), or Reject with a reason.

## Views

Switch in the header (or Alt+1, Alt+2, Alt+3):

- **Chat**: the chat plus the workforce list, activity feed and `.doombots/` files.
- **POV**: a live pixel-art HQ where the agents walk, work and hand things to each other. Click things.
- **Diagram**: the factory line as a flow chart. Nodes light up, traffic pulses along the edges, click a node for details.

POV and Diagram show real events only. The **Demo** buttons play a scripted run (a bug fix with a fix loop, ending in a merge or an escalation) so you can watch without spending tokens. **Stop demo** ends it and clears the scene.

## Roster

Marcus (orchestrator), Scout (codebase mapper), Sage (spec writer), Forge (builder), Warden (security), Iris (UX), Muse (UI design), Cato (code), Themis (approver). All run on Sonnet 4.6 at medium effort with caveman and ponytail. No worker cap.

## Marcus is locked to orchestrating

`doom` starts Claude Code with a PreToolUse hook (`lib/guard.js`). It blocks Marcus from editing files and from any shell command that is not git, listing, reading or writing under `.doombots/`. Workers are not restricted. Tests: `node test/guard.test.js`.

## What goes where

Everything DOOM-Bots writes lives in `.doombots/` inside the project:

```
.doombots/PROJECT_MAP.md      Scout's map (existing projects)
.doombots/BUG_BRIEF.md        Scout's bug brief
.doombots/specs/              the six spec files, or FIX_SPEC.md for a bug
.doombots/reports/            security, ux, ui, code reviews and Themis's decision
.doombots/events.jsonl        Marcus's event log (the UI tails it)
.doombots/state.json          where the run stopped
.doombots/ui-log.jsonl        chat history for the UI
.doombots/session.json        Claude session id, used to resume
```

Code changes happen only on `factory/<task>` branches. Add `.doombots/` to the project's `.gitignore` if you do not want it committed.

## Yolo mode

By default Marcus runs with `--dangerously-skip-permissions`: no permission prompts, any shell command. The server listens on 127.0.0.1 only, and every request needs the random token in the URL printed in the terminal. Do not share that URL. The agents' read-only rules are instructions, not hard blocks. Use `doom --safe` to get prompts back.

