---
name: debrief
description: Interview done: transcribe the recording, grade the call against the interview method's Rubric, record what the interviewer revealed, close the interview in JobCubby. Use after an interview, or when a recording or transcript is handed over.
---

# /debrief <company> [recording file]

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

Read `docs/recording-and-transcription.md` and `docs/interview-method.md`. If `prep/<company>.md` does not exist, create it from `templates/prep.md` with the header filled from JobCubby.

## 1. Before the call (when asked)

Walk the person through "OBS setup" in the recording doc, ending on the ten-second test with both voices audible.

## 2. Transcribe

Run the doc's per-recording commands on the file in `recordings/` (medium model; large-v3 when the audio is noisy). Read `transcripts/<company>-<date>.txt` for the content; take every timestamp from the `.srt` and the silences from step 4 of the commands. If the first minute is silence, tell the person the call started before the recording.

## 3. Facts

List everything the interviewer revealed: team size and roles, process and next rounds, timeline for a decision, salary or range named by either side, open positions, product priorities, who decides. Write them into section 8 of `prep/<company>.md` and into the JobCubby application description (the running fact sheet), with a timeline event "Interview done, debrief in prep/<company>.md".

## 4. Grade against the Rubric

Every line of the method's Rubric gets a verdict, a quote with its timestamp, and the better line; N/A only with the reason. Show the graded lines to the person.

Then write three lines into section 8 of the prep file and show them: what went well, the one thing to fix first, how to practice it this week (a B4 drill aimed at that thing).

## 5. Close the loop

- `complete_interview` with a short outcome ("done, waiting for feedback" or what they said).
- If a next round was named: `schedule_interview` if a time exists, otherwise a timeline event with the expected date, and a calendar event through the calendar path from `.calendar.env` when the slot is known (recipe in `docs/sweep-events.md` under "Putting an event in the calendar").
- If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "debrief <name>"`.
- If a rule emerged from the mistake, append it to `profile.md` personal rules with the date.
