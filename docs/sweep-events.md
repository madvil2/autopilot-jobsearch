# Sweep: the rare events

The sweep skill keeps the twice-daily path short. The situations below happen a few times a month; the skill points here when one of them shows up, so the instructions are read only then.

## An offer arrives

Reply warm and short in the thread's language: thank you, I am glad about it, I look forward to the draft contract. Nothing about accepting, nothing about money, no decision date named by us; if they ask for one, ask how long I have. Then: status `offer` with the terms in `offer_details`, a calendar event for any deadline they named, a timeline event, and the offer at the top of the report with every number. Other processes keep running; nothing is withdrawn. `/offer` takes it from there.

## A posting accepts applications only by email

Compose the mail per the email variant in `/cover-letter`: subject "Application as <exact title>", greeting to the named person or "<Company> Team", one line of who I am (title and years from the profile, stack in the profile's order) and that I am applying for <title> found on <source>, one or two sentences of proof matching their asks, that the CV is attached, thank you, looking forward to discussing how I can contribute. Save the body as `cover-letters/<company>-<role>.txt` (it is the cover letter for that posting, and the data history keeps a copy), then send it from the workspace with the mail script, which reads the account from `.mail.env` and every attachment from disk:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" send --to <address> --subject "Application as <exact title>" --body-file cover-letters/<company>-<role>.txt --attach cv/<file for the market>.pdf
```

Attach the CV version for this market and language. When the posting asks for certificates, diplomas, transcripts or other proof, add one `--attach documents/<file>` per file as listed under Files in `profile.md`. The script prints the message id and the recipient on success; it refuses a body with an em-dash or a double hyphen, so fix the text and send again rather than working around it. Quote the full text in the report under Applied and log the application like any other, with `applied_at` and `resume_id`. Never send an application through the mail connector tool: it takes an attachment only as base64 inside the tool call, which costs tens of thousands of tokens per CV and fails often. Only when `node "${CLAUDE_PLUGIN_ROOT}/scripts/mail.mjs" check` fails (no `.mail.env` in the workspace; `/init` sets it up) does the posting go to "Needs your attention" with the address and the posting URL instead.

## A rejection after a call or an interview

Form-stage auto-rejections get nothing. A no after a screening call, a technical round or an interview gets one short, warm reply in the thread's language: thank you for the time and the process, and a request for one or two points of feedback on what would have made the difference. No argument, no second ask. Log the event. When feedback comes back later, it goes into the application's description and into the next `/debrief` or `/stack-radar` run.

## A booked slot has to move

As early as possible, in the thread's language: apologise once, give the reason in one line if there is one, offer three concrete alternative slots within the next five workdays, each with the time zone. Never a bare cancellation. Update the interview in the tracker and the calendar once they confirm.

## Nobody joined the call

Not the sweep's job during the call, but when the person reports it afterwards or the mail thread shows it: fifteen minutes after the start, one polite mail asking whether I had the right link and offering to reschedule. Log the event; the interview stays open until they answer.

## A question the profile cannot answer

A form or a recruiter asks for a fact that is not in `profile.md` (a messenger handle, a certificate, a licence, a salary in an unusual currency, a legal detail). Stop that application or that reply, write exactly what was asked under "Needs your attention", and move on. Never guess, never invent, never answer with a placeholder.

## A commitment is requested

Employment form (contractor, own legal entity, agency, fixed-term), taxes, visa, relocation, working days or hours, equity terms, anything that costs money (paid platform features, paid tests, paid courses). Reply that I will confirm shortly, put the question at the top of the report. The decision is mine.

## A posting worth an outreach

Strong match, a company small enough that the department head is findable, a role clearly inside one team, no giant ATS funnel. Up to three per run go into the report's "Worth an outreach" section with the posting URL and one line of why. `/outreach` does the rest; the sweep still applies through the normal path.

## An assessment or take-home arrives

Accept, ask for the deadline if none was given, log the event, create a calendar event for the deadline, move the application to `screening`. The sweep never solves it.

## A platform shows a logged-out state, a challenge page or a quota wall

Skip that source or that application, say so at the top of the report with the URL, continue. Never type credentials or codes, never try to get past a challenge page, never pay for anything.

A captcha on submit, after the form is filled, is the one case where the work is kept: leave that tab exactly as it is (form filled, CV attached, captcha unsolved), open a new tab with `browser_tabs` and carry on there for the rest of the run. Never close the tab, never reload it. Under "Needs your attention" write the company, the posting URL and "form filled, captcha in the open Playwright tab"; the person solves the captcha and clicks submit. Log the application as `saved` with the same note. If the tab turns out to be gone when the person looks, the URL in the report is enough to redo it.
