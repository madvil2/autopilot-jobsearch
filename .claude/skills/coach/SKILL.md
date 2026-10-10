---
name: coach
description: My interview method: the intro structure, the three why-company frames, the three-step method for technical questions with the clarifying-question bank, ten rules, salary frames, closing, and a daily practice protocol. Run /coach to read it, /coach mock <topic> to practice.
---

# /coach

This is how I run interviews. It is written from my own calls, mock interviews and the notes I took after them. `/interview-prep` applies it to one company; `/debrief` grades a recording against it.

Modes: `/coach` prints the method. `/coach mock <HR | system design | <topic>>` runs a mock in chat: you play the interviewer, ask one question at a time, and after each answer grade it against the rules below in three lines (what worked, what to fix, the better line). Text cannot hear silence, so in mocks ask the person to type the clarifying questions they would ask out loud before answering.

## Part A. HR and behavioural

### A1. Intro, 60 to 90 seconds

Do not start with the oldest or the biggest employer. Start with what I own now or owned last. Structure:

1. Greeting, name, one line of who I am: role and core stack in the order from `profile.md`.
2. The latest thing I owned, with one number and what I did end to end.
3. Where I started, one sentence, only if it adds credibility.
4. One memorable personal detail (a hobby, hackathons, something that is on the second page of the CV).
5. Languages once, not twice.

Face alive, eyes on the camera. On a 15-minute screen cut to 60 seconds. The script lives in `profile.md` and is never rewritten per company.

### A2. Why this role, why this company

No single script. Talk about my motivation, not their industry. Three frames by company type:

- **Early startup or founding role: ownership.** "My goal has always been to build my own thing and own what I create. Owning the product end to end, shaping the architecture from day one, working directly with the founders: that is literally how I want to work."
- **Big company: growth in a team.** "For the last years I was in a very small team and owned my area. I learned a lot, but there was nobody more senior in my area to learn from. I want the opposite now: a big engineering team, real code review, senior people around me, real scale."
- **Product where the frontend is the product: craft.** "Most frontend work is dashboards and forms. Here a person has three seconds to act and the interface has to be fast, obvious and correct. That is real craft."

The rule above any script: one concrete detail I noticed in their product beats ten compliments. Open the product the day before. "I was on your product yesterday and noticed X."

In writing (prep files, letters) the order is stability, team, growth, money last, each wrapped in a fact about them.

### A2b. Two concrete reasons

Beyond the frame, the interviewer wants to hear that I want *them*, not any job. Two concrete reasons about this company (their product, their business model, a video or blog post of theirs, something a person I met said), each one specific enough that it could not be said about another company. "I was on your product yesterday and noticed X" counts as one. Vague praise of their industry counts as zero.

### A3. Why do I fit

Two sentences mapping results to their asks, then the universal bridge: "I love going deep into new domains. At <last job> I had to learn <X> from zero, and within months I was the person owning that part of the product." The bridge closes any stack gap.

### A4. Why the last job ended

Two or three sentences, external reason, nobody to blame, then silence. If the whole team was let go, say so; it removes the suspicion that it was only me. Never criticize the founders or the industry. End on what I want next. If asked "did you see it coming": there were signs, we tried things, they made the call, it was the right call.

### A5. Gaps

Never declare a gap myself, in free text or in conversation. If asked directly: searching properly rather than taking the first thing, keeping sharp (projects, hackathons, daily building with AI tooling), available immediately.

### A5b. Stories in STAR shape

Every example answer (hardest problem, pressure, conflict, initiative, mistake) is a story with four beats: the situation in one sentence, my task in one sentence, what I did in three or four sentences with my decisions visible, the result with a number. Most of the air time goes to the action and the result; the setup is short. The interviewer has never seen my company or product, so I connect the dots myself: this is what the problem was, this is what I did, this is what changed. Three to five such stories, prepared and said aloud, cover almost every behavioural question. Honest ones only.

### A6. Strength and weakness

One trait, two sides. Strength: a real behaviour with the clearest example. Weakness: the flip side of the same trait, honest, with the system I built against it, and an honest admission that it still bites sometimes but is managed. Do not say perfectionist.

### A7. Team values

Communication, transparency, respect, honest feedback. One sentence why: to solve problems together you have to be able to say what needs saying, share knowledge, give and take criticism.

### A8. Salary

One number, not a range; a range gets its bottom. "I am looking at <figure>, depending on the whole package. My main focus is the team and the product, so I am open to discussion." If pushed for a figure: the same figure, once.

- Founding role: "For the cash component I am looking at <figure>. I understand this is a founding role, so I am genuinely interested in how you structure the equity side." Then ask: percentage, VSOP or real shares, vesting and cliff, current valuation, what happens if I leave, runway. Vague answers mean the equity is zero; negotiate salary only.
- Six-day week or odd hours: arithmetic, not wishes. "That is about twenty percent more hours than a standard role, so I would want the salary to reflect that."

### A9. Availability, permit, languages

Available immediately is an asset; say it with confidence. State work authorization in one sentence. Languages at the level in `profile.md`; never undersell.

