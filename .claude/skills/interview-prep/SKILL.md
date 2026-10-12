---
name: interview-prep
description: Interview booked: research the company and write prep/<company>.md for that round, then log it in JobCubby and the calendar. Use when a call, interview or round is scheduled or the person asks to prepare one.
---

# /interview-prep <company> [round] [date time]

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

Output: `prep/<company>.md` from `templates/prep.md`. Read `docs/interview-method.md` first; the prep applies it to one company.

## 1. Facts

- From JobCubby: `get_application` for the company (description is the running fact sheet: names, numbers said, stages), the posting text, `list_interviews` for the slot, `list_contacts` for the interviewer.
- From the web: what they build and for whom, how they make money, size, funding and founders, where the team sits, stack (job postings, engineering blog, GitHub), the interviewer's role and background from their public profile.
- Their **core idea in one line**, the domain trap: a clarifying question or proposal that goes against what the company is built on costs the interview.
- Ask the person to open the product the day before and tell you **one concrete detail** they noticed. Put it in the file verbatim. If they have no time, offer two details you found yourself as a choice.

## 2. Write the file

Follow `templates/prep.md` section by section:

- **Intro**: paste the self-introduction from `profile.md` unchanged. Add a 60-second cut for short screens.
- **Why this company**: as the why-company line in `docs/rules.md` says: the detail as the opening, the A2 frame for their company type, then the points in order, money only if asked. Each point is one fact about them plus one sentence of what it means for me. Then the two A2b reasons, written out.
- **Why I fit**: map two or three CV results to the posting's top asks. Add the A3 bridge for any stack gap, filled with the last time I learned a new stack fast.
- **Likely questions**: fill the table from `profile.md` interview facts. Salary: the figure already in the JobCubby fact sheet for this company, else the profile figure for this market. Stories in STAR, result with a number.
- **Final or culture-fit round**: everyone met so far in the process and two personal specifics.
- **Technical** (technical rounds): the five things most likely to come up in their stack, one line each; one system-design question in their domain to practice aloud.
- **My questions**: the four universal ones from the template plus two from A10 for their company type that their site and the posting do not answer. The last one is always the next-steps question.
- **Checklist** and **Debrief**: keep as in the template.

## 3. Log

- If the interview is not in JobCubby yet: `schedule_interview` with date, time, round, type, meeting link, interviewer. Move the application to `interview`.
- Calendar: the event through the calendar path from `.calendar.env` (`CALENDAR_VIA`), with the link and the prep path in the notes, per "Putting an event in the calendar" in `docs/sweep-events.md`. Add a timeline event "Prep written: prep/<company>.md".
- If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "prep <name>"`.
- Read the person the "Day before", "Camera and room" and "Recording" lines of section 7 of the prep file. If OBS is not set up yet, point at `docs/recording-and-transcription.md`.
