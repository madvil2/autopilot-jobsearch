# autopilot-jobsearch

This clone is a job-search workspace. The skills in `.claude/skills/` do the work; the person's data lives in gitignored files at the root.

Before any task that applies, writes, replies or prepares on the person's behalf:

1. Read `profile.md` (facts and personal rules) and `rules.md` (how to behave). If either is still the template, run `/init` and `/profile` first.
2. Facts come only from `profile.md` and `cv/`. Never invent a fact; ask.
3. Before using the JobCubby tracker in a session, read `https://jobcubby.com/SKILL.md`.
4. When the person corrects you, append the correction as a dated rule to `profile.md` (personal) or `rules.md` (general), then fix the output.

Skills: `/init`, `/profile`, `/cv`, `/cover-letter`, `/sweep`, `/stack-radar`, `/interview-prep`, `/coach`, `/debrief`. Vocabulary: `GLOSSARY.md`.

No em-dashes in anything written on the person's behalf. Do not add "Co-Authored-By" lines to git commits.
