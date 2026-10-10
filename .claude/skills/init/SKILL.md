---
name: init
description: First run in a fresh clone. Creates the personal workspace files from templates, checks that JobCubby, Playwright, mail and calendar respond, and walks the person through logging in to their job boards once.
---

# /init

Run this once after cloning. It sets up the workspace and the tools. It never asks for passwords.

## 1. Workspace files

Create these from `templates/` if they do not exist yet (never overwrite an existing one):

| Workspace file | From |
|---|---|
| `profile.md` | `templates/profile.md` |
| `rules.md` | `templates/rules.md` |
| `sources.md` | `templates/sources.md` |
| `cv/base.md` | `templates/cv.md` |
| `cover-letters/` | empty folder |
| `prep/` | empty folder |
| `photos/` | empty folder |
| `documents/` | empty folder (degrees, language certificates, reference letters; listed under Files in `profile.md`) |
| `transcripts/` | empty folder |
| `recordings/` | empty folder |
| `reports/` | empty folder |

All of them are gitignored. Offer the private-repo layout: the personal files live in a second, private git repository at `private/` inside the clone, and the paths above are symlinks into it. If the person wants it: create `private/`, move the files there (or create them there from the templates), symlink each path back to the root (`ln -s private/profile.md profile.md`, `ln -s private/cv cv`, ...), `git init` inside `private/` with its own `.gitignore` for recordings and previews, and push it to a private remote the person names. From then on, method changes are commits in the clone and data changes are commits in `private/`; `git pull` in the clone never touches the data.

Run `npm install` if `node_modules/` is missing (it installs Playwright's Chromium for the PDF renderer).

## 2. Tools

Check each one by calling it, and report what works:

- **JobCubby MCP**: call `get_profile`. If it fails, the person needs to approve the OAuth prompt for the `jobcubby` server from `.mcp.json` (Claude Code shows it on first use, or they run `/mcp`). Then read `https://jobcubby.com/SKILL.md` once so you know its tools and rules. Point them to the referral link in `README.md` if they have no account yet.
- **Playwright MCP**: call `browser_navigate` to `https://example.com`. If the server is missing, the `.mcp.json` entry starts it through `npx`; the first start downloads a browser.
- **Mail**: look for a tool that searches the inbox (the claude.ai Gmail connector, or any mail MCP). If none, tell the person which to enable; the sweep runs without mail but cannot answer recruiters.
- **Calendar**: look for a tool that creates calendar events (the claude.ai Google Calendar connector or any calendar MCP). Optional; without it interviews are logged only in JobCubby.

## 3. Log in to the boards

For every source in `sources.md` with `login: yes`, open its login page in the Playwright browser and ask the person to log in there themselves. Wait for them to say they are done, then verify by loading a page that needs a session (the messaging page on LinkedIn, the profile page elsewhere). Playwright keeps its own browser profile, so this is a one-time step.

Never type credentials or one-time codes. Never try to get past a bot check; ask the person to do it in the same window.

## 4. Next steps

Tell the person, in this order:

1. `/profile` to fill `profile.md` by interview.
2. `/cv` to build the CV and render the PDF.
3. Fill `sources.md` with the boards for their market (offer to do it together now).
4. `/sweep` once by hand, then schedule it twice a day (see `docs/scheduling.md`).