### A9b. Commitment, out loud

Say that I want the job, plainly, before the call ends; interviewers notice when nobody said it. Say that I want to grow with the company. Never "I will see after a year": a hire is an investment for them, and a one-year plan ends the conversation.

### A10. Questions for them

Universal: what success looks like after three months; what their week actually looks like and where the time goes (opens every pain point); new position or backfill and why now; who I would work with day to day. Early startup: who writes the code today, greenfield or existing, the biggest technical challenge, runway, which AI workflows they already use. Big company: team size and split, how separate this product is, office expectation.

Two of the questions must be ones the website and the posting do not already answer; asking something that is on their careers page shows no homework was done. Always last: "What is the next step? I would love to proceed. When will you be able to give me feedback?" Ask questions even when the call felt bad.

### A11. Closing

Long fade-out, never abrupt: thanks for the call by name, it was a great conversation, I hope to hear from you soon, have a great day.

## Part B. Technical interviews

### B1. The three-step method

1. **Ask before answering.** Always. Do not answer the clarifying question in your head; say it out loud. Questions make the task concrete and buy time.
2. **Name the stages, no detail.** "Let me first name the steps we need to consider." Three to five items.
3. **Walk each stage out loud.** They are grading how I reason, not the final answer. The answer does not have to arrive at once; lead them to it, aloud.

### B2. Clarifying-question bank

Pick three to five before any system-design answer:

- **Input**: what does it actually look like, structured or not, volume, how often it runs.
- **What exists**: greenfield or building on something.
- **Cost of an error** (the strongest category): who is affected, is it money or an annoyance. It decides the architecture: money means human in the loop, confidence levels, audit trail.
- **Scale**: ten a day or ten thousand.
- **Constraints**: latency, compliance, stack to assume.

Transition: "Okay, I think I have enough context to start structuring this."

System-design questions are about data flow and stages, not about which framework; frontend or backend is a later implementation detail.

### B2b. Technical calls with a product owner or CTO

These are conversations, not tests. Study the product and the posting again, pick the feature they are visibly building or improving, and prepare questions about it; develop follow-ups from their own introduction during the call. Be ready to draw the parallel between their problem and something I have built, and to say what I would do with a user story in their stack. Have a view on the current trends in their domain, with a reason for it. A CTO is also checking whether the conversation is enjoyable: small talk, questions back, a visible good time.

### B3. The rules

1. Silence kills. Sitting quietly reads as "no idea", whatever is in my head.
2. Ask before answering.
3. Structure first, details second. Organizing out loud is expected; a rushed half-answer is worse.
4. Buy time legitimately: "This is quite a big task. Do you mind if I share my screen and map it out?"
5. Never show that I gave up. Struggling is fine; visible disinterest ends the interview. Never end on "I don't know", end on "here is how I would find out."
6. Intro starts with what I own now.
7. Why this role: my real motivation, not their industry.
8. No AI assistant during an interview. Experienced interviewers tell within seconds, and reading it makes me worse.
9. No canned answers per scenario. Prepare the principle of attacking an unknown problem, not scripts. Prep files are warm-up before the game, closed during it.
10. Practice out loud, daily. Knowing the advice changes nothing; reps do.
11. Answer the question that was asked, not the one I prepared for. Listen to the end, do not nod before the question is over, do not comment on the quality of the question. If I did not catch it, ask them to repeat it.
12. No answer is not an option. An educated guess with the reasoning, or how I would find out. Taking five seconds to structure the answer is a sign of a structured person, not of weakness.
13. Speak slowly and clearly. The other side is likely not a native speaker either, and nerves speed everyone up.
14. In a culture-fit round, be concrete and personal: not "I like hiking" but where, with whom, when. They are deciding whether they want to sit next to me every day; a connection beats another proof of skill.
15. Before a final round, connect with the interviewers on LinkedIn with a one-line note that I look forward to the call, and mention by name the people I met earlier in the process.

### B4. Daily protocol, 15 minutes

One system-design question, timer on, aloud, in the interview language, no notes. Three to five clarifying questions first, then "let me name the stages", then walk them. Record it on the phone, listen back, hunt for silences. The goal is that the structure becomes automatic, not that the answer is right.

## Part C. Checklists

**Day before**: read what their product is built on (the domain trap), open the product and find one detail, prepare two concrete reasons and two questions not answered on their site, re-read A1, A2 and B1, set the salary figure for this market, check the time zone and the link, add the interviewers on LinkedIn if this is a final round.

**Ten minutes before**: laptop on a table at eye level, camera straight, quiet room, headset, clean real background (no blur), nobody walking behind me, notes closed, AI assistant closed, water, five minutes early in the room. If nobody has joined fifteen minutes in: one polite mail asking whether I had the right link.

**During**: ask before answering, think out loud, stages then details, never end on "I don't know", face alive, only the interview language.

**At the end, always**: two or three questions, say that I want the job, the next-steps question, long fade-out. If I have to cancel or move a call: say so early, apologise once, offer three slots within five workdays.
