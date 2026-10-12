---
name: offer
description: Offer received: package evaluation, contract checklist and the questions to ask before signing; the person decides. Use when an offer or a draft contract arrives.
---

# /offer <company>

Files: `templates/`, `scripts/`, `docs/`, `examples/` and `routines/` are in the method root, `${CLAUDE_PLUGIN_ROOT}` (the clone holding this skill when that is not replaced by a path); every other relative path is in the workspace, the current folder. Before acting on the person's behalf, read `profile.md`, `docs/rules.md` and the workspace `rules.md`; the workspace one wins on conflict.

The person accepts, declines and negotiates; this skill prepares, and sends only in step 5.

## 1. The reply

If the sweep has not handled the offer yet, do what "An offer arrives" in `docs/sweep-events.md` says.

## 2. Package

Read `profile.md` for my figure and market, the JobCubby application for every number said so far, and `docs/markets/<market>.md` for how packages work there. If that market file does not exist, say so and use the general lists below. Lay out:

- Base salary, period and currency, converted to annual gross and compared with my figure and with what was said in the process.
- Variable pay: bonus, equity (percentage, type, vesting, cliff, what happens if I leave, valuation), one-off payments.
- Time: vacation days, hours per week, remote arrangement, probation length and notice periods.
- Benefits worth money: pension contribution, insurance, transport, learning budget, relocation.
- Net monthly estimate for the market, from a gross-to-net calculator.
- What is missing compared with my figure, and what could be traded instead of base (start date, vacation, learning budget, title, review after probation).

End on one sentence: at, above or below my figure, and by how much.

## 3. Contract checklist

Say this once, at the top of the checklist output, to the person: this is a reading aid, not legal advice; the agent can miss a clause or misread one, and for a contract in a jurisdiction or language that is new to the person, a lawyer or a trusted local friend should read it before signing. Then go through the draft line by line and mark each item as present, missing or odd:

- Legal employer name and address match the company I interviewed with.
- Job title and a description of duties, and who I report to.
- Start date, and a clause for moving it if a permit or notice period delays it.
- Place of work, and the remote arrangement in writing if any was promised.
- Fixed-term or permanent, and the length of any fixed term.
- Probation period length and the notice period during and after it.
- Gross salary, payment date, every variable component with its conditions and dates.
- Working hours per week, overtime handling.
- Vacation days.
- Notice periods for both sides.
- Non-compete, IP assignment, side-activity clauses: read them, note anything broad.
- How they want it signed and returned.

Market specifics (limits, norms, what is unusual) come from `docs/markets/<market>.md`. Anything missing or odd becomes a question for them, written politely.

## 4. Questions before signing

Onboarding plan and first weeks, equipment, who my manager is, team size, review cycle, how salary reviews work, relocation or permit support and who handles it, whether an earlier remote start is possible and under what contract.

## 5. After the person states the decision in chat

Send only the text for that decision.

- Accept: confirm in writing, send the signed contract the way they asked, log the event, put the start date in the calendar through the calendar path from `.calendar.env` (recipe in `docs/sweep-events.md`), remind the person to run `/profiles` for the headline when the time comes, and tell the other open processes politely that I have signed.
- Decline: one short, warm message, no reasons beyond "I have decided on another option", `rejected` with `Withdrew (my decision)` in the tracker, a thank-you to the people I met.
