---
name: cover-letter
description: Write a cover letter for one posting in the three-paragraph structure, from profile.md and the chosen CV version, then render it to PDF next to the CV and note it in JobCubby.
---

# /cover-letter

Input: a posting URL or pasted posting text, plus optionally the CV version to base it on. Output: `cover-letters/<company>-<role>.md` and its PDF, rendered by `scripts/render.mjs`. The markdown contract is `templates/cover-letter.md`: frontmatter with sender, recipient, place, date, subject, greeting and signoff, then plain paragraphs.

## Gather

1. Read `profile.md`, `rules.md` and the CV version for this market.
2. Read the posting. Pull out: the exact role title, the team or product, the three things they ask for most, one sentence worth quoting back, the city or remote setup, the company's legal name and address if shown, the hiring contact's name if shown.
3. If the posting is in the tracker, read the JobCubby application for anything already said to this company (salary figure, earlier contact).

## Write

Three paragraphs, each with one job. Keep the whole letter under 300 words.

1. **Who I am and what I want to take care of.** Name, role and years from the profile (the main stack first, in the profile's order), then what in their product I would take care of, in their vocabulary.
2. **Why we are a match, with evidence.** Two or three results from the CV with numbers, chosen to mirror what they ask for. One sentence on how I work (what I put emphasis on). No gaps, no "although I have not used X".
3. **Their words and the next step.** "You write that ..." with one line from the posting, why that attracted me, where I would join (their city or remote, as the posting says; never volunteer constraints), when I can start, how to reach me, thank you.

Then: greeting to the team or the named contact, signoff from the frontmatter.

Rules that apply here from `rules.md`: no em-dashes, no copied sentences except the one explicit quote, no self-disclosed gaps, no location caveats, the why-company order (stability, team, growth, money last) when the letter touches motivation, the title level the profile allows. Language of the posting.

## Render and record

```bash
node scripts/render.mjs cover-letters/<company>-<role>.md
```

Check the PNG: one page, header matches the CV header. Then in JobCubby add a timeline event on the application ("Cover letter sent, file cover-letters/<name>.pdf") and, if the application is new, create it with the letter path in the description.
