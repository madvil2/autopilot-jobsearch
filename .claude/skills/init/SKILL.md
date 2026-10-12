---
name: init
description: First run in a fresh clone. Creates the personal workspace files from templates, checks that JobCubby, Playwright, mail and calendar respond, and walks the person through logging in to their job boards once.
---

# /init

Files: the method's own files (`templates/`, `scripts/`, `docs/`, `examples/`) live in the plugin root, written here as `${CLAUDE_PLUGIN_ROOT}`; when that text is not replaced by an absolute path, the method root is the clone this skill file sits in. Everything personal (`profile.md`, `rules.md`, `sources.md`, `cv/`, `cover-letters/`, `prep/`, `photos/`, `documents/`, `transcripts/`, `reports/`) lives in the workspace, the current folder; every relative path below is relative to it. Before doing anything on the person's behalf, read `profile.md` and `rules.md`: facts come only from them, choices are asked the way `rules.md` says, and a correction from the person becomes a dated rule there.

Run this once, in the folder that will hold the job search (an empty folder, or the clone itself). It sets up the workspace and the tools. It never asks for passwords.

## 0. Tool servers

If the workspace has no `.mcp.json`, copy `templates/mcp.json` to `.mcp.json` here. It declares the JobCubby MCP (HTTP, OAuth) and the Playwright MCP (started through `npx`), scoped to this folder so they do not run in the person's other projects. Claude Code reads it at start: tell the person to leave the session and run `claude` again in this folder, approve the two servers when asked, then run this skill again; it continues from step 1.

If the workspace has no `.claude/settings.json`, copy `templates/settings.json` to `.claude/settings.json` here. It pre-approves exactly the tools `/sweep` calls (the Playwright browser tools, the JobCubby tools, the few shell commands a run uses) so a scheduled run never waits on a permission prompt; `docs/scheduling.md` says what is in it and how to change it. In a clone the file is already committed.

## 1. Workspace files

Create these from `templates/` if they do not exist yet (never overwrite an existing one):

| Workspace file | From |
|---|---|
| `profile.md` | `templates/profile.md` |
| `rules.md` | `templates/rules.md` |
| `sources.md` | `templates/sources.md` |
| `cv/base.md` | `templates/cv.md` |
| `cv/old/` | empty folder (the CV they already have, in any format; `/profile` and `/cv` read it first) |
| `cover-letters/` | empty folder |
| `prep/` | empty folder |
| `photos/` | empty folder |
| `documents/` | empty folder (degrees, language certificates, reference letters; listed under Files in `profile.md`) |
| `transcripts/` | empty folder |
| `recordings/` | empty folder |
| `reports/` | empty folder |

In a clone they are gitignored, so `git pull` never touches them; as a plugin user the folder is simply yours.

## 1b. Data history (one question)

Ask, in the format from `CLAUDE.md`:

1. Private history of my data on GitHub, set up now through `gh` (recommended: CV versions, prep files and reports get a history, nothing to run by hand afterwards)
2. Private history on another remote I name
3. No history, plain files only

On 1, run:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/data" init --github
```

It creates `.data.git/` (a second git that tracks only the personal paths, in place; the folder looks the same), creates a private GitHub repo `autopilot-jobsearch-data` through `gh`, and pushes the first snapshot. If `gh` is missing or not logged in, the script says what to do; offer `"${CLAUDE_PLUGIN_ROOT}/scripts/data" init` alone plus `"${CLAUDE_PLUGIN_ROOT}/scripts/data" remote <url>` for any other private remote. From then on every skill that writes a personal file saves a snapshot, and the person never runs git for their data. On no, skip; it can be done later with the same command.

The PDF renderer needs the `playwright` package next to `scripts/render.mjs`: as a plugin it is installed by Claude Code at install time, in a clone run `npm install` once. Chromium itself downloads on the first render (about 150 MB), or now with `node "${CLAUDE_PLUGIN_ROOT}/node_modules/playwright/cli.js" install chromium`.

## 2. Tools

Check each one by calling it, and report what works:

- **JobCubby MCP**: call `get_profile`. If it fails, the person needs to approve the OAuth prompt for the `jobcubby` server from the workspace `.mcp.json` (Claude Code shows it on first use, or they run `/mcp`). Then read `https://jobcubby.com/SKILL.md` once so you know its tools and rules. Point them to the referral link in `README.md` if they have no account yet.
- **Playwright MCP**: call `browser_navigate` to `https://example.com`. If the server is missing, the `.mcp.json` entry starts it through `npx`; the first start downloads a browser.
- **Mail and calendar**: step 2a.

## 2a. Mail and calendar (three questions)

Ask these three, one at a time, in the format from `CLAUDE.md`.

