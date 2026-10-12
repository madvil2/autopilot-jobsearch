---
name: sweep
description: One full pass of the job search: answer mail and recruiter messages, send due follow-ups, pull JobCubby matches, visit every source in sources.md, apply with Playwright, log everything to JobCubby and the calendar, save a report. Runs by hand or twice a day as a scheduled task.
---

# /sweep

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md` and `rules.md`.

Also read `sources.md` and `docs/platform-notes.md` before starting, and `https://jobcubby.com/SKILL.md` if you have not used JobCubby in this session. Work autonomously and report at the end, in the report language set in `profile.md`.

## Coverage, non-negotiable

Coverage, blocked sources and the no-subagent rule are in `rules.md` "Running": every source, every posting from the last three days, in this run. "Browser is already in use" is not a blocker: fix it with the recipe in `docs/platform-notes.md` and carry on.

Use the Playwright browser for everything that needs a session or a file upload. Other browsers only read, and only when Playwright is still dead after the recipe.

If the very first reply of the session is a usage-limit or quota message, write a one-line report ("run skipped: usage limit") to `reports/` and stop.

## Budget

- Time is not a budget; a run takes as long as every source needs. Context is the budget.
- Read list pages with `browser_evaluate` and a selector that returns only title, company and link per card, never a snapshot. Snapshot only forms you are about to fill. Screenshot only when an element cannot be found any other way. `grep` saved tool-result dumps; never read one in full.
- Tools: `browser_navigate`, `browser_navigate_back`, `browser_snapshot`, `browser_find`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_file_upload`, `browser_evaluate`, `browser_tabs`, `browser_press_key`, `browser_wait_for`. A `ref` is valid only from the latest snapshot; after any navigation or click that changes the page, snapshot again (or `browser_find`) before using refs. `browser_file_upload` works only right after clicking the file control. Go back with `browser_navigate_back`, never a URL like "back".

## Step 0. The report file, then the duplicate list

Create `reports/<YYYY-MM-DD>-<HHMM>.md` now, with the six headings from Step 6 and a first line "run in progress, started <time>". Append every action the moment it happens: a sent reply with its full text, a booked interview, a rejection logged, an application submitted (company, role, CV version), a skipped posting (company, one word), a blocked source. Append with a one-line `cat >> file <<'EOF'` from Bash; never rewrite the file from memory.

Call `list_applications` once, with no filters. The result usually lands in a saved file: keep its path for the whole run and `grep` it from Bash whenever you check a company (lowercase, strip legal suffixes and brackets, search for the stem of the name and for the posting URL or vacancy id). Never read it into context or delegate reading it.

## Step 1. Mail

Read mail through the path in `.mail.env` (`MAIL_READ`). With `connector`, that is the mail connector (the claude.ai Gmail connector or any mail MCP). With `app`, it is the mail script: `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" list --since 1d` lists the inbox and the junk mailbox, one message per line with its id first, and `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" show --id '<id>'` opens one.

This is the Email source in `sources.md`: the last day, inbox and junk. Open anything that looks like a status change (rejection, invite, screening request, assessment link, offer) or a question. Ignore alerts, newsletters and marketing.

- Status changes: find the application in the duplicate list from Step 0 (company matching per `rules.md` "Applying"), then `update_application_status` with the right status (for rejections, one of the five reasons in `rules.md` "Tracker and calendar") and a timeline event with the real time.
- Questions and invites: answer per "How to reply" below, in the same run.
- An offer, a rejection after a call or interview, an assessment, a slot that has to move, a question the profile cannot answer, a request for a commitment: read the matching section of `docs/sweep-events.md` when the event shows up.

## Step 2. Messages on platforms

Every other source of type `inbox` in `sources.md` (LinkedIn messaging, any platform inbox): reply to everyone who asks something. If a recruiter sends a direct application link, apply through it too.

## Step 3. Due follow-ups

`list_applications` with status `applied`, `screening` or `interview`. For each follow-up that is due under `rules.md` "Replying and scheduling", send one short nudge in the thread's language, log the event, and set the next follow-up date. Skip ATS-only applications silently.

## Step 4. JobCubby index

Run each saved search (`list_saved_searches`, `run_saved_search`) and read `list_matches`. For each posting that matches the profile targets: `save_posting`, then apply through the posting URL like any other board posting. Put each match's listed gaps in the application's requirements.

## Step 5. Boards

For every source of type `board` or `search`, in order (duplicate checks go through the Step 0 file). A `search` source is a web search query that returns postings on ATS boards directly; run it, open each result from the last three days, and treat it like a board posting:

1. Open the URL with its filters. Read the list (scroll lazy lists; read titles from the item elements, not from the page summary).
2. For each posting from the last three days: open it, read the full description, decide.
3. **Apply if the stack matches**, per `rules.md` "Applying". Decide in twenty seconds, not with a scorecard. Location is whatever the profile allows for this market. When two postings compete for time, the fresher one with fewer applicants comes first.
4. **Skip** on a hard skip filter from `profile.md`, on a duplicate company, on a logged-out state, or on a disguised agency repost with a generic title (open it, check the real stack). A captcha that appears on submit after the form is filled is not a skip: follow the captcha case in `docs/sweep-events.md`.
5. Apply through the fastest path the source offers (easy apply, platform button, company form). Email-only postings are applied to as well, per `docs/sweep-events.md`. Use the location and phone for this market from `profile.md`. On platforms that pre-fill a stored CV, remove it and upload the current version for this market and language. When a form asks for certificates, diplomas, transcripts, language proof or reference letters, attach the matching files from `documents/` as listed under Files in `profile.md`; never skip an application for asking. The cover note is three or four sentences.
6. Confirm the application actually went through (success page, "applied" badge) before logging it.
7. Log it: `create_application` with company, role, posting URL, source, location, work mode, status `applied`, `applied_at` as a full ISO 8601 timestamp (`2026-10-10T09:41:00+02:00`), description (full posting text or its key sections), requirements (the technologies the posting names, as a list), salary min and max annual when shown, deadline when shown, `resume_id` of the CV version used (from `list_resumes`), and `follow_up_at` 7 days out as a full timestamp (`2026-10-17T09:00:00+02:00`). Never log an application with `applied_at`, `resume_id` or `follow_up_at` missing. Use the field names in `docs/platform-notes.md` under JobCubby from the first call. A duplicate per `rules.md` updates the existing entry instead.

Then review existing `saved` applications, oldest first, at least ten per run: apply now if the posting still matches and is live, otherwise move it to `rejected` with reason `Position closed or other candidates` and a one-line note.

## How to reply

Every channel follows `rules.md` "Writing on my behalf" and "Replying and scheduling" (content, salary, commitments, send or draft).

- **Sending a reply.** Through the path in `.mail.env` (`MAIL_READ`): with `connector`, the connector's reply in the thread; with `app`, `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" reply --id '<id>' --body-file <file>` with the id from `list`, plus `--all` when others are on the thread.
- **Scheduling.** Booking pages (Calendly, cal.com, Zeeg, ATS schedulers) and times proposed by mail: take the earliest slot the scheduling rule in `rules.md` allows, checking `list_interviews` for clashes. Confirm with date, time and time zone. Then `schedule_interview` (round, type, link, interviewer), the calendar event per "Putting an event in the calendar" in `docs/sweep-events.md`, and the application to `interview`.
- **Assessments, rescheduling, offers, commitments.** Read the matching section of `docs/sweep-events.md`.

## Step 6. Report

Finish the file from Step 0: replace the first line with "run complete, <start> to <end>" (or "run ended early: <why>" when you stop for a blocker, a question for the person or an error), tidy the sections, then print the whole file as the last message. Six fixed sections, all present even when empty:

1. **Needs your attention.** Offers and anything with money attached (even if already answered), applications stopped at a question the profile does not cover, blocked sources with URLs, expired logins.
2. **Replied.** Who, which channel, and every sent text quoted in full, including cover notes typed into forms when they said anything beyond the standard line. Interviews booked with date, time, time zone. Assessment deadlines.
3. **Rejections.** Company, reason recorded.
4. **Applied.** Company and role, one line each, with the CV version used.
5. **Skipped.** Company and a one-word reason, one line each.
6. **Worth an outreach.** Up to three postings from this run, criteria in `docs/sweep-events.md`, one line each with the posting URL.

If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "sweep <date> <time>"`.

If this run taught you something about a platform, add one dated line to `sources.md` under that source's notes, or to `docs/platform-notes.md` if it is general. A source that produced nothing relevant for two runs in a row gets a "candidate for removal" note; the person decides.
