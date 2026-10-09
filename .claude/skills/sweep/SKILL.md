---
name: sweep
description: One full pass of the job search: answer mail and recruiter messages, send due follow-ups, pull JobCubby matches, visit every source in sources.md, apply with Playwright, log everything to JobCubby and the calendar, save a report. Runs by hand or twice a day as a scheduled task.
---

# /sweep

You are running the job search for the person described in `profile.md`, under the rules in `rules.md`, across the sources in `sources.md`. Work autonomously and report at the end. Read all three files before doing anything, plus `docs/platform-notes.md` for platform quirks. If you have not used JobCubby in this session, read `https://jobcubby.com/SKILL.md` first.

## Coverage, non-negotiable

Every run gets through every source in `sources.md`, in the same run. Tool-call cost is never a reason to stop early or to "do the rest next time." A genuine blocker (logged-out session, challenge page, site down) skips that one source with a note; it never stops the run. "Browser is already in use" is not a blocker, it is a chore: fix it with the recipe in `docs/platform-notes.md` and carry on.

Use the Playwright browser for everything that needs a session or a file upload. Other browsers cannot upload a CV; use them only to read.

## Step 1. Mail

Search the inbox for the last day. Open anything that looks like a status change (rejection, invite, screening request, assessment link) or a question. Ignore alerts, newsletters and marketing.

- Status changes: find the application (`list_applications`, loose company matching per `rules.md`) and update it: `update_application_status` with the right status and, for rejections, one of the five reasons. Add a timeline event with the real time.
- Questions and invites: answer per "How to reply" below, in the same run.

## Step 2. Messages on platforms

Every source of type `inbox` in `sources.md`: LinkedIn messaging and any platform inbox. Reply to everyone who asks something. A recruiter who pinged twice without an answer is a lost process. If a recruiter sends a direct application link, apply through it too.

## Step 3. Due follow-ups

`list_applications` with status `applied` or `screening`; for each whose follow-up date has passed and that has a human thread or a named contact (not an ATS-only submission), send one short nudge in the thread's language, log the event, and set the next follow-up date two weeks out. Skip ATS-only applications silently.

## Step 4. JobCubby index

Run each saved search (`list_saved_searches`, `run_saved_search`) and read `list_matches`. For each posting that matches the profile targets: `save_posting`, then apply through the posting URL like any other board posting. Note each match's listed gaps for `/stack-radar` (put them in the application's requirements).

## Step 5. Boards

Before applying anywhere, call `list_applications` once and keep the list for duplicate checks. For every source of type `board`, in order:

1. Open the URL with its filters. Read the list (scroll lazy lists; read titles from the item elements, not from the page summary).
2. For each posting from the last three days: open it, read the full description, decide.
3. **Apply if the stack matches** the profile targets. The level in the title is not a filter unless the profile's hard skip filters name it. Location is whatever the profile allows for this market.
4. **Skip** on a hard skip filter from `profile.md`, on a duplicate company, on a logged-out state, or on a posting that is a disguised agency repost with a generic title (open it, check the real stack).
5. Apply through the fastest path the source offers (easy apply, platform button, company form). Fill forms only from `profile.md`: facts, location and phone for this market, honest answers in structured fields, nothing volunteered in free text. Attach the CV version for this market and language; on platforms that pre-fill a stored file, remove it and upload the current one. Always add a cover note where a text box exists, in the posting's language, three or four sentences.
6. Confirm the application actually went through (success page, "applied" badge) before logging it.
7. Log it: `create_application` with company, role, posting URL, source, location, work mode, status `applied`, applied time, description (full posting text or its key sections), requirements (the technologies the posting names, as a list), salary min and max annual when shown, deadline when shown, the resume id of the CV version used, and follow-up date 7 days out. Duplicates per `rules.md` update the existing entry instead.

Then review existing `saved` applications: apply now if they still match, or leave a one-line note why not.

## How to reply

Applies to every channel. Content rules are in `rules.md` ("Writing on my behalf", "Replying and scheduling"). In short: same language as the thread, three or four sentences, answer what was asked, name the next step, nothing volunteered about gaps or location, no em-dashes.

- **Scheduling.** Booking pages (Calendly, cal.com, Zeeg, ATS schedulers) and proposed times by mail: take the earliest slot that fits the rules (at least 3 hours ahead, 09:00 to 19:00 local, 1 hour clear of interviews in `list_interviews`). Confirm with date, time and time zone. Then `schedule_interview` (round, type, link, interviewer) and a calendar event with the link and a reminder, after checking none exists for that company and time. Move the application to `interview`.
- **Assessments.** Accept, ask for the deadline if missing, log the event, create a calendar event for the deadline, move the application to `screening`. Do not solve it now.
- **Salary.** The figure from `profile.md` for this market, one number. If they name a range or an offer below it: interest plus a question about next steps, no counter, no decline, and put it at the top of the report.
- **Direct questions about stack, location, availability.** Answer directly from `profile.md`.
- Default is to send and quote the text in the report. If `rules.md` says drafts, create drafts and list them.

## Step 6. Report

Save to `reports/<YYYY-MM-DD>-<HHMM>.md` and show it. Short, five fixed sections:

1. **Needs your attention.** Offers and anything with money attached (even if already answered), applications stopped at a question the profile does not cover, blocked sources with URLs, expired logins.
2. **Replied.** Who, which channel, the sent text quoted. Interviews booked with date, time, time zone. Assessment deadlines.
3. **Rejections.** Company, reason recorded.
4. **Applied.** Company and role, one line each, with the CV version used.
5. **Skipped.** Company and a one-word reason, one line each.

If anything in this run taught you something about a platform, add it to `sources.md` under that source's notes (or to `docs/platform-notes.md` if it is general), one line, with the date.