Reading and answering mail:

1. `connector` (recommended: reads Gmail on the server, never misses mail the app has not downloaded): the claude.ai Gmail connector or any mail MCP
2. `app`: the mail app on this machine (Mail.app on macOS, classic Outlook on Windows, the Outlook path untested) through `scripts/mail.mjs`

say default to take the recommended one.

Sending email applications with the CV attached:

1. The mail app on this machine, `applemail` on macOS or `outlook` on Windows (recommended: needs no password; the account is added to the app once)
2. `smtp` with an app password, for an account that offers app passwords

say default to take the recommended one.

Writing interviews and deadlines to the calendar:

1. `app` (recommended: works in every scheduled run without a connector): the calendar app on this machine (Calendar.app on macOS, classic Outlook on Windows, the Outlook path untested) through `scripts/calendar.mjs`
2. `connector`: the claude.ai Google Calendar connector or any calendar MCP

say default to take the recommended one.

When reading is `app`, sending is the mail app too, so skip the second question. On Linux there is no mail or calendar app path: reading and the calendar are `connector` and sending is `smtp`; say so instead of asking.

## 2b. Writing the choices

**`.mail.env`.** The person copies `templates/mail.env` to `.mail.env` in the workspace and sets `MAIL_USER` (the address), `MAIL_FROM_NAME`, `MAIL_READ` (`connector` or `app`) and `MAIL_TRANSPORT` (`applemail`, `outlook` or `smtp`) to the answers. Tell them what to put there and do none of it yourself: you never see, ask for or type a password and you never read `.mail.env`. For the mail app, the person adds the account in System Settings > Internet Accounts on macOS (for Gmail, the Google entry with Mail switched on) and opens Mail once, or adds it to classic Outlook on Windows. For `smtp`, the person creates an app password at https://myaccount.google.com/apppasswords (2-step verification on; name it "autopilot-jobsearch"; the 16 characters without the spaces), puts it in `MAIL_APP_PASSWORD` and runs `chmod 600 .mail.env`. When they say it is done:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" check
node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" test
```

`check` prints the sending transport, the address and the read path. `test` mails the account itself with the subject "autopilot-jobsearch mail test"; ask whether it arrived. With reading `connector`, also call the connector's inbox search once; with `app`, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" list --since 1d`. On macOS the first run of the script makes macOS ask whether the terminal (or Claude) may control Mail; the person allows it now. When a command prints an error, repeat it to the person; it names the fix.

**`.calendar.env`.** Copy `templates/calendar.env` to `.calendar.env` in the workspace and set `CALENDAR_VIA` to the answer (it holds no secret, so you may write it yourself when the person says so). For `app`, run `node "${CLAUDE_PLUGIN_ROOT}/scripts/calendar.mjs" calendars` (on macOS the first run asks whether the terminal or Claude may control Calendar; the person allows it now) and ask which calendar to write to, as a numbered list of the writable ones, for example:

1. the Google account's calendar, usually named after the address (recommended: the events reach the phone and every device through Google)
2. an iCloud or local calendar such as Home or Work

say default to take the recommended one. Put the name in `CALENDAR_NAME`. A Google calendar shows up in Calendar.app once the Google account is added in System Settings > Internet Accounts with Calendars switched on. For `connector`, call the connector once to list today's events. Then, for either:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/calendar.mjs" check
```

It prints the calendar path, and for `app` whether the calendar exists and is writable.

## 2c. Sources (one question)

1. Fill `sources.md` together now from the template, market by market (recommended: the sweep is only as good as its source list)
2. Later, before the first `/sweep`

## 3. Log in to the boards

For every source in `sources.md` with `login: yes`, open its login page in the Playwright browser and ask the person to log in there themselves. Wait for them to say they are done, then verify by loading a page that needs a session (the messaging page on LinkedIn, the profile page elsewhere). Playwright keeps its own browser profile, so this is a one-time step.

Never type credentials or one-time codes. Never try to get past a bot check; ask the person to do it in the same window.

## 3b. Order of the next steps (one question)

1. Drop the current CV into `cv/old/`, then `/profile` (it fills most of the profile from that file), then `/cv`, then the first `/sweep` by hand (recommended: each one feeds the next)
2. `/sweep` first with an existing CV PDF dropped into `cv/`, profile and CV later

## 4. Next steps

Tell the person, in this order:

1. `/profile` to fill `profile.md`: it reads the CV in `cv/old/` first and asks only for what that file does not say.
2. `/cv` to build the CV and render the PDF.
3. Fill `sources.md` with the boards for their market (offer to do it together now).
4. `/sweep` once by hand, then schedule it twice a day (see `docs/scheduling.md`).
