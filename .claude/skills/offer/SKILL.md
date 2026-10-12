---
name: offer
description: When an offer arrives: the reply that keeps it warm without committing, the contract checklist (general plus the market's specifics), a package evaluation and the questions to ask. The agent never accepts, declines or negotiates; it prepares and I decide.
---

# /offer <company>

Files: the method's own files (`templates/`, `scripts/`, `docs/`, `examples/`) live in the plugin root, written here as `${CLAUDE_PLUGIN_ROOT}`; when that text is not replaced by an absolute path, the method root is the clone this skill file sits in. Everything personal (`profile.md`, `rules.md`, `sources.md`, `cv/`, `cover-letters/`, `prep/`, `photos/`, `documents/`, `transcripts/`, `reports/`) lives in the workspace, the current folder; every relative path below is relative to it. Before doing anything on the person's behalf, read `profile.md` and `rules.md`: facts come only from them, choices are asked the way `rules.md` says, and a correction from the person becomes a dated rule there.

An offer by phone, mail or letter is not a contract. Nothing binds either side until a written contract is signed by both. That gives me time, and this skill uses it.

The sweep handles the first minute: when an offer arrives it replies with the acceptance-of-the-news text below, moves the application to `offer` with the terms in `offer_details`, creates a calendar event for any deadline they named, and puts it at the top of the report. Everything after that is this skill.

## 1. The reply (sent by the sweep or by me)

Warm, short, no commitment: thank you for the offer, I am glad about it and looking forward to the draft contract. Nothing about accepting, nothing about money. If they ask for a decision date, ask how long I have and name no date myself.

Keep interviewing elsewhere until the contract is signed. Other companies are informed only after the signature, with a short polite note.

## 2. Package

Read `profile.md` for my figure and market, the JobCubby application for every number said so far, and `docs/markets/<market>.md` for how packages work there. Lay out:

- Base salary, period and currency, converted to annual gross and compared with my figure and with what was said in the process.
- Variable pay: bonus, equity (percentage, type, vesting, cliff, what happens if I leave, valuation), one-off payments.
- Time: vacation days, hours per week, remote arrangement, probation length and notice periods.
- Benefits worth money: pension contribution, insurance, transport, learning budget, relocation.
- Net estimate for the market, from a gross-to-net calculator, so the monthly number is real.
- What is missing compared with my figure, and what could be traded instead of base (start date, vacation, learning budget, title, review after probation).

Say plainly whether the package is at, above or below my figure. No recommendation to accept or decline; that is mine.

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

Market specifics (limits, norms, what is unusual) come from `docs/markets/<market>.md`. Anything missing or odd becomes a question for them, written politely; asking is read as professionalism, not as doubt.

## 4. Questions before signing

Onboarding plan and first weeks, equipment, who my manager is, team size, review cycle, how salary reviews work, relocation or permit support and who handles it, whether an earlier remote start is possible and under what contract.

## 5. After my decision

- Accept: confirm in writing, send the signed contract the way they asked, log the event, put the start date in the calendar through the calendar path from `.calendar.env` (recipe in `docs/sweep-events.md`), run `/profiles` to update the headline when the time comes, and tell the other open processes politely that I have signed.
- Decline: one short, warm message, no reasons beyond "I have decided on another option", `rejected` with `Withdrew (my decision)` in the tracker, a thank-you to the people I met.
