---
name: outreach
description: Skip the line on a posting that matters: find the hiring manager and people who can refer me, write the call script, the message to the hiring manager and the referral ask, and log the contacts in JobCubby. Sending and calling stay with me.
---

# /outreach <company> [posting URL]

An application through a form lands on an HR screener's desk among hundreds. The person who decides is the head of the department with the vacancy, and they have a problem to solve: a deadline, a product that does not ship, a customer who complains. Talking to that person, or to someone who can introduce me, turns an application into a conversation. This skill prepares that; the person makes the call and sends the messages.

The sweep flags candidates for outreach in its report (strong match, a company that is not hiding behind a big ATS, a role that is clearly inside one team). Run this skill for those, not for every quickie.

## 1. Find the people

Research with Playwright and the web, a few profile views per company and no automated connection requests (LinkedIn throttles accounts for that), log every person with `create_contact` (company, name, title, LinkedIn URL in notes):

- **The hiring manager.** Not HR, not the recruiter, not "talent acquisition": the head of the department the role sits in. Small companies (under about 50 people): often a founder or the CTO. Growing companies: the head of engineering, head of product, team lead named in the posting. Big companies: the department head above the team. Confirm the role from LinkedIn titles and the company's team page; the contact named in the posting is almost always HR and only handles the screening.
- **A bridge.** Someone in the same department (an engineer, a product person) or in my own network who works there and can introduce me or forward my CV. Search my LinkedIn connections filtered by the company.
- **The problem.** Read the posting as the hiring manager wrote it: what is the one thing they need solved? Write down my interpretation in one sentence. Postings are wish lists; the call verifies which wish matters.

## 2. The call script (the person calls, never the agent)

Purpose: learn the problem, not sell. One question at a time, let them talk, write down their exact words.

1. Greeting, name, pause for their reaction. "I am calling about the <role> position, I read the description." If it is the wrong person: "Could you tell me who I should talk to about this role?"
2. "Of all the points in the description, what is the biggest challenge for this role from your perspective?"
3. Follow-up: "How will success be measured in this role?" The two answers must agree; if not, ask "could you say more about ...".
4. Close: "I would like to apply. Should I send my CV to you directly?" Write down the address, repeat it back, thank them by name.

Speak slowly and clearly; the other side may be switching languages for me. Rehearse on two or three companies I do not care about first.

## 3. Messages (drafts, sent by the person)

Formal register everywhere: "Dear <First Last>", paragraphs, "thank you" not "thanks", no "Hi" openers, no "I saw your profile", no "I am perfect for this", never "can you give me a job". I am offering skills, not asking for a favour. Match the thread's language per `rules.md`.

- **To the hiring manager** (LinkedIn message or email, under 120 words): one line of who I am (title and years, stack in the profile's order), one line that names their problem in their words (from the call) or my reading of the posting, two or three sentences of proof that I have solved that kind of problem with numbers, one open question or a clear ask ("may I send you my CV directly?"), the posting link.
- **Referral ask to a connection** (under 90 words): how I know them or that we are connected, that I am looking for <role> work in <market>, the specific opening at their company by title, "is there any chance you could refer me to the hiring manager or HR?", offer to send the CV and anything else needed, thank you, first name.
- **To someone in the department when the manager is unreachable**: who I am, which role, what I bring in two lines, "who would be the right person to talk to about this?", CV attached.

Save the drafts to `prep/<company>-outreach.md` and show them. After the person sends or calls, log the event on the JobCubby application (`add_event`) and set a follow-up date five workdays out.

## 4. After the call

Ask the person to paste their notes from the call (or dictate them) right after it, while the words are fresh; `/outreach <company> notes` takes that text. Everything the hiring manager said goes into the application's description in JobCubby and into the cover letter: `/cover-letter` has a problem-first variant that quotes their words back. If they gave an address, the application goes there, not through the form.
