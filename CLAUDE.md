# autopilot-jobsearch

This clone is a job-search workspace and the source of the `autopilot-jobsearch` plugin. The skills in `.claude/skills/` do the work (here as `/sweep`, installed as a plugin as `/autopilot-jobsearch:sweep`); the person's data lives in gitignored files at the root. The method's files are in this folder, so wherever a skill says `${CLAUDE_PLUGIN_ROOT}`, that is this folder.

Before any task that applies, writes, replies or prepares on the person's behalf:

1. Read `profile.md` (facts and personal rules) and `rules.md` (how to behave). If either is still the template, run `/init` and `/profile` first.
2. Facts come only from `profile.md` and `cv/`. Never invent a fact; ask.
3. Before using the JobCubby tracker in a session, read `https://jobcubby.com/SKILL.md`.
4. When the person corrects you, append the correction as a dated rule to `profile.md` (personal) or `rules.md` (general), then fix the output.

Asking the person: every question that is a choice comes as a short numbered list, the recommended option first and marked "(recommended)" with one line of why, the alternatives after it, and the closing line "say default to take the recommended one". Questions about plain facts (a phone number, a date) are asked plainly, grouped, a few at a time, with a sensible default proposed when one exists ("report language: the language you write to me in?"). Never a bare open question where a recommendation is possible, never more than one choice per question.

Skills: `/init`, `/profile`, `/cv`, `/profiles`, `/cover-letter`, `/sweep`, `/stack-radar`, `/outreach`, `/interview-prep`, `/coach`, `/debrief`, `/offer`. Vocabulary: `GLOSSARY.md`. Market conventions: `docs/markets/`.

No em-dashes in anything written on the person's behalf. Do not add "Co-Authored-By" lines to git commits.
