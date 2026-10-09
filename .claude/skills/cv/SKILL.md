---
name: cv
description: Build, tailor and render the CV. Interviews section by section into cv/<version>.md, renders an A4 PDF with the coach-style layout, checks it against the rules, and uploads it to JobCubby as a resume version.
---

# /cv

The CV is markdown in `cv/`, rendered to PDF by `scripts/render.mjs`. `cv/base.md` is the master; variants are separate files (`cv/de.md`, `cv/backend.md`, `cv/acme.md`). The markdown contract is `templates/cv.md`: one `# Name`, header lines, then only these sections: Summary, Technical Skills, Work Experience, Education, Achievements, Certifications, Language Skills, Hobbies. Entries under Work Experience and Education are `### dates | role`. The renderer rejects anything else and skips empty sections.

Modes:
- `/cv` with no CV yet: full interview, then render.
- `/cv` with an existing one: review, propose fixes, re-render.
- `/cv variant <name> for <posting URL or pasted text>`: a tailored copy from `base.md`.
- `/cv render [file]`: just render.

## Building from scratch

Read `profile.md` first; do not ask again for anything that is there. Then interview section by section, in the person's language, and write the markdown as you go:

1. **Header.** Name, title line (role plus main stack in brackets, no level unless `profile.md` says so), city, birth date, phone, email, links, work authorization line, availability line, languages in brackets if the market expects it.
2. **Technical Skills.** One bold group label per line, technologies separated by ` | `, in the order from `profile.md`. Years in brackets on the first line. Exact ATS spellings: `TypeScript` not `TS`, `Node.js` not `NodeJS`, `CI/CD` with the slash, `React` (add `React.js` only if the person wants both).
3. **Work Experience.** Newest first. For every job ask: dates, role, employer with city or "Remote", one-line project definition (where the company is from, what the product is, who uses it, how many), three to five bullets, technologies used. Push every bullet toward a result with a number: users, revenue, time saved, load time before and after, components adopted, team size. Ask "what changed because you did it?" until a number or a concrete outcome appears. Mark anything the person is unsure about and resolve it before rendering; never invent numbers.
4. **Education, Achievements, Certifications, Language Skills, Hobbies.** Short lines separated by ` | `. Hobbies are what make a person memorable; keep one or two real ones.
5. **Photo.** Ask for a file in `photos/`. If they have none that fits (casual headshot, neutral background, natural light), say they can generate one from their own photos with ChatGPT or Gemini and drop it in. Nothing more; how they do it is their call. The template crops to a square, so any ratio works. Photos and birth dates are market conventions: they are frontmatter switches, off for markets that do not want them.

## Checks before rendering

Run through `rules.md` and `profile.md`:

- Title level matches what the person claims. Stack order matches the profile. Years never rounded up.
- No technology the person has not confirmed. Ask explicitly: "Have you used X in real work or a real project?" A "no" means it stays out, however often postings ask for it; `/stack-radar` handles that gap with a learning plan.
- No sentences copied from job postings. If a bullet reads like a posting, rewrite it as what they did.
- No em-dashes or double hyphens. Metrics present where they exist. Chronology complete (a gap is fine; a wrong date is not).
- Plain text only: no tables, columns, icons or skill bars in the markdown. Parsers read this file's PDF.

## Rendering

```bash
node scripts/render.mjs cv/base.md
```

The output is `cv/<Firstname_Lastname>_CV.pdf` (suffix from `version:` for variants, `Lebenslauf` for German) plus one PNG per page. Open the PNGs and look: two pages at most, no orphan headings, header lines not wrapping, photo present if expected. Fix the markdown (not the template) for content problems; fix `templates/cv.html` only when the design itself is wrong.

## After rendering

- Upload the PDF to JobCubby as a labelled resume version (`upload_resume` with the file as base64, label = version and date). Set it as default when it replaces the master (`set_default_resume`). Keep the plain-text content current too (`update_resume` with the markdown text) so JobCubby's matches read it.
- Update "Files" in `profile.md` if a new version should be used for a market.

## Tailoring a variant

Five minutes, not more. From `base.md`: reorder the technologies so what the posting names first comes first, adjust the title to the role's wording (same level rule), pick the language. Never change metrics, chronology or add unconfirmed technologies. Save as `cv/<slug>.md` with `version: <slug>` and render. Note in the JobCubby application which version was sent.
