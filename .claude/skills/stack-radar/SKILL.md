---
name: stack-radar
description: Count which technologies the postings I apply to actually ask for, compare with my CV, and propose the tags to add plus a short learning plan for each gap. Keeps the CV screening-proof in the age of AI resume filters.
---

# /stack-radar

Files: the method's own files (`templates/`, `scripts/`, `docs/`, `examples/`) live in the plugin root, written here as `${CLAUDE_PLUGIN_ROOT}`; when that text is not replaced by an absolute path, the method root is the clone this skill file sits in. Everything personal (`profile.md`, `rules.md`, `sources.md`, `cv/`, `cover-letters/`, `prep/`, `photos/`, `documents/`, `transcripts/`, `reports/`) lives in the workspace, the current folder; every relative path below is relative to it. Before doing anything on the person's behalf, read `profile.md` and `rules.md`: facts come only from them, choices are asked the way `rules.md` says, and a correction from the person becomes a dated rule there.

Screening is done by software first. A CV that does not carry the exact words the postings use does not reach a human. This skill finds those words from the postings I already applied to, so the tags reflect the jobs I want, not a generic list.

Arguments: `/stack-radar` (last 90 days, target role from `profile.md`), `/stack-radar 180d`, `/stack-radar backfill` (see below).

## 1. Collect

- `list_applications` with `range` = the window, statuses `applied`, `screening`, `interview`, `rejected`. Keep those whose role matches the profile's target roles (loose title match).
- For each, `get_application` and take its `requirements` list and, if present, the description. JobCubby rate-limits per minute; pace the loop, and tell the person how many applications are being read.
- Also read `get_job_stats` for each of the profile's main technologies for market-wide counts and median salary.

## 2. Normalize

Map spellings to one canonical name before counting. Shipped aliases (extend in this file when you meet new ones):

| Canonical | Also seen as |
|---|---|
| TypeScript | TS, Typescript |
| JavaScript | JS, ES6, ES2015+, ECMAScript |
| React | React.js, ReactJS |
| Next.js | NextJS, Next |
| Node.js | Node, NodeJS |
| NestJS | Nest, Nest.js |
| Vue | Vue.js, VueJS, Nuxt (count Nuxt separately too) |
| Angular | AngularJS (separately), Angular 2+ |
| PostgreSQL | Postgres, PSQL |
| CI/CD | CI, CD, continuous integration, continuous delivery |
| GraphQL | Apollo (count separately too) |
| Playwright | Playwright Test |
| Cypress | Cypress.io |
| Kubernetes | K8s |
| AWS | Amazon Web Services |
| Tailwind CSS | Tailwind, TailwindCSS |
| REST APIs | REST, RESTful |
| LLM tooling | LangChain, LangGraph, OpenAI API, Anthropic API, MCP (list each separately as well) |

Drop non-technologies (Agile, Scrum, "team player"). Keep tools that postings treat as skills (Figma, Jira) in a separate "tools" group.

## 3. Compare

Read the Technical Skills section of the chosen CV version (`cv/base.md` unless told otherwise). Produce one table:

| Technology | Share of postings | In CV | Action |
|---|---|---|---|

Share = postings mentioning it divided by postings read. Sort by share. Action is one of: `keep`, `add tag`, `move up` (asked for more than its position in the CV suggests), `learn then add`.

Rule from `rules.md` and `/cv`: a technology goes into the CV only when the person confirms they can discuss it on a call. So split the proposals:

- **Add now.** Things they have used, even lightly, that are missing or spelled differently. Propose the exact tag and which skills line it goes on.
- **Learn, then add.** For each, a plan: what it is in two lines, the smallest real thing to build with it (two or three hours), what an interviewer asks about it, and the suggested tag wording once done. Ask the person to confirm each one when finished; then `/cv` adds the tag.

Show the table, the two lists, and the market stats (postings and median salary for the main stack). Then one choice in the format from `CLAUDE.md`: 1. apply the "add now" tags to the CV through `/cv` immediately (recommended: screening software reads the CV today); 2. show the exact diff first; 3. do nothing yet.

## Backfill

Applications created before the sweep started storing requirements have an empty list. `/stack-radar backfill` opens each such posting URL (from the window) in the Playwright browser, reads the description if the posting is still live, extracts the technologies, and writes them back with `update_application` (requirements, and description if it was empty). Dead postings are skipped with a count. Pace to the rate limit.
