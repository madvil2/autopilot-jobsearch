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
