---
name: profile
description: Interview the person and write profile.md, the single source of facts and personal rules the agent uses in forms, messages, CVs and interview prep. Also records corrections as new rules and syncs the profile to JobCubby.
---

# /profile

Files: the method's own files (`templates/`, `scripts/`, `docs/`, `examples/`) live in the plugin root, written here as `${CLAUDE_PLUGIN_ROOT}`; when that text is not replaced by an absolute path, the method root is the clone this skill file sits in. Everything personal (`profile.md`, `rules.md`, `sources.md`, `cv/`, `cover-letters/`, `prep/`, `photos/`, `documents/`, `transcripts/`, `reports/`) lives in the workspace, the current folder; every relative path below is relative to it. Before doing anything on the person's behalf, read `profile.md` and `rules.md`: facts come only from them, choices are asked the way `rules.md` says, and a correction from the person becomes a dated rule there.

`profile.md` is the only place facts about the person live. Every other skill reads it. This skill fills it by asking questions, in the person's language, a few at a time. Never guess a fact; if they do not know, leave the field empty and say which skill will need it.

Modes:
- `/profile` with an empty or template `profile.md`: full interview.
- `/profile` with a filled one: show what is missing or stale and update only that.
- `/profile add rule <text>` or whenever the person corrects the agent's behaviour: append one dated line under "Personal rules" (or under "Added later" in `rules.md` if the correction is impersonal).

## 0. Start from the CV they already have

Most people come with a CV. Before any question, ask for it, in the format from `CLAUDE.md`:

1. Point me at your current CV (PDF, DOCX, Markdown, or a LinkedIn "Save to PDF" export); I fill in everything it contains and ask only for what is missing (recommended: ten minutes instead of forty)
2. No CV yet, interview from a blank profile

On 1:

- Copy the file into `cv/old/` under its original name; never modify the original.
- Read the text. PDF: read the file directly. DOCX: `unzip -p file.docx word/document.xml | sed 's#</w:p>#\n#g; s/<[^>]*>//g'`. Markdown or text: as is.
- Fill `profile.md` from it, field by field:
  - Identity: everything the CV states (name, email, phone, address or city, LinkedIn, GitHub, date of birth, citizenship, work authorization, availability, highest education, languages with levels). Copy as written; do not normalise names, levels or spellings.
  - Stack: every technology the CV names, in the CV's order for now. Years come from the job entries that list the technology: sum the spans, round down, mark the number as derived. A technology named only in a skills line, with no job behind it, gets `?` in Years.
  - Target: roles and levels read off the title line and the most recent jobs, written as a proposal and marked as derived.
  - Interview facts: team setup and last-job facts the CV states (team size, what they owned). Everything else stays empty.
  - Files: the imported file under `cv/old/`.
- Show one short list back, in two parts: "Taken from your CV" (facts copied as written) and "Derived, please check" (years per technology, roles, levels, stack order). Copied facts stand unless they correct them; derived values need a yes. Apply their corrections.
- Then run the interview below, skipping every field that is filled and confirmed. Say at the start how many fields are left.

The import never lowers anything: if the CV undersells a language level or years with a technology, ask before writing the CV's number. If the CV and the person disagree on a date, the person wins and the CV gets fixed in `/cv`.

## Interview order

Ask in blocks, only the fields still empty after step 0. Confirm each block back in two lines before moving on. Facts are asked plainly; every choice is offered in the format from `CLAUDE.md`, recommended option first. Defaults to propose:

- Report language: the language the person writes to the agent in (recommended); English.
- Email everywhere: one address, firstname.lastname style (recommended); whatever they use now.
- Title level claimed in free text: none, the title line carries role and stack (recommended: keeps mid and senior roles both open); the level they hold now.
- Stack order: the technology they use daily and want to be hired for first, everything else after (recommended); alphabetical or by years.
- Years per technology: real years, never rounded up (recommended); none shown.
- Levels applied to: the current level and one above (recommended); the current level only.
- Work modes: remote plus hybrid in the home city (recommended); remote only; onsite included.
- Location per market: the real city everywhere (recommended); a local city on regional platforms where a foreign city gets applications dropped before a human sees them (then phone and "about" text must agree).
- Salary figure: one number per market in the upper half of the local range for the role (recommended); the person's own number.
- Hard skip filters: the template's defaults (consulting with client-site work, stacks they will not work in, internships, lead and staff titles, freelance only) (recommended); a shorter list.
- Growth targets: adjacent roles in the same stack one level down (recommended); none.

1. **Identity.** Name, date of birth, the one email address to use everywhere, phone, address, LinkedIn, GitHub, citizenships, work authorization per country with the exact wording for forms, visa sponsorship, availability, highest degree, languages with CEFR levels. On languages: push gently against underselling; the level they claim in forms is the one they can defend on a call.
2. **Target.** Roles, levels, work modes, markets and platforms, hard skip filters, growth targets, differentiators. Ask what they would never want to be applied to. Ask which adjacent roles they would take on purpose.
3. **Stack.** Build the table. Ask for the order they want technologies presented, and years per technology. Explain that this order is used everywhere, including the first sentence of every message, so the main skill goes first. Ask which title level they want claimed in free text, if any.
4. **Location by market.** Default city and phone, then exceptions per market or platform, if they present differently on regional platforms. Make sure city, "about" text and phone agree inside one market.
5. **Salary.** One figure per market, annual, in the local currency. Explain that ranges get the bottom of the range. Record that below-figure offers always go to them.
6. **Interview facts.** Write the self-introduction script with them, 60 to 90 seconds, in the structure from `/coach`: who I am and my core stack, what I own now or most recently with one number, where I started (short), one memorable personal detail, languages once. Then: why the last job ended (external reason, no blame, two or three sentences), team setup at the last job (never overclaim ownership), the one story for hardest problem / proud of / under pressure, strength and its flip-side weakness with the system against it, questions they always ask at the end.
7. **Files.** Default CV version, per-market versions, photo path, the imported CV under `cv/old/` if there is one.

## After writing

- Re-read `profile.md` and check it against `rules.md`: no invented facts, no title level outside what they chose, no gaps written into free-text fields.
- Push the profile to JobCubby so its matches use current data: `update_profile` (headline, summary, skills in the chosen order, work history, education) and `update_preferences` (target role, seniority, work modes, locations, salary, job types, industries). Read the existing profile first and send only what changed.
- If `.data.git/` exists, run `"${CLAUDE_PLUGIN_ROOT}/scripts/data" save "profile <name>"`.
- Tell the person what is still empty and which skill will ask for it.

## Recording corrections

When the person says the agent did something wrong ("never write X", "always put Y first"), do not just fix the output. Append the rule with today's date, in one sentence, with the reason in a second sentence, to "Personal rules" in `profile.md` (personal) or "Added later" in `rules.md` (applies to anyone). Say that you did.
