---
name: profiles
description: Keep the platform profiles (LinkedIn in detail, every other board in sources.md by checklist) consistent with the CV: same title, photo, stack keywords, dates, location per market. Generates the LinkedIn headline, About and experience texts and applies them with the person's go.
---

# /profiles

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

Every platform profile is a teaser for the CV: same facts, shorter, with the words recruiters search for.

Run it after every change to `cv/base.md` or `profile.md`. Arguments: `/profiles` (LinkedIn), `/profiles all` (LinkedIn plus the checklist for every `login: yes` source in `sources.md`), `/profiles <platform>`.

## LinkedIn

Read `profile.md`, `cv/base.md` and the latest `/stack-radar` output if one exists. Produce the texts, show them, and apply them in the Playwright browser: open each section's edit dialog, replace the text, save, verify on the public profile view. The agent does the editing on every platform; the person is told only what sits behind a confirmation code or a challenge page.

1. **Photo**: the same photo as the CV.
2. **Name**: exactly as in the CV.
3. **Headline**: the CV title line, no level unless the profile allows it. Optionally a short tail with the main stack in brackets.
4. **About**, three paragraphs, first person, no buzzwords:
   - Who I am: role, years, core area; what I am doing now or did last, with one number. One personal line is fine if it is specific.
   - Stack: "I work with ..." followed by the technologies from the CV skills line, in the profile's order, separated by commas or bars, no years.
   - Industries and settings: the kinds of companies and products I have worked for (startups, scale-ups, fintech, consumer apps), where, in what kind of environment.
5. **Experience**: roles, companies and dates copied 1:1 from the CV. One line per role, no bullet lists.
6. **Skills**: the technologies from the CV, plus the top tags from `/stack-radar`, spelled exactly as postings spell them, added and ordered by the agent. Endorsements come from other people: tell the person which five skills are worth asking for.
7. **Certifications, languages, awards**: everything the CV lists, nothing it does not.
8. **Contact**: the profile email, the GitHub link.
9. **Location**: the default city and phone from the location-by-market table, never a regional variant.
10. **Open to work** settings: titles from the profile targets, locations per the location-by-market table, work modes from the profile.
11. **Résumé for Easy Apply**: upload the current CV PDF in the job application settings.

Then a short consistency report: what changed on each platform, what still differs from the CV, and the few things only a human can do (endorsement requests, a verification code).

## Other platforms

For every `login: yes` source in `sources.md` that has a profile (XING, Djinni, hh.ru, Wellfound, Instaffo, getmatch and similar), open the profile's edit pages and bring each item below in line with the CV, in the platform's language, then verify on the public view and report what changed:

- Title identical to the CV title (translated for the platform's language).
- Photo identical to the CV photo.
- City and phone per the location-by-market table in `profile.md`; the "about" text agrees with the city.
- Stack line in the profile's order, exact spellings, years from the profile table.
- Exactly one CV uploaded, the version for that market; delete duplicates.
- Dates and employers identical to the CV.
- Visibility set to the widest setting the platform offers.

## Social media hygiene

Remind the person once that recruiters read their other public profiles too (Instagram, Facebook, X, GitHub bio) and anything controversial, sloppy or unprofessional costs interviews. Leave those accounts untouched.
