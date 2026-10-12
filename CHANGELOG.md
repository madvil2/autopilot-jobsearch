# Changelog

Notable changes to this project, in the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## 0.1.0 - 2026-10-12

The first release: the method as it stands after 93 real sweep runs (637 applications, 18 interviews booked).

### Skills

- Twelve skills: `init`, `profile`, `cv`, `profiles`, `sweep`, `cover-letter`, `interview-prep`, `debrief`, `coach`, `outreach`, `stack-radar`, `offer`.
- The sweep answers mail and recruiter messages, sends due follow-ups, pulls JobCubby matches, visits every source, applies with Playwright and logs to JobCubby and the calendar. The report file is created at the start and appended to after every action; a captcha on submit keeps the tab open for the person and the run continues.
- Profile and CV start from the CV the person already has and ask only for what is missing. Every choice is asked with a recommended option first and "say default".
- Interview prep carries the camera and room checklist and OBS recording of every call; the debrief grades the recording against the coach rules.
- Optional private history of the personal files (`scripts/data`), saved by the skills after they write.
- Email-only postings are applied to by the sweep through `scripts/mail.mjs`: Gmail SMTP with an app password in `.mail.env`, the CV attached from disk; `/init` sets it up and sends a test mail.
- The mail script sends through Mail.app on macOS or classic Outlook on Windows when no app password is set, since many Google accounts no longer offer one; SMTP stays the default with a password, `MAIL_TRANSPORT` forces a choice, and `MAIL_USER` must be an account the mail app has. The Outlook path is untested.
- `scripts/calendar.mjs` writes calendar events (interviews, assessment and offer deadlines, a start date) into Calendar.app on macOS or classic Outlook on Windows. `.calendar.env` names the calendar (a Google account added to macOS Internet Accounts syncs it to Google); `add` refuses a time without an offset and prints `exists:` instead of creating a duplicate; `find`, `remove`, `check` and `calendars` complete it. The Outlook path is untested.
- Mail reading, mail sending and the calendar are each one path chosen in `/init`: `MAIL_READ=connector|app` (a mail connector, or `scripts/mail.mjs list`, `show` and `reply` through Mail.app or classic Outlook), `MAIL_TRANSPORT=applemail|outlook|smtp`, and `CALENDAR_VIA=app|connector` (`scripts/calendar.mjs`, or a calendar connector); absent keys keep the earlier defaults.

### Renderer

- `scripts/render.mjs` turns `cv/*.md` and `cover-letters/*.md` into A4 PDFs through Chromium, with section labels per language and PNG previews through poppler.
- CV template: Roboto, single column, date column on the left, round photo with `photo_focus` and `photo_zoom`, entries that split across pages, 10.5pt. Photos are downscaled to 600px inside Chromium, so a CV PDF stays around 130 KB and uploads to the tracker.
- `npm test` renders the examples and checks page counts, sizes and text; `npm run lint` checks the skills and the README's images.

### Docs

- README: what it is, why it can be trusted, install, the skills by moment, what it will not do, with a preview of the rendered example CV.
- `docs/`: platform notes, scheduling, recording and transcription, sweep events, market notes (Germany first). `GLOSSARY.md` for the vocabulary.
- `examples/`: a fictional engineer's profile, CV (markdown and PDF, English and German), cover letter, prep file and sweep report.

### Plugin packaging

- Installs as a Claude Code plugin from this repository's marketplace; skills resolve the method root through `CLAUDE_PLUGIN_ROOT` and the workspace as the current folder, `mcp.json` is a template `/init` writes into the workspace, the renderer fetches Chromium on first use.
- CI on every push and pull request: lint, render the examples, compare the regenerated PDFs with the committed ones by page count and text layout.
