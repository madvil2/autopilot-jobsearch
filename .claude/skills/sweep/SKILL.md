---
name: sweep
description: One full pass of the job search: answer mail and recruiter messages, send due follow-ups, pull JobCubby matches, visit every source in sources.md, apply with Playwright, log everything to JobCubby and the calendar, save a report. Runs by hand or twice a day as a scheduled task.
---

# /sweep

You are running the job search for the person described in `profile.md`, under the rules in `rules.md`, across the sources in `sources.md`. All three live in the workspace folder (the folder this file's `.claude/` sits in); every relative path below is relative to it. Work autonomously and report at the end, in the report language set in `profile.md`. Read all three files before doing anything, plus `docs/platform-notes.md` for platform quirks. If you have not used JobCubby in this session, read `https://jobcubby.com/SKILL.md` first.

## Coverage, non-negotiable

Every run gets through every source in `sources.md`, in the same run, and reads every posting from the last three days on each. Tool-call cost and elapsed time are never reasons to stop early or to "do the rest next time." A genuine blocker (logged-out session, challenge page, site down) skips that one source with a note; it never stops the run. "Browser is already in use" is not a blocker, it is a chore: fix it with the recipe in `docs/platform-notes.md` and carry on.

Use the Playwright browser for everything that needs a session or a file upload. Other browsers cannot upload a CV; use them only to read, and only when Playwright is still dead after the recipe. Never hand the run, or any source, to a subagent: a subagent cannot see the duplicate list and in practice creates duplicates in the tracker.

If the very first reply of the session is a usage-limit or quota message, write a one-line report ("run skipped: usage limit") to `reports/` so the gap is visible, and stop.

## Budget

- One run is one pass, and time is not a budget: a run takes as long as every source needs. Only context is.
- Context is the cost driver. Do not snapshot list pages; read lists with `browser_evaluate` and a selector that returns only title, company and link per card. Snapshot only forms you are about to fill. Take a screenshot only when an element cannot be found any other way. Never read a saved tool-result dump into context in full; use `grep` on it.
- Tools: `browser_navigate`, `browser_navigate_back`, `browser_snapshot`, `browser_find`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_select_option`, `browser_file_upload`, `browser_evaluate`, `browser_tabs`, `browser_press_key`, `browser_wait_for`. A `ref` is valid only from the latest snapshot; after any navigation or click that changes the page, take a fresh snapshot (or `browser_find`) before using refs. `browser_file_upload` works only right after clicking the file control. To go back use `browser_navigate_back`, never a URL like "back".

## Step 0. The duplicate list

Call `list_applications` once, with no filters. The result is large and lands in a saved file; do not read that file into context and do not delegate reading it. Instead, `grep` it from Bash whenever you need to check a company: lowercase, strip legal suffixes and brackets, search for the stem of the name and for the posting URL or vacancy id. Keep the file path for the whole run.

## Step 1. Mail

Search the inbox for the last day. Open anything that looks like a status change (rejection, invite, screening request, assessment link) or a question. Ignore alerts, newsletters and marketing.

- Status changes: find the application (in the duplicate list from Step 0, loose company matching per `rules.md`) and update it: `update_application_status` with the right status and, for rejections, one of the five reasons. Add a timeline event with the real time. Set a status only from the message or the application's own page, never from a list view: platform inbox lists put statuses next to the wrong card when read as one block of text.
- Questions and invites: answer per "How to reply" below, in the same run.

## Step 2. Messages on platforms

Every source of type `inbox` in `sources.md`: LinkedIn messaging and any platform inbox. Reply to everyone who asks something. A recruiter who pinged twice without an answer is a lost process. If a recruiter sends a direct application link, apply through it too.

## Step 3. Due follow-ups

`list_applications` with status `applied` or `screening`; for each whose follow-up date has passed and that has a human thread or a named contact (not an ATS-only submission), send one short nudge in the thread's language, log the event, and set the next follow-up date two weeks out. Skip ATS-only applications silently.

## Step 4. JobCubby index

Run each saved search (`list_saved_searches`, `run_saved_search`) and read `list_matches`. For each posting that matches the profile targets: `save_posting`, then apply through the posting URL like any other board posting. Note each match's listed gaps for `/stack-radar` (put them in the application's requirements).

## Step 5. Boards

For every source of type `board`, in order (duplicate checks go through the Step 0 file):

1. Open the URL with its filters. Read the list (scroll lazy lists; read titles from the item elements, not from the page summary).
2. For each posting from the last three days: open it, read the full description, decide.
3. **Apply if the stack matches** the profile targets. The level in the title is not a filter unless the profile's hard skip filters name it. Location is whatever the profile allows for this market.
4. **Skip** on a hard skip filter from `profile.md`, on a duplicate company, on a logged-out state, or on a posting that is a disguised agency repost with a generic title (open it, check the real stack).
5. Apply through the fastest path the source offers (easy apply, platform button, company form). Fill forms only from `profile.md`: facts, location and phone for this market, honest answers in structured fields, nothing volunteered in free text. Attach the CV version for this market and language; on platforms that pre-fill a stored file, remove it and upload the current one. Always add a cover note where a text box exists, in the posting's language, three or four sentences.
6. Confirm the application actually went through (success page, "applied" badge) before logging it.
7. Log it: `create_application` with company, role, posting URL, source, location, work mode, status `applied`, `applied_at` as a full ISO 8601 timestamp (for example `2026-10-10T09:41:00+02:00`), description (full posting text or its key sections), requirements (the technologies the posting names, as a list), salary min and max annual when shown, deadline when shown, `resume_id` of the CV version used (from `list_resumes`), and `follow_up_at` 7 days out. Every one of these fields matters later: requirements feed `/stack-radar`, resume_id tells which CV went where, follow_up_at drives Step 3. Duplicates per `rules.md` update the existing entry instead.

Then review existing `saved` applications, oldest first, at least ten per run: apply now if the posting still matches and is live, otherwise move it to `rejected` with reason `Position closed or other candidates` and a one-line note. Never leave the saved list to rot.

## How to reply

Applies to every channel. Content rules are in `rules.md` ("Writing on my behalf", "Replying and scheduling"). In short: same language as the thread, three or four sentences, answer what was asked, name the next step, nothing volunteered about gaps or location, no em-dashes.

- **Scheduling.** Booking pages (Calendly, cal.com, Zeeg, ATS schedulers) and proposed times by mail: take the earliest slot that fits the rules (at least 3 hours ahead, 09:00 to 19:00 local, 1 hour clear of interviews in `list_interviews`). Confirm with date, time and time zone. Then `schedule_interview` (round, type, link, interviewer) and a calendar event with the link and a reminder, after checking none exists for that company and time. Move the application to `interview`.
- **Assessments.** Accept, ask for the deadline if missing, log the event, create a calendar event for the deadline, move the application to `screening`. Do not solve it now.
- **Salary.** The figure from `profile.md` for this market, one number. If they name a range or an offer below it: interest plus a question about next steps, no counter, no decline, and put it at the top of the report. Phrase it as interest, not acceptance: "thanks, that is a useful starting point, what are the next steps?" never "that works for me". Never mention a missing skill in the same message.
- **Commitments are not yours to make.** Employment form (contractor, sole-trader entity, agency, fixed-term), tax or legal setup, visa and relocation, working hours or days, equity terms: reply that you will confirm shortly, and put the question at the top of the report. The same for anything that costs money (paid platform features, paid tests).
- **Direct questions about stack, location, availability.** Answer directly from `profile.md`. Stack in the profile's order, years per technology from its table.
- Default is to send and quote the text in the report. If `rules.md` says drafts, create drafts and list them.

## Step 6. Report

Write `reports/<YYYY-MM-DD>-<HHMM>.md` first, then print it as the last message. The file is written even when the run is cut short: if you stop for any reason (blocker, question for the person, error), write what you have under the same headings with a first line saying why the run ended. Five fixed sections, all present even when empty:

1. **Needs your attention.** Offers and anything with money attached (even if already answered), applications stopped at a question the profile does not cover, blocked sources with URLs, expired logins.
2. **Replied.** Who, which channel, and every sent text quoted in full, including cover notes typed into forms when they said anything beyond the standard line. This is how the person sees what went out in their name. Interviews booked with date, time, time zone. Assessment deadlines.
3. **Rejections.** Company, reason recorded.
4. **Applied.** Company and role, one line each, with the CV version used.
5. **Skipped.** Company and a one-word reason, one line each.

If anything in this run taught you something about a platform, add it to `sources.md` under that source's notes (or to `docs/platform-notes.md` if it is general), one line, with the date. A source that produced nothing relevant for two runs in a row gets a "candidate for removal" note; the person decides.
