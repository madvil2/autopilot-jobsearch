# Sources

Where `/sweep` looks, in order. One block per source. `/init` and `/profile` help fill this; edit by hand any time.
Keep URLs with the filters already applied (keywords, location, "last 3 days", sorted by date), so the
sweep opens them and reads, instead of clicking through filter UIs.

Fields:
- type: `inbox` (messages to answer), `jobcubby` (the tracker's own index and matches), `board` (postings to apply to), `search` (a web search that finds postings on ATS boards directly)
- login: `yes` (Playwright profile is logged in), `no` (public, read-only or apply as guest), or `check: <how to verify>`
- apply: how applications go out here (`easy-apply`, `platform-button`, `company-form`, `read-only`)
- cv: which CV version and language to attach, if not the default from `profile.md`
- notes: anything learned about this source (selectors, quirks, what to ignore). See `docs/platform-notes.md` for shared ones.

## Inboxes (checked first, every run)

### Email
- type: inbox
- where: Gmail, query `newer_than:1d in:inbox`
- notes: open anything that looks like a status change or a question; ignore alerts and newsletters

### LinkedIn messages
- type: inbox
- where: https://www.linkedin.com/messaging/
- login: yes
- notes: reply to every recruiter who asks something; if they send a direct application link, apply through it

## Tracker (checked second)

### JobCubby index and matches
- type: jobcubby
- notes: run saved searches, read AI matches with their gaps, save and apply to the ones that fit; feed gaps to `/stack-radar`

## Boards

### LinkedIn, <country or region>
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22&geoId=<id>&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form
- notes: quoted keywords joined with OR are matched literally; unquoted ones go through semantic search and return noise. `r259200` = last 3 days.

### LinkedIn, remote in <region>
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22&geoId=<id>&f_WT=2&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form

### Indeed
- type: board
- url: https://<country>.indeed.com/jobs?q=<stack>&l=<city>&fromage=1&sort=date
- login: yes
- apply: platform-button, else company-form

### StepStone (DACH)
- type: board
- url: https://www.stepstone.de/jobs/<stack>/in-<city>?radius=30&sort=2&action=sort_publish
- login: yes
- apply: platform-button, else company-form

### Wellfound (startups, remote)
- type: board
- url: https://wellfound.com/jobs?remote=true&keywords=<stack>
- login: yes
- apply: platform-button

### Company career pages and ATS boards
- type: board
- url: (one line per company or board you watch, for example an Ashby, Greenhouse or Lever board)
- login: no
- apply: company-form

### ATS boards through web search
- type: search
- url: a search engine query of the form `<role> inurl:<ats domain> intext:<country>`, one line per ATS: personio, join.com, lever.co, workable.com, greenhouse.io, ashbyhq.com, teamtailor.com, recruitee.com
- login: no
- apply: company-form
- notes: finds postings that never reach the big boards; results overlap with the boards above, the duplicate check handles it

### <Regional board>
- type: board
- url:
- login:
- apply:
- cv: (for example: `cv/de.md` for German-language boards)
- notes:
