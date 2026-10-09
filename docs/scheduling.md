# Running the sweep twice a day

The sweep is the `/sweep` skill. The routine prompt in `routines/sweep.md` only changes into the clone and runs it, so there is one source of truth. Morning and evening work well: the morning run catches overnight mail and fresh postings, the evening run catches replies and the day's postings.

## Claude Code desktop app: scheduled task

1. Open the clone in the desktop app.
2. Create a scheduled task with the contents of `routines/sweep.md` as the prompt, with the absolute path of your clone filled in.
3. Schedule: `12 9,19 * * *` (09:12 and 19:12 local time) or whatever suits you.
4. The task runs in its own session; the first run asks for tool permissions once. Approve the Playwright, JobCubby, mail and calendar tools for the task.

Reports land in `reports/`, so a run you did not watch is still readable.

## Any machine: cron with headless Claude Code

```bash
# crontab -e
12 9,19 * * * cd /absolute/path/to/autopilot-jobsearch && claude -p "$(cat routines/sweep.md)" --permission-mode acceptEdits >> reports/cron.log 2>&1
```

Headless runs cannot answer permission prompts; pre-approve the tools the sweep needs in `.claude/settings.local.json` or run once interactively and accept them. The machine must be awake at run time (on a laptop, use the OS's wake schedule or run the task only while you work).

## What a run needs

- The Playwright browser profile logged in to every `login: yes` source (`/init` step 3).
- JobCubby authorized in this clone.
- Mail and calendar connectors enabled in the session that runs the task.
- About 20 to 40 minutes per run with ten to fifteen sources; the coverage rule in `rules.md` says a run finishes every source, so give it time rather than a short timeout.
