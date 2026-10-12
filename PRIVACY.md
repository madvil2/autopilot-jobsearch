# Privacy

Last updated: 2026-10-13

autopilot-jobsearch is a Claude Code plugin: a set of skills, templates and local scripts. It has no server, collects nothing and sends nothing to its author. The author receives no data from you.

## Where your data lives

Everything the skills write (`profile.md`, `rules.md`, `sources.md`, CVs, cover letters, interview prep, recordings, transcripts, reports) is stored in your workspace folder on your machine; what is sent from it, and where, is listed below. In a clone of this repository those files are gitignored, so they never go into the method repo.

If you choose it in `/init`, `scripts/data` keeps a history of those files in a separate git and pushes it to a private remote you own (by default a private GitHub repository `/init` creates for you with `gh`).

Interview recordings are transcribed on your machine with stable-ts.

## What is sent, and where

The agent acts through services you connect and log in to yourself, each under its own privacy policy:

- **JobCubby**, the job tracker, through its MCP endpoint, receives: tracker entries (applications, statuses, events, interviews); your CV as PDF and as text; your profile (headline, summary, skills, work history, education); your search preferences, including salary; offer terms; and the contacts `/outreach` finds (name, title, company, LinkedIn URL).
- **Job boards**, through the Playwright browser on your machine (its own local browser profile keeps your logins), receive your applications with your CV, cover letter and the facts their forms ask for, your replies in their message inboxes, and the profile texts and CV `/profiles` applies there.
- **Web research**: `/outreach` and `/interview-prep` open company pages and public profiles, LinkedIn ones from your logged-in account, so the people viewed can see your visit; `/stack-radar` reopens posting pages.
- **Mail**, through the mail app on your machine (`scripts/mail.mjs`) or a claude.ai mail connector you enable, sends your replies to recruiters and your email applications with the CV attached.
- **Calendar**, through the calendar app on your machine (`scripts/calendar.mjs`) or a claude.ai calendar connector you enable, receives interview, deadline and start-date events.

**Anthropic** processes the Claude Code conversation, including what the agent reads from your files, under its terms and privacy policy.

## Credentials

The agent never types a password, a one-time code or a payment detail; when a login is needed, it stops and tells you. You log in to each service yourself. The settings file `/init` installs denies the agent's Read tool access to `.mail.env`, and the skills never read it.

## Contact

Questions and requests: [GitHub issues](https://github.com/madvil2/autopilot-jobsearch/issues).
