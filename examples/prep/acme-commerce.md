# Acme Commerce: Frontend Engineer (React / TypeScript), screening call on Tue 06.10.2026 10:00 CEST

Link: https://meet.example.com/acme-alex | Interviewer: Jordan Lee, Talent Partner | Tracker: https://jobcubby.com/applications/example
Format: video, 30 min | Language: English

## 0. The company in 30 seconds

- Acme Commerce builds a headless e-commerce platform for mid-size fashion brands: storefront, checkout, accounts. Brands pay a monthly fee plus a share of transactions.
- About 120 people, Berlin and remote EU, Series B in 2025, founders came from a large marketplace.
- Stack from their postings and blog: Next.js, TypeScript, GraphQL, Node, PostgreSQL, Playwright, AWS, feature flags everywhere.
- Core idea in one line: brands keep their own storefront design; Acme only runs the invisible parts. The domain trap: do not propose a standard templated storefront, that is what they are built against.
- One concrete detail I noticed in their product yesterday: the checkout on a demo brand remembers the delivery address across devices without an account, through a signed link in the confirmation mail. "I was on one of your storefronts yesterday and noticed the address carried over to my phone without logging in. That is the kind of detail that moves conversion."

## 1. Intro

> Hi Jordan, great to finally talk! I'm Alex, I'm based in Berlin. I'm a frontend-leaning fullstack engineer: React and TypeScript are my core stack, I work with Node on the backend, and I really enjoy building AI-assisted development workflows.
>
> In my latest job at Northwind Labs, a fintech startup, I owned the whole frontend of a budgeting app, from the architecture to the releases, and we shipped it to more than 60,000 monthly active users. I built the subscription and referral flows that drove most of that growth.
>
> Before that I brought an HR-tech platform from the first spec to production, and I started my career building a design system at a bank.
>
> In my free time I do trail running and I go to hackathons regularly, we won a fintech one last year. And I speak German, B2.

60-second cut: drop the bank sentence and the hobby, keep hackathons and German.

## 2. Why this company

- Stability: 120 people, Series B last year, paying brands with recurring revenue. I want to build on something that is here in two years.
- Team: a dedicated checkout team with its own on-call and a public engineering blog. I want senior people around me and real code review; the last two years I was the most senior frontend person in a six-person team.
- Growth: the checkout rebuild on Next.js with a conversion focus is exactly the product-is-the-frontend work I want more of; a page where a person has a few seconds to act has to be fast, obvious and correct.
- (Money, only if asked: 72,000 EUR, depending on the whole package.)

Two concrete reasons I want *this* company:
1. The checkout on your demo storefront carried my delivery address to my phone without an account, through a signed link in the confirmation mail. That is the level of detail I want to work at.
2. Your engineering blog post on feature flags in the checkout funnel describes exactly the experimentation setup I built by hand at Northwind and wished we had had from day one.

## 3. Why I fit

- I owned a consumer frontend end to end at Northwind: architecture, subscription and referral flows, releases, 60,000+ monthly active users. At Brightpath I took a platform from spec to production and cut load time from 4.2s to 1.6s. Next.js and TypeScript are my daily stack, with Playwright end-to-end tests.
- GraphQL bridge: not my daily stack, I have consumed GraphQL APIs but not designed schemas. My daily stack is React and TypeScript and I pick up tools inside that ecosystem fast; at Northwind I had never touched open banking and two weeks later the integration shipped and became the feature users came for.

## 4. Likely questions

| Question | My answer (two or three sentences, then silence) |
|---|---|
| Why did your last job end | The company lost its main investor early this year and the founders wound it down. It was not about performance, they let the whole team go. I am glad I had almost two years of real ownership there. |
| What have you been doing since | Searching properly rather than taking the first thing, keeping sharp with hackathons and daily building with AI tooling. Available immediately. |
| Hardest problem / most proud of | The open-banking integration in two weeks for a partner launch: new provider API, prototypes first, consent expiry and duplicate-transaction edge cases, shipped on time, became the feature users came for. |
| Strength / weakness | Calm and productive under a tight deadline. Flip side: with a far deadline I used to leave things late; I break work into small tasks and plan the week up front now, it still bites sometimes but it is managed. |
| Salary (one number for this market) | 72,000 EUR per year, depending on the whole package; my main focus is the team and the product, so I am open to discussion. |
| Availability, authorization, languages | Immediately, no notice period. EU citizen, full authorization. English C1, German B2, Spanish native. |

Stories in STAR shape, said aloud before the call:
- Open banking in two weeks: partner launch date fixed (S), I owned the integration (T), prototypes first, consent expiry and duplicate-transaction handling, shipped in 13 days (A), the feature 60,000 users came for (R).
- Load time at Brightpath: 4.2s first paint and users dropping (S), I owned performance (T), code-splitting, lazy routes, bundle analysis (A), 1.6s and Lighthouse 61 to 94 (R).
- Typed API contracts: backend changes breaking staging weekly (S), I proposed the fix (T), OpenAPI spec plus generated client (A), contract breaks failed CI instead of production, zero such incidents in the following year (R).

## 5. Technical (for technical rounds)

Not this round. For the next one: Next.js rendering modes and caching, GraphQL client caching and pagination, feature flags and experimentation, Playwright test strategy for checkout, Core Web Vitals on a storefront. Practice aloud: "design the checkout funnel so a brand can A/B test steps without a deploy."

## 6. My questions for them

1. What would success look like for this person after the first three months?
2. What does the checkout team's week actually look like, where does the time go?
3. Is this a new position or a backfill, and what made you open it now?
4. Who would I be working with day to day?
5. How separate is the checkout codebase from the storefront runtime, technically?
6. Always last: What is the next step? I would love to proceed. When will you be able to give me feedback?

Say before the end: I want this job, and I want to grow here.

## 7. Checklist

Day before: core idea read, product opened, one detail found, salary figure set, intro rehearsed aloud.
Camera and room, checked the day before and again ten minutes before: laptop on a table, camera at eye level, face lit from the front (a window or a lamp in front of me, never behind). The background is my real room, tidy and plain: no blur, no virtual background, no wallpaper; a clean wall or a tidy shelf reads as calm and honest, a blurred edge or a fake office reads as something to hide. Nothing on the desk behind the laptop, no clutter, nobody walking through, door closed, headset in.
Recording: OBS open, scene tested with a ten-second recording that has both voices, recording started before I join the call. Every call is recorded: it is the only way to see my own silences and missed questions, it is what `/debrief` grades, and it is how the tracker gets the facts and numbers that make the statistics real. A call without a recording is a call I learn nothing from.
Ten minutes before: notes closed, AI assistant closed, water, call link tested, five minutes early in the room.
During: ask before answering, think out loud, structure first, never end on "I don't know", only the call language, questions at the end, long fade-out.

## 8. Debrief (filled by `/debrief` after the call)

- Facts they revealed (team, process, numbers, next steps):
- What went well:
- What to fix next time:
