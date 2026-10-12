# Running the sweep twice a day

The sweep is the `/autopilot-jobsearch:sweep` skill (`/sweep` inside a clone). The routine prompt in `routines/sweep.md` only changes into the workspace and runs it, so there is one source of truth. Morning and evening work well: the morning run catches overnight mail and fresh postings, the evening run catches replies and the day's postings.

## Claude Code desktop app: scheduled task

1. Open the workspace folder in the desktop app (the folder with `profile.md`; the plugin's MCP servers come from its `.mcp.json`, so the task must run in that folder).
2. Create a scheduled task with the first paragraph of `routines/sweep.md` as the prompt, with the absolute path of your workspace filled in. Without the plugin, use the second paragraph, which reads the skill file from the clone by path.
3. Schedule: `12 9,19 * * *` (09:12 and 19:12 local time) or whatever suits you.
4. The task runs in its own session. The Playwright, JobCubby and shell tools it needs are pre-approved by the workspace's `.claude/settings.json` (see "Pre-approved tools" below), so the only prompts left on the first run are those of the connectors your choices in `/init` use. Approve each with "Yes, and don't ask again"; "Connectors" below says where those approvals land and how to keep them. "What each choice needs" below lists what has to be in place before the first scheduled run.

Reports land in `reports/`, so a run you did not watch is still readable.

## Any machine: cron with headless Claude Code

```bash
# crontab -e
12 9,19 * * * cd /absolute/path/to/workspace && claude -p "run /autopilot-jobsearch:sweep here" --permission-mode acceptEdits >> reports/cron.log 2>&1
```

A headless run cannot answer a permission prompt: whatever would have prompted is denied and the run carries on without it, so every tool has to be approved in advance. Two things do that. `--permission-mode acceptEdits` covers file writes inside the workspace (the report, a note in `sources.md`, `mkdir`); it covers nothing else, not MCP tools and not other shell commands. Those come from the allow list in `.claude/settings.json` described below, which `claude -p` reads from the folder it starts in. Two conditions for that file to count: the folder must be trusted, and the tools of the connectors you chose must be in the list. `claude -p` never shows the trust dialog, so run `claude` once interactively in the workspace, accept the trust dialog (it lists the rules the file would grant) and leave; from then on headless runs there apply the file. An untracked `.claude/settings.local.json` applies without that step, so the entries you add by hand can go there instead. A run that still hits a denied tool says so in its output, which the line above sends to `reports/cron.log` (with `--output-format json` the denials are listed under `permission_denials`); add that tool and the next run goes through. On Claude Code 2.1.259 or later, `--permission-prompts none` also tells Claude not to retry a denied call, which keeps the log short.

The machine must be awake at run time (on a laptop, use the OS's wake schedule or run the task only while you work).

## Pre-approved tools

The list lives in the workspace's `.claude/settings.json`, under `permissions.allow`. `/init` copies it from `templates/settings.json`; in a clone the file is committed, and the clone is its own workspace. Claude Code merges the allow lists of `.claude/settings.json` and your personal `.claude/settings.local.json`, so you can keep the shipped list as it is and add your own entries next to it.

Every entry names one tool; there is no wildcard over all tools and no server-wide `mcp__playwright` or `mcp__jobcubby` entry. What is in it:

- The Playwright browser tools the sweep uses (`browser_navigate`, `browser_navigate_back`, `browser_snapshot`, `browser_find`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_file_upload`, `browser_evaluate`, `browser_tabs`, `browser_press_key`, `browser_wait_for`) plus `browser_take_screenshot`, the fallback the skill allows when an element cannot be found any other way.
- The JobCubby tools the sweep calls: `list_applications`, `get_application`, `create_application`, `update_application`, `update_application_status`, `add_event`, `list_resumes`, `list_matches`, `list_saved_searches`, `run_saved_search`, `save_posting`, `schedule_interview`, `list_interviews`. Reading the tracker's own instructions, `WebFetch(domain:jobcubby.com)`.
- The shell commands a run uses, as prefix rules: `mkdir -p reports`, `date`, `cat >> reports/` for the report append, and the orphaned Playwright server recipe from `docs/platform-notes.md` (`ps -eo pid,etime,command`, `kill`, `sleep`). `grep`, `cat`, `ls` and the like are in Claude Code's built-in read-only set and need no rule. The mail script, `scripts/mail.mjs` with `send`, `check`, `list`, `show` and `reply`, is matched by the end of its path (`Bash(*scripts/mail.mjs* send *)` and so on): the script sits in the plugin folder, whose absolute path differs per install, and a `*` in a Bash rule may stand anywhere, not only at the end. The calendar script is matched the same way for `add`, `find`, `remove` and `check` (`Bash(*scripts/calendar.mjs* add *)` and so on); `calendars` only lists names and is run by `/init`, interactively.
- Edits to `reports/`, to `cover-letters/`, where the body of an email application is saved before the mail script sends it, to `sources.md`, which is where the sweep writes its notes about a source, and to `docs/platform-notes.md`, where it adds a note that applies to a platform in general. That last file is part of the method, not the workspace: in a clone it sits next to `sources.md` and the rule covers it; in a plugin install it lives in the plugin folder, where the rule does not reach, so a plugin user approves that edit once with "Yes, and don't ask again" when it first comes up, or says no and loses only that note.

A `deny` list removes the four JobCubby delete tools and `rm` from the session: a run that works unattended on your tracker and your files has no business deleting either. It also denies reading `.mail.env`: the script reads it, the agent never does, and a workspace set up before SMTP was removed may still keep an app password there.

**Connectors.** A claude.ai connector's MCP server name is an id that belongs to your account (a UUID such as `mcp__49f9982a-...__search_threads`, or `mcp__claude_ai_<name>__<tool>` depending on the version), so a file in the repository cannot name its tools; the shipped list covers Playwright, JobCubby and the shell commands only. To add yours: run `/sweep` once interactively and answer each connector prompt with "Yes, and don't ask again". Claude Code writes those approvals as allow rules into `.claude/settings.local.json`, one per tool. Leave them there, or copy them into `.claude/settings.json` so they travel with the workspace. The tool name is also printed in the prompt itself, so you can type the entries by hand. A connector tool that your organization has set to "ask" prompts on every call regardless of any allow rule.

**To tighten it**, delete entries. Without `create_application` or `browser_file_upload` the run stops at a prompt before each application, which suits the desktop task where you can answer, not cron, where the call is denied. Anything you never want a run to do goes into `deny`. **To extend it**, add the tool name the prompt or `reports/cron.log` shows. A Bash rule matches the command prefix, so `Bash(kill:*)` matches every `kill` and `Bash(mkdir -p reports)` only that command. If you keep a data history (`.data.git/`), the sweep ends with `scripts/data save`; its path depends on where the plugin is installed, so approve it once with "don't ask again" and the rule lands in your local file. In a clone, `npm run lint` checks the file: valid JSON, no entry broader than one tool, every Playwright tool from the sweep's Budget present, and identical to `templates/settings.json`.

## What each choice needs

The choices from `/init` live in `.mail.env` (`MAIL_READ`, `MAIL_TRANSPORT`) and `.calendar.env` (`CALENDAR_VIA`). Before the first scheduled run:

- **`MAIL_READ=connector`**: the mail connector enabled in the session that runs the task, and its tools approved as in "Connectors" above.
- **`MAIL_TRANSPORT=applemail`** (for sending, and for reading with `MAIL_READ=app`): the account in Mail.app, and the one-time macOS permission for the program that runs the task to control Mail. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" check` once interactively from that same app and allow it (System Settings > Privacy & Security > Automation lists it). With `MAIL_READ=app`, `list` asks Mail to check the account and waits `MAIL_CHECK_WAIT` seconds (8 by default) before reading, since Mail lists only what it has downloaded. `send` and `reply` open Mail's compose window for a moment and wait up to 10 seconds for Mail to close it after sending; if it stays open, the script prints a warning on stderr.
- **`MAIL_TRANSPORT=outlook`** (for reading or sending): classic Outlook with the account added. Untested.
- **`CALENDAR_VIA=app`**: `CALENDAR_NAME` naming a writable calendar, and on macOS the one-time permission to control Calendar, granted the same way by running `node "${CLAUDE_PLUGIN_ROOT}/scripts/calendar.mjs" check` interactively. On Windows, classic Outlook (untested).
- **`CALENDAR_VIA=connector`**: the calendar connector enabled in the session that runs the task, and its tools approved as in "Connectors" above.

## What a run needs

- The Playwright browser profile logged in to every `login: yes` source (`/init` step 3).
- JobCubby authorized in this clone.
- What the choices need, above.
- About 20 to 60 minutes per run with ten to fifteen sources; the coverage rule in `docs/rules.md` says a run finishes every source, so give it time rather than a short timeout.
- Usage: a run counts against your Claude subscription, with no separate bill.
- Subscription limits: a run that starts after the weekly or daily usage limit is hit produces a one-line reply and nothing else, and the task scheduler still marks it as succeeded. No report is written then, so a missing report in `reports/` means that run did not happen.
