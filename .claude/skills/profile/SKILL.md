---
name: profile
description: Interview the person and write profile.md, the single source of facts and personal rules the agent uses in forms, messages, CVs and interview prep. Also records corrections as new rules and syncs the profile to JobCubby.
---

# /profile

`profile.md` is the only place facts about the person live. Every other skill reads it. This skill fills it by asking questions, in the person's language, a few at a time. Never guess a fact; if they do not know, leave the field empty and say which skill will need it.

Modes:
- `/profile` with an empty or template `profile.md`: full interview.
- `/profile` with a filled one: show what is missing or stale and update only that.
- `/profile add rule <text>` or whenever the person corrects the agent's behaviour: append one dated line under "Personal rules" (or under "Added later" in `rules.md` if the correction is impersonal).

## Interview order

Ask in blocks. Confirm each block back in two lines before moving on.

1. **Identity.** Name, date of birth, the one email address to use everywhere, phone, address, LinkedIn, GitHub, citizenships, work authorization per country with the exact wording for forms, visa sponsorship, availability, highest degree, languages with CEFR levels. On languages: push gently against underselling; the level they claim in forms is the one they can defend on a call.
2. **Target.** Roles, levels, work modes, markets and platforms, hard skip filters, growth targets, differentiators. Ask what they would never want to be applied to. Ask which adjacent roles they would take on purpose.
3. **Stack.** Build the table. Ask for the order they want technologies presented, and years per technology. Explain that this order is used everywhere, including the first sentence of every message, so the main skill goes first. Ask which title level they want claimed in free text, if any.
4. **Location by market.** Default city and phone, then exceptions per market or platform, if they present differently on regional platforms. Make sure city, "about" text and phone agree inside one market.
5. **Salary.** One figure per market, annual, in the local currency. Explain that ranges get the bottom of the range. Record that below-figure offers always go to them.
6. **Interview facts.** Write the self-introduction script with them, 60 to 90 seconds, in the structure from `/coach`: who I am and my core stack, what I own now or most recently with one number, where I started (short), one memorable personal detail, languages once. Then: why the last job ended (external reason, no blame, two or three sentences), team setup at the last job (never overclaim ownership), the one story for hardest problem / proud of / under pressure, strength and its flip-side weakness with the system against it, questions they always ask at the end.
7. **Files.** Default CV version, per-market versions, photo path.

## After writing

- Re-read `profile.md` and check it against `rules.md`: no invented facts, no title level outside what they chose, no gaps written into free-text fields.
- Push the profile to JobCubby so its matches use current data: `update_profile` (headline, summary, skills in the chosen order, work history, education) and `update_preferences` (target role, seniority, work modes, locations, salary, job types, industries). Read the existing profile first and send only what changed.
- If `.data.git/` exists, run `scripts/data save "profile <name>"`.
- Tell the person what is still empty and which skill will ask for it.

## Recording corrections

When the person says the agent did something wrong ("never write X", "always put Y first"), do not just fix the output. Append the rule with today's date, in one sentence, with the reason in a second sentence, to "Personal rules" in `profile.md` (personal) or "Added later" in `rules.md` (applies to anyone). Say that you did.
