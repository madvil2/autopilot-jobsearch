---
name: sweep
description: Sweep the job search once: mail, platform inboxes, due follow-ups, JobCubby matches and every source in sources.md, applying, replying and logging as it goes, ending in a report. Use for a sweep by hand or from the scheduled routine.
---

# /sweep

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

Also read `sources.md` and `docs/platform-notes.md` before starting, and `https://jobcubby.com/SKILL.md` if you have not used JobCubby in this session. Work autonomously and report at the end, in the report language set in `profile.md`.

Where a rule is unclear, take the reversible action that keeps the process alive (apply, reply, log) and escalate the doubt in one line. To escalate is to append an `[attention]` line to the report (Step 0).

## Coverage

Coverage, blocked sources and the no-subagent rule are in `docs/rules.md` "Running"; the source ledger from Step 0 is the check. "Browser is already in use" is not a blocker: fix it with the recipe in `docs/platform-notes.md` and carry on.

Use the Playwright browser for everything that needs a session or a file upload. Other browsers only read, and only when Playwright is still dead after the recipe.

## Context

Context is the budget.

- Read list pages with `browser_evaluate` and a selector that returns only title, company and link per card, never a snapshot. Snapshot only forms you are about to fill. Screenshot only when an element cannot be found any other way. `grep` saved tool-result dumps; never read one in full.
- `browser_file_upload` works only right after clicking the file control. Go back with `browser_navigate_back`, never a URL like "back".

## Step 0. The report, the ledger, the duplicate list

Create `reports/<YYYY-MM-DD>-<HHMM>.md` now with one line: "run in progress, started <time>". Every later line starts with the tag of its section and is appended the moment it happens, from Bash; never rewrite the file from memory:

```bash
sed 's/^/[<tag>] /' >> reports/<file>.md <<'EOF'
<one or more lines>
EOF
```

| Tag | Section | What goes in |
|---|---|---|
| `attention` | Needs your attention | Every escalation: offers and anything with money attached (even if already answered), applications stopped at a question the profile does not cover, blocked sources with URLs, expired logins, doubts. |
| `replied` | Replied | Who, which channel, and every sent text quoted in full, including cover notes typed into forms when they said anything beyond the standard line. Interviews booked with date, time, time zone. Assessment deadlines. Follow-up counts. |
| `rejections` | Rejections | Company, reason recorded. |
| `applied` | Applied | One line per tracker entry created or applied this run: company, role, CV version, posting URL, tracker id. |
| `skipped` | Skipped | Company and a one-word reason. |
| `outreach` | Worth an outreach | Company, posting URL, one line of why. |
| `sources` | Sources | The ledger. |

The ledger: append one line `<name>: pending` per `###` source in `sources.md`, the name exactly as written there. A source ends when its line becomes `<name>: N postings in 3 days, A applied, S skipped, D duplicates` (an inbox: `N threads, R replied, U status changes`) or `<name>: blocked: <url>`:

```bash
N='<name>' R='<result>' perl -pi -e 's/^\[sources\] \Q$ENV{N}\E: pending$/[sources] $ENV{N}: $ENV{R}/' reports/<file>.md
```

Call `list_applications` once, with no filters. The result usually lands in a saved file: keep its path for the whole run and never read it into context or delegate reading it. Entries created this run are missing from it, so every `create_application` and `save_posting` appends its `[applied]` line (status `saved` noted) to the report at once.

**Duplicate check**: `grep` both the Step 0 file and the report for the company (lowercase, legal suffixes and brackets stripped, the stem of the name) and for the posting URL or vacancy id. Matching per `docs/rules.md` "Applying". The outcome:

- The same posting with status `saved`: apply, then `update_application_status` to `applied` and `update_application` with the step 5.7 fields on that id.
- The same posting with any other status, or another posting at the same company: skip as `duplicate`.
- Neither: apply, then `create_application`.

## Step 1. Mail

Read mail through the path in `.mail.env` (`MAIL_READ`). With `connector`, that is the mail connector (the claude.ai Gmail connector or any mail MCP). With `app`, it is the mail script: `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" list --since 1d` lists the inbox and the junk mailbox, one message per line with its id first, and `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" show --id '<id>'` opens one.

This is the Email source in `sources.md`: the last day, inbox and junk. Open anything that looks like a status change (rejection, invite, screening request, assessment link, offer) or a question. Ignore alerts, newsletters and marketing.

- Status changes: find the application with the duplicate check, then `update_application_status` with the right status (for rejections, one of the five reasons in `docs/rules.md` "Tracker and calendar") and a timeline event with the real time.
- Questions and invites: answer per "How to reply" below, in the same run.
- An offer, a rejection after a call or interview, an assessment, a slot that has to move, a question the profile cannot answer, a request for a commitment: read the matching section of `docs/sweep-events.md` when the event shows up.

## Step 2. Messages on platforms

Every other source of type `inbox` in `sources.md` (LinkedIn messaging, any platform inbox), handled like Step 1 with "Platform inboxes" in `docs/platform-notes.md`: log status changes, and reply to everyone who asks something. If a recruiter sends a direct application link, apply through it too.

## Step 3. Due follow-ups

