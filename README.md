<div align="center">

# DOOM-BOTS

**Open a folder. Run `doom`. Tell Marcus what you want.**<br>
**Nine AI agents build it.**

[![Node](https://img.shields.io/badge/node-%E2%89%A518-3c873a?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Claude Code](https://img.shields.io/badge/claude%20code-required-d97757?style=flat-square)](https://claude.com/claude-code)
[![Model](https://img.shields.io/badge/model-sonnet%204.6-ff5a36?style=flat-square)](#)
[![Dependencies](https://img.shields.io/badge/dependencies-0-5ac88c?style=flat-square)](#)
[![Platform](https://img.shields.io/badge/win%20%C2%B7%20mac%20%C2%B7%20linux-4aa8e0?style=flat-square)](#)
[![License](https://img.shields.io/badge/license-MIT-e0b84a?style=flat-square)](LICENSE)

<img src="docs/img/pov-merge.png" alt="DOOM-Bots POV view" width="860">

</div>

<br>

## Run it

```bash
git clone https://github.com/sanjeewan24/doom-bots
cd doom-bots && npm link
```

```bash
cd your-project
doom
```

A chat opens in your browser. Tell Marcus what you need.

**Needs:** Node 18+ &nbsp;·&nbsp; [Claude Code](https://claude.com/claude-code) on PATH &nbsp;·&nbsp; `caveman` and `ponytail` skills

<br>

## What you can ask

| | |
|---|---|
| 🆕 **New project** | Marcus plans it, the crew builds it |
| 🐛 **Bug fix** | Scout finds it, Forge fixes it |
| ✨ **Feature** | Scout reads the code, Sage plans the change |
| 🔍 **Unknown codebase** | Scout maps it first |

<br>

## The line

<div align="center"><img src="docs/img/line.svg" alt="The factory line" width="520"></div>

Reviewers send CHANGES back to Forge, **2 loops max**. Risky changes wait for your **Approve**.

<br>

## The crew

| | | |
|:-:|---|---|
| <img src="docs/img/avatar-marcus.png" width="48"> | **Marcus** | Orchestrator. Never writes code |
| <img src="docs/img/avatar-scout.png" width="48"> | **Scout** | Maps existing code |
| <img src="docs/img/avatar-sage.png" width="48"> | **Sage** | Writes the specs |
| <img src="docs/img/avatar-forge.png" width="48"> | **Forge** | Builds and fixes |
| <img src="docs/img/avatar-warden.png" width="48"> | **Warden** | Security review |
| <img src="docs/img/avatar-iris.png" width="48"> | **Iris** | UX review |
| <img src="docs/img/avatar-muse.png" width="48"> | **Muse** | UI design review |
| <img src="docs/img/avatar-cato.png" width="48"> | **Cato** | Code review |
| <img src="docs/img/avatar-themis.png" width="48"> | **Themis** | Final approval |

<br>

## Three views

Switch in the header, or press **Alt+1 / 2 / 3**.

**Chat** &nbsp;·&nbsp; talk to Marcus, watch the crew

<img src="docs/img/chat.png" alt="Chat view" width="860">

**POV** &nbsp;·&nbsp; the crew at work, live

<img src="docs/img/pov-review.png" alt="POV view" width="860">

**Diagram** &nbsp;·&nbsp; traffic lights up along the line

<img src="docs/img/diagram-loop.png" alt="Diagram view" width="860">

<br>

## Try it free

Hit **Demo** in POV or Diagram. A scripted bug fix plays, no tokens used. **Stop demo** ends it.

<br>

## Commands

| | |
|---|---|
| `doom` | Start in this folder |
| `doom --new` | Fresh session |
| `doom --safe` | Keep Claude Code permission prompts |
| `doom --port 4800` | Pick a port |
| `doom --no-open` | Don't open the browser |
| `doom install` | Reinstall agents and skills |

<br>

## Safety

- Marcus is **locked out of editing files**. A hook blocks it, so he must delegate
- Code changes only on `factory/*` branches
- Runs in **yolo mode** by default. Agents can run any command in your project
- Server is `127.0.0.1` only, behind a random token
- `--safe` brings the prompts back

<br>

## Files

Everything lands in `.doombots/` inside your project. Add it to `.gitignore` if you like.

```
.doombots/
├─ specs/          specs from Sage
├─ reports/        reviews and Themis's decision
├─ events.jsonl    Marcus's log
└─ state.json      where the run stopped
```

<br>

## Test

```bash
npm test
```

<br>

<div align="center">

MIT · See [THIRD-PARTY.md](THIRD-PARTY.md) for bundled security skills

</div>
