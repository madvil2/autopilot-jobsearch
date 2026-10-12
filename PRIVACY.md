# Privacy

Last updated: 2026-10-13

autopilot-jobsearch is a Claude Code plugin: a set of skills, templates and local scripts. It has no server, collects nothing and sends nothing to its author. The author receives no data from you.

## Where your data lives

Everything the skills write (`profile.md`, `rules.md`, `sources.md`, CVs, cover letters, interview prep, recordings, transcripts, reports) stays in your workspace folder on your machine. In a clone of this repository those files are gitignored, so they never go into the method repo.

If you choose it in `/init`, `scripts/data` keeps a history of those files in a separate git and pushes it to a private GitHub repository that you create and own. Without that choice, nothing leaves the folder this way.

Interview recordings are transcribed on your machine with stable-ts.

## Services you connect

The agent acts through services you connect and log in to yourself:

- JobCubby, the job tracker, through its MCP endpoint.
- Job boards, through the Playwright browser on your machine, which keeps its own local browser profile with your logins.
- Your mail and calendar, either through the mail and calendar app on your machine (`scripts/mail.mjs`, `scripts/calendar.mjs`) or through the claude.ai connectors you enable.

Each of these services has its own privacy policy. The agent sends them data only to do what you set it up for: applications, replies to recruiters, tracker entries and calendar events.

Claude Code itself processes the conversation under Anthropic's terms and privacy policy.

## Credentials

The agent never types a password, a one-time code or a payment detail; when a login is needed, it stops and tells you. You log in to each service yourself. The plugin's settings deny the agent read access to `.mail.env`.

## Contact

Questions and requests: [GitHub issues](https://github.com/madvil2/autopilot-jobsearch/issues).
