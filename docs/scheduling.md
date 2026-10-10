# Running the sweep twice a day

The sweep is the `/autopilot-jobsearch:sweep` skill (`/sweep` inside a clone). The routine prompt in `routines/sweep.md` only changes into the workspace and runs it, so there is one source of truth. Morning and evening work well: the morning run catches overnight mail and fresh postings, the evening run catches replies and the day's postings.

## Claude Code desktop app: scheduled task

1. Open the workspace folder in the desktop app (the folder with `profile.md`; the plugin's MCP servers come from its `.mcp.json`, so the task must run in that folder).
2. Create a scheduled task with the first paragraph of `routines/sweep.md` as the prompt, with the absolute path of your workspace filled in. Without the plugin, use the second paragraph, which reads the skill file from the clone by path.
3. Schedule: `12 9,19 * * *` (09:12 and 19:12 local time) or whatever suits you.
4. The task runs in its own session; the first run asks for tool permissions once. Approve the Playwright, JobCubby, mail and calendar tools for the task.

Reports land in `reports/`, so a run you did not watch is still readable.

## Any machine: cron with headless Claude Code

```bash
# crontab -e
12 9,19 * * * cd /absolute/path/to/workspace && claude -p "run /autopilot-jobsearch:sweep here" --permission-mode acceptEdits >> reports/cron.log 2>&1
```

Headless runs cannot answer permission prompts; pre-approve the tools the sweep needs in `.claude/settings.local.json` or run once interactively and accept them. The machine must be awake at run time (on a laptop, use the OS's wake schedule or run the task only while you work).

## What a run needs

- The Playwright browser profile logged in to every `login: yes` source (`/init` step 3).
- JobCubby authorized in this clone.
- Mail and calendar connectors enabled in the session that runs the task.
- About 20 to 60 minutes per run with ten to fifteen sources; the coverage rule in `rules.md` says a run finishes every source, so give it time rather than a short timeout.
- Cost: measured over my own runs on a Sonnet-class model at high effort, a run reads 170 to 480 million cached tokens and costs between 15 and 100 dollars, typically around 40. Two runs a day is a real budget line. The levers are in `docs/platform-notes.md` under context hygiene; the biggest ones are not snapshotting list pages and not re-reading the tracker dump.
- Subscription limits: a run that starts after the weekly or daily usage limit is hit produces a one-line reply and nothing else, and the task scheduler still marks it as succeeded. The sweep writes a "run skipped" report for this case; check `reports/` when a day looks quiet.
