# autopilot-jobsearch

This clone is a job-search workspace and the source of the `autopilot-jobsearch` plugin. The skills in `.claude/skills/` do the work (here as `/sweep`, installed as a plugin as `/autopilot-jobsearch:sweep`); the person's data lives in gitignored files at the root. The method's files are in this folder, so wherever a skill says `${CLAUDE_PLUGIN_ROOT}`, that is this folder.

Plugin users never see this file, so every rule for acting on the person's behalf lives in `docs/rules.md`, which every skill reads first; put new method rules there. Vocabulary: `GLOSSARY.md`. Market conventions: `docs/markets/`.

Commits carry no "Co-Authored-By" lines.
