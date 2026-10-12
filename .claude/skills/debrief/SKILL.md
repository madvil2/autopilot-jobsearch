---
name: debrief
description: After an interview: transcribe the OBS recording with stable-ts, grade the call against the coach rules with quotes and timestamps, pull out every fact the interviewer revealed, update the prep file and JobCubby, and mark the interview complete.
---

# /debrief <company> [recording file]

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

Recordings live in `recordings/`, transcripts in `transcripts/`. Setup and commands are in `docs/recording-and-transcription.md`; read it when the person has not recorded before.

## 1. Before the call (when asked)

Walk through the OBS setup from the doc: one scene with the screen, the microphone and the system audio, full resolution, 30 fps, recording to `recordings/`. Do a ten-second test, play it back, confirm both voices are audible. Remind: start recording before joining the call.

## 2. Transcribe

From the doc: extract audio with ffmpeg, run stable-ts (medium model by default; large-v3 when the audio is noisy), produce `transcripts/<company>-<date>.txt` with timestamps. Deduplicate repeated segments. If the first minute is silence, tell the person the call started before the recording.

## 3. Facts

Read the transcript and list everything the interviewer revealed: team size and roles, process and next rounds, timeline for a decision, salary or range named by either side, open positions, product priorities, who decides. Write them into section 8 of `prep/<company>.md` and into the JobCubby application description (the running fact sheet), with a timeline event "Interview done, debrief in prep/<company>.md".

## 4. Grade against the coach

Use `.claude/skills/coach/SKILL.md`. For each item give a verdict, a quote with its timestamp, and the better line:

- Intro: started with what I own now, under 90 seconds, one number, one memorable detail, languages once.
- Why this company: my motivation, a concrete product detail, right frame for the company type.
- Clarifying questions before every technical answer; stages named before details.
- Silences longer than five seconds; any "I don't know" ending; any switch out of the interview language.
- Gaps or constraints volunteered that nobody asked about.
- Salary: one number, not a range; equity questions asked if relevant.
- Questions at the end, the next-steps question, the fade-out.

Then three lines: what went well, the one thing to fix first, how to practice it this week (tie it to the daily protocol).

## 5. Close the loop

- `complete_interview` with a short outcome ("done, waiting for feedback" or what they said).
- If a next round was named: `schedule_interview` if a time exists, otherwise a timeline event with the expected date, and a calendar event through the calendar path from `.calendar.env` when the slot is known (recipe in `docs/sweep-events.md` under "Putting an event in the calendar").
- If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "debrief <name>"`.
- If a rule emerged from the mistake ("never do X again"), append it to `profile.md` personal rules with the date.