From the Step 0 file, take every application with status `applied`, `screening` or `interview` whose `follow_up_at` has passed. With a human thread or a named contact: send one short nudge in the thread's language, log the event, and set the next `follow_up_at` per the follow-up rule in `docs/rules.md` "Replying and scheduling". ATS-only: clear `follow_up_at` with `update_application`. Append `[replied] follow-ups: N sent, C cleared`.

## Step 4. JobCubby index

Run each saved search (`list_saved_searches`, `run_saved_search`) and read `list_matches`. For each posting that matches the profile targets and passes the duplicate check: `save_posting`, then apply through the posting URL as in Step 5; step 5.7 then finds the `saved` entry and updates it. Put each match's listed gaps in the application's requirements.

## Step 5. Boards

For every source of type `board` or `search`, in order. A `search` source is a web search query that returns postings on ATS boards directly; run it, open each result from the last three days, and treat it like a board posting:

1. Open the URL with its filters. Read the list (scroll lazy lists; read titles from the item elements, not from the page summary).
2. For each posting from the last three days: open it, read the full description, decide.
3. **Apply if the stack matches**, per `docs/rules.md` "Applying". Decide in twenty seconds, not with a scorecard. Location is whatever the profile allows for this market. When two postings compete for time, the fresher one with fewer applicants comes first.
4. **Skip** on a hard skip filter from `profile.md`, on a duplicate (Step 0), on a logged-out state, or on a disguised agency repost with a generic title (open it, check the real stack). A captcha that appears on submit after the form is filled is not a skip: follow the captcha case in `docs/sweep-events.md`.
5. Apply through the fastest path the source offers (easy apply, platform button, company form). Email-only postings are applied to as well, per `docs/sweep-events.md`. Use the location and phone for this market from `profile.md`. On platforms that pre-fill a stored CV, remove it and upload the current version for this market and language. When a form asks for certificates, diplomas, transcripts, language proof or reference letters, attach the matching files from `documents/` as listed under Files in `profile.md`; never skip an application for asking. The cover note is three or four sentences. The CV comes only from Files in `profile.md`; when that file has a markdown source in `cv/`, it must pass the approval check in "Approval" of `${CLAUDE_PLUGIN_ROOT}/.claude/skills/cv/SKILL.md`, else skip the application and escalate.
6. Confirm the application actually went through (success page, "applied" badge) before logging it.
7. Log it as the duplicate check says, with company, role, posting URL, source, location, work mode, status `applied`, `applied_at` as a full ISO 8601 timestamp (`2026-10-10T09:41:00+02:00`), description (full posting text or its key sections), requirements (the technologies the posting names, as a list), salary min and max annual when shown, deadline when shown, and `resume_id` of the CV version used (from `list_resumes`). Set `follow_up_at` only when the application opened a human thread (an email application, a recruiter's link), timed per `docs/rules.md` "Replying and scheduling". Field names per `docs/platform-notes.md` under JobCubby.
8. **Worth an outreach**: a strong match, a company small enough that the department head is findable, a role clearly inside one team, no giant ATS funnel. While fewer than three are listed this run, append it as `[outreach]`. The application still goes through the normal path.

Then review existing `saved` applications from the Step 0 file, oldest first, at least ten per run: apply now if the posting still matches and is live, otherwise move it to `rejected` with reason `Position closed or other candidates` and a one-line note.

## How to reply

Every channel follows `docs/rules.md` "Writing on my behalf" and "Replying and scheduling" (content, salary, commitments, send or draft). After each sent reply on an application's thread, set its `follow_up_at` per the follow-up rule there.

- **Sending a reply.** Through the path in `.mail.env` (`MAIL_READ`): with `connector`, the connector's reply in the thread; with `app`, `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" reply --id '<id>' --body-file <file>` with the id from `list`, plus `--all` when others are on the thread.
- **Scheduling.** Booking pages (Calendly, cal.com, Zeeg, ATS schedulers) and times proposed by mail: take the earliest slot the scheduling rule in `docs/rules.md` allows, checking `list_interviews` for clashes. Confirm with date, time and time zone. Then `schedule_interview` (round, type, link, interviewer), the calendar event per "Putting an event in the calendar" in `docs/sweep-events.md`, and the application to `interview`.
- **Assessments, rescheduling, offers, commitments.** Read the matching section of `docs/sweep-events.md`.

## Step 6. Report

1. Gate: `grep -c ': pending$' reports/<file>.md` prints 0. Every pending source is worked now; the run is complete only then.
2. If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "sweep <date> <time>"`.
3. If this run taught you something about a platform, add one dated line to `sources.md` under that source's notes, or to `docs/platform-notes.md` if it is general.
4. Sort the file into its sections, every section present even when empty. The status line is "run complete, <start> to <end>", or "run ended early: <why>" when you stop for a blocker, a question for the person or an error:

   ```bash
   f=reports/<file>.md
   { echo "<status line>"; for s in "attention:Needs your attention" "replied:Replied" "rejections:Rejections" "applied:Applied" "skipped:Skipped" "outreach:Worth an outreach" "sources:Sources"; do printf '\n## %s\n\n' "${s#*:}"; grep "^\[${s%%:*}\] " "$f" | sed 's/^\[[a-z]*\] //'; done; } > "$f.tmp" && mv "$f.tmp" "$f"
   ```

5. Print the whole file as the last message.
