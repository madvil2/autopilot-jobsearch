---
name: profiles
description: Keep the platform profiles (LinkedIn in detail, every other board in sources.md by checklist) consistent with the CV: same title, photo, stack keywords, dates, location per market. Generates the LinkedIn headline, About and experience texts and applies them with the person's go.
---

# /profiles

Recruiters search profiles by keywords before they ever see a CV, and the first thing they compare is whether the profile and the CV tell the same story. This skill makes every platform profile a teaser for the CV: same facts, shorter, with the words recruiters search for.

Run it after every change to `cv/base.md` or `profile.md`. Arguments: `/profiles` (LinkedIn), `/profiles all` (LinkedIn plus the checklist for every `login: yes` source in `sources.md`), `/profiles <platform>`.

## LinkedIn

Read `profile.md`, `cv/base.md` and the latest `/stack-radar` output if one exists. Produce the texts, show them, apply them in the Playwright browser only after the person says go.

1. **Photo**: the same photo as the CV. Not a selfie, not a passport photo, not an old one.
2. **Name**: exactly as in the CV.
3. **Headline**: the CV title line, no level unless the profile allows it. Optionally a short tail with the main stack in brackets.
4. **About**, three paragraphs, first person, no buzzwords:
   - Who I am: role, years, core area; what I am doing now or did last, with one number. One personal line is fine if it is specific.
   - Stack: "I work with ..." followed by the technologies from the CV skills line, in the profile's order, separated by commas or bars, no years.
   - Industries and settings: the kinds of companies and products I have worked for (startups, scale-ups, fintech, consumer apps), where, in what kind of environment.
5. **Experience**: roles, companies and dates copied 1:1 from the CV. One line per role, no bullet lists; the CV carries the detail. Any difference between LinkedIn and the CV reads as an inconsistency, so none are allowed.
6. **Skills**: the technologies from the CV, plus the top tags from `/stack-radar`, spelled exactly as postings spell them. Ask for endorsements on the five that matter most.
7. **Certifications, languages, awards**: everything the CV lists, nothing it does not.
8. **Contact**: the profile email, the GitHub link.
9. **Open to work** settings: titles from the profile targets, locations per the location-by-market table, work modes from the profile.
10. **Résumé for Easy Apply**: upload the current CV PDF in the job application settings so Easy Apply attaches the right file.

Then a short consistency report: what changed, what still differs from the CV, what the person has to do by hand (endorsement requests, a background image, anything behind a confirmation dialog).

## Other platforms

For every `login: yes` source in `sources.md` that has a profile (XING, Djinni, hh.ru, Wellfound, Instaffo, getmatch and similar), open the profile page and check against this list, fixing what can be fixed and reporting the rest:

- Title identical to the CV title (translated for the platform's language).
- Photo identical to the CV photo.
- City and phone per the location-by-market table in `profile.md`; the "about" text agrees with the city.
- Stack line in the profile's order, exact spellings, years from the profile table.
- Exactly one CV uploaded, the version for that market; delete duplicates (duplicate uploads break matching on some boards).
- Dates and employers identical to the CV.
- Visibility set to the widest setting the platform offers.

## Social media hygiene

Remind the person once: other public profiles (Instagram, Facebook, X, GitHub bio) are read by recruiters too. Anything controversial, sloppy or unprofessional costs interviews. The agent does not touch those accounts.
