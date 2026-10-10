---
name: interview-prep
description: Prepare one interview: research the company, write prep/<company>.md from the template with my fixed intro, the why-company answer in the right order, likely questions, a technical cheat-sheet when needed, and my questions for them. Logs the interview in JobCubby and the calendar.
---

# /interview-prep <company> [round] [date time]

Output: `prep/<company>.md` from `templates/prep.md`. Read `profile.md`, `rules.md` and `.claude/skills/coach/SKILL.md` first; the prep applies the coach method to one company.

## 1. Facts

- From JobCubby: `get_application` for the company (description is the running fact sheet: names, numbers said, stages), the posting text, `list_interviews` for the slot, `list_contacts` for the interviewer.
- From the web: what they build and for whom, how they make money, size, funding and founders, where the team sits, stack (job postings, engineering blog, GitHub), the interviewer's role and background from their public profile.
- Their **core idea in one line**. This is the domain trap: a clarifying question or a proposal that goes against what the company is built on costs the interview. Write it down so it cannot happen.
- Ask the person to open the product the day before and tell you **one concrete detail** they noticed. Put it in the file verbatim as the opening of the why-company answer.

## 2. Write the file

Follow `templates/prep.md` section by section:

- **Intro**: paste the self-introduction from `profile.md` unchanged. Add a 60-second cut for short screens. Never rewrite the intro per company.
- **Why this company**: four points in this order, stability, team, growth, money last (money only if asked). Each point is one fact about them plus one sentence of what it means for me. No essay about their industry. Then the two concrete reasons from `/coach` A2b, written out.
- **Why I fit**: map two or three CV results to the posting's top asks. Add the bridge for any stack gap, with the story of the last time I learned a new stack fast.
- **Likely questions**: fill the table from `profile.md` interview facts: why the last job ended, what since, hardest problem, strength and weakness, salary (the one figure for this market), availability, authorization, languages. Two or three sentences each, then silence. Example answers in STAR shape (situation, task, action, result with a number), action and result carrying most of the words.
- **Culture-fit or final round**: add the names of everyone met so far in the process, two personal specifics I can share when asked about myself (where, with whom, when), and the reminder to say out loud that I want the job and intend to stay. The day before, connect with the interviewers on LinkedIn with a one-line note.
- **Technical** (technical rounds): a cheat-sheet of the five things most likely to come up in their stack, one line each; the three-step method and five clarifying-question categories from `/coach`; one system-design question in their domain to practice aloud.
- **My questions**: the four universal ones from the template plus two specific to them (early startup: who writes the code today, biggest technical challenge, runway; big company: team size and split, how separate this product is, office expectation). The last one is always the next-steps question.
- **Checklist**: keep as in the template.

Keep the file under two screens. It is read the day before and closed before the call; the coach's rule is no notes during the interview.

## 3. Log

- If the interview is not in JobCubby yet: `schedule_interview` with date, time, round, type, meeting link, interviewer. Move the application to `interview`.
- Calendar: create the event with the link and a reminder, unless an event for that company and time already exists. Add a timeline event "Prep written: prep/<company>.md".
- Tell the person the three things to do before the call: read the core idea, open the product and find the detail, rehearse the intro aloud once. For a final round, add: connect with the interviewers on LinkedIn today.
