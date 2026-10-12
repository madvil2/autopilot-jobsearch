# Sweep: the rare events

`/sweep` reads the matching section when one of these shows up.

## An offer arrives

Reply warm and short in the thread's language: thank you, I am glad about it, I look forward to the draft contract. Nothing about accepting, nothing about money, no decision date named by us; if they ask for one, ask how long I have. Then: status `offer` with the terms in `offer_details`, a calendar event for any deadline they named ("Putting an event in the calendar" below), a timeline event, and escalate the offer with every number. Nothing is withdrawn. `/offer` takes it from there.

## A posting accepts applications only by email

Write the mail per "Email application" in `${CLAUDE_PLUGIN_ROOT}/.claude/skills/cover-letter/SKILL.md` and save the body as `cover-letters/<company>-<role>.txt`. Send it from the workspace with the mail script, never the mail connector; the script reads the sender and the transport (`MAIL_TRANSPORT`) from `.mail.env` and every attachment from disk. Without `.mail.env`, or when the script says this machine has no mail transport (Linux), escalate the posting, its address and the saved body instead, for the person to send.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" send --to <address> --subject "Application as <exact title>" --body-file cover-letters/<company>-<role>.txt --attach cv/<file for the market>.pdf
```

Attach the CV version for this market and language, chosen and checked as in sweep step 5. When the posting asks for certificates, diplomas, transcripts or other proof, add one `--attach documents/<file>` per file as listed under Files in `profile.md`. On success the script prints "sent via Mail.app" or "sent via Outlook" and the recipients. It refuses a body with an em-dash or a double hyphen: fix the text and send again. Quote the full text in the report under `[applied]` and log the application per step 5.7 of the sweep, with `follow_up_at`: this is a human thread.

## A rejection after a call or an interview

Per `docs/rules.md` "Replying and scheduling": one short, warm reply in the thread's language, thanking them for the time and the process and asking for one or two points of feedback on what would have made the difference. No argument, no second ask. Log the event. Feedback that comes back later goes into the application's description and into the next `/debrief` or `/stack-radar` run.

## A booked slot has to move

As early as possible, in the thread's language: apologise once, give the reason in one line if there is one, and offer the alternative slots `docs/rules.md` "Replying and scheduling" asks for, each with its time zone. Update the interview in the tracker once they confirm, and move the calendar event ("Putting an event in the calendar" below).

## Nobody joined the call

When the person reports it afterwards or the mail thread shows it: fifteen minutes after the start, one polite mail asking whether I had the right link and offering to reschedule. Log the event; the interview stays open until they answer.

## A question the profile cannot answer

A form or a recruiter asks for a fact that is not in `profile.md` (a messenger handle, a certificate, a licence, a salary in an unusual currency, a legal detail). Stop that application or that reply, escalate exactly what was asked, and move on. No guess, no placeholder.

## A commitment is requested

Anything on the commitment list in `docs/rules.md` "Replying and scheduling", including paid platform features, paid tests and paid courses: reply that I will confirm shortly and escalate the question.

## An assessment or take-home arrives

Per `docs/rules.md` "Replying and scheduling" (accept, ask for the deadline if none was given, never solve it): log the event, create a calendar event for the deadline (a 30-minute event ending at the deadline with a reminder a day before, `--alarm 1440` with the script), and move the application to `screening`.

## Putting an event in the calendar

Every calendar event (a booked interview, an assessment deadline, an offer deadline, a start date) goes through the path in `.calendar.env` (`CALENDAR_VIA`). Titles are "Interview <Company>, <round>" and "Deadline <Company>, <what>", with no em-dash or double hyphen; the meeting link goes in the event, and a reminder 30 minutes before (a day before for a deadline).

**`CALENDAR_VIA=app`**: the calendar script, which writes into the calendar named by `CALENDAR_NAME`. Look first, then add:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/calendar.mjs" find --from 2026-10-14T00:00:00+02:00 --to 2026-10-15T00:00:00+02:00 --match "<Company>"
node "${CLAUDE_PLUGIN_ROOT}/scripts/calendar.mjs" add --title "Interview <Company>, <round>" --start 2026-10-14T10:00:00+02:00 --duration 60 --url <meeting link> --notes "<role> with <interviewer>, prep in prep/<company>.md"
```

Every time carries the offset of the time zone the slot was confirmed in; the script refuses a bare local time and prints times in this machine's time zone. The alarm defaults to 30 minutes before; `--alarm <minutes>` changes it. `--notes-file <path>` takes longer notes from a file.

`add` prints `added: <title> <start> (<calendar>)` when it created the event, and `exists: <title> <start>` when an overlapping event with a matching title, or one starting in the same minute, is already there; then nothing is created, which is fine. To move a slot, `remove --title "<exact old title>" --start <old start>` (exact title at that exact start only), then `add` the new one.

**`CALENDAR_VIA=connector`**: the calendar connector in the session. Search the calendar for that day and company first and create the event only when none is there, with the link in the description and the reminder set. To move a slot, update the existing event to the new time.

## A platform shows a logged-out state, a challenge page or a quota wall

Skip that source or that application, escalate it with the URL, continue. Never try to get past a challenge page and never pay for anything; credentials per `docs/rules.md` "Running".

A captcha on submit, after the form is filled, is the one case where the work is kept: leave that tab exactly as it is (form filled, CV attached, captcha unsolved), open a new tab with `browser_tabs` and carry on there for the rest of the run. Never close or reload that tab. Escalate the company, the posting URL and "form filled, captcha in the open Playwright tab"; log the application as `saved` with the same note.
