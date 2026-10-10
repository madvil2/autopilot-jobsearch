# autopilot-jobsearch

My job search runs on autopilot with Claude Code. Twice a day an agent reads my mail and recruiter messages, answers them, checks every job board I care about, applies, books the earliest interview slot, logs everything to a tracker and my calendar, and leaves me a short report. Around that I keep a profile, a CV that renders to PDF, cover letters, interview prep files and recordings, all as markdown in this folder. This repository is that whole setup, with my data removed, so you can clone it and run yours.

I am doing this right now and improving it as I go. What is here is what I use.

## What it does

| Skill | What happens |
|---|---|
| `/init` | Creates your workspace files from templates, checks the tools, logs you in to your boards once |
| `/profile` | Interviews you and writes `profile.md`: every fact forms ask, your stack order, how you present per market, salary figures, your intro script |
| `/cv` | Builds your CV section by section, renders an A4 PDF, checks it against the rules, uploads it to the tracker |
| `/cover-letter` | Writes a three-paragraph letter for one posting and renders it next to the CV |
| `/sweep` | The twice-daily pass: mail, messages, follow-ups, tracker matches, every board, applications, bookings, report |
| `/stack-radar` | Counts which technologies the postings you applied to ask for, compares with your CV, proposes tags and a learning plan |
| `/profiles` | Keeps LinkedIn and every other board profile consistent with the CV: headline, About, experience, keywords, photo |
| `/outreach` | For postings that matter: finds the hiring manager and people who can refer you, writes the call script and the messages |
| `/interview-prep` | Researches the company and writes a prep file with your intro, the why-company answer, likely questions and your questions |
| `/coach` | My interview method: intro, why-company frames, the three-step method for technical questions, ten rules, salary, closing; `/coach mock` to practice |
| `/debrief` | Transcribes the recording, grades the call against the method, pulls out every fact they revealed, closes the loop in the tracker |
| `/offer` | When an offer arrives: the reply that keeps it warm, the contract checklist, the package evaluation, the questions to ask |

The example output lives in `examples/`: a fictional engineer's profile, CV ([markdown](examples/cv/base.md), [PDF](examples/cv/Alex_Mustermann_CV.pdf)), a cover letter, a prep file and a sweep report.

## How it works

- **The clone is the workspace.** Claude Code picks up the skills from `.claude/skills/` when you run it here. Your files (`profile.md`, `rules.md`, `sources.md`, `cv/`, `cover-letters/`, `prep/`, `photos/`, `documents/`, `recordings/`, `transcripts/`, `reports/`) are gitignored. `git pull` updates the method, never your data, and you can change the method and push it without ever touching your data.
- **Versioning your data (optional).** CV versions, prep files and sweep reports are worth a history. `scripts/data init` creates a second git (`.data.git/`, ignored by the method repo) that tracks only the personal paths in place, so the folder looks exactly the same. `scripts/data remote <url>` points it at a private remote, `scripts/data save` snapshots and pushes, and the sweep saves after every run on its own. `scripts/data log`, `diff`, `checkout` work like git. Nothing else in the repo depends on it.
- **Tracker: JobCubby.** I use [JobCubby](https://jobcubby.com/r/kostiantyn-53zr), a friend's platform, and it is excellent: a pipeline with statuses and timelines, interviews, contacts, résumé versions, a job index with AI matches against your profile, and an MCP endpoint with OAuth, so the agent reads and writes it directly. The `.mcp.json` in this repo already points at it. Honest note: the free plan caps the tracker at 15 applications and a sweep does that in a day, so a real search needs the Pro plan. That link is my referral. If you want a different tracker, fork and replace the JobCubby calls in the skills; the contract is small (create and update applications, statuses, events, interviews, résumés).
- **Browser: Playwright MCP.** Also in `.mcp.json`. It keeps its own browser profile, so you log in to each board once (`/init` opens the login pages and waits for you) and the sweep runs on your sessions after that. The agent never types a password.
- **Mail and calendar.** The claude.ai Gmail and Google Calendar connectors, or any mail and calendar MCP. The skills address them by what they do, not by tool name.
- **PDFs.** `scripts/render.mjs` turns `cv/*.md` and `cover-letters/*.md` into A4 PDFs through Chromium, with the layout in `templates/cv.html` and `templates/cover-letter.html`: Roboto, single column, date column on the left, photo top right, no tables, so parsers and humans both read it. Edit the HTML to change the design; the markdown contract stays.

## Getting started

```bash
git clone https://github.com/madvil2/autopilot-jobsearch.git
cd autopilot-jobsearch
npm install          # Playwright's Chromium for the PDF renderer
claude               # then: /init
```

Then `/profile`, `/cv`, fill `sources.md` with your boards, run `/sweep` once by hand, and schedule it (see `docs/scheduling.md`).

Requirements: Node 20+, Claude Code, a JobCubby account, Gmail and Google Calendar connectors (or equivalents). Optional: poppler for PDF previews (`brew install poppler`), OBS and `stable-ts` for recording and transcribing interviews (`docs/recording-and-transcription.md`).

## The daily rhythm

1. Morning sweep runs at 09:12. I read the report with coffee: what needs me (money, a question the profile could not answer, a blocked login), what was replied, who said no, where it applied.
2. Interviews get a prep file the day before (`/interview-prep`). I read it, open their product, find one detail, rehearse the intro aloud, and close the file before the call.
3. Every call is recorded. `/debrief` turns it into facts and three lines of feedback, and the tracker moves on.
4. Evening sweep at 19:12.
5. Once a month, `/stack-radar`: what the market asks for that my CV does not say yet, and what to learn.

## Layout

```
.claude/skills/      the twelve skills
templates/           blank workspace files with guidance, CV and letter HTML, section labels per language
scripts/             render.mjs (md to PDF), test.mjs, lint-skills.mjs
routines/sweep.md    the scheduled-task prompt (one paragraph: cd into the clone, run /sweep)
docs/                platform notes, scheduling, recording and transcription, market notes (Germany first)
examples/            a fictional person's complete set
fonts/               Roboto (Apache 2.0)
GLOSSARY.md          the vocabulary
```

`npm test` renders the examples and checks the PDFs. `npm run lint` checks the skills.

## License

MIT. Roboto is Apache 2.0.
