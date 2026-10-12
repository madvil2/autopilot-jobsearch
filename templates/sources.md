# Sources

Where `/sweep` looks, in order. One block per source. `/init` and `/profile` help fill this; edit by hand any time.
Keep URLs with the filters already applied (keywords, location, "last 3 days", sorted by date).

Fields:
- type: `inbox` (messages to answer), `jobcubby` (the tracker's own index and matches), `board` (postings to apply to), `search` (a web search that finds postings on ATS boards directly)
- login: `yes` (Playwright profile is logged in), `no` (public, read-only or apply as guest), or `check: <how to verify>`
- apply: how applications go out here (`easy-apply`, `platform-button`, `company-form`, `read-only`)
- cv: which CV version and language to attach, if not the default from `profile.md`
- notes: anything learned about this source (selectors, quirks, what to ignore). See `docs/platform-notes.md` for shared ones.

## Inboxes (checked first, every run)

### Email
- type: inbox
- where: the read path in `.mail.env` (`MAIL_READ`)

### LinkedIn messages
- type: inbox
- where: https://www.linkedin.com/messaging/
- login: yes

## Tracker (checked second)

### JobCubby index and matches
- type: jobcubby

## Boards

### LinkedIn, <country or region>
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22&geoId=<id>&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form

### LinkedIn, remote in <region>
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22&geoId=<id>&f_WT=2&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form

### Indeed
- type: board
- url: https://<country>.indeed.com/jobs?q=<stack>&l=<city>&fromage=3&sort=date
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
- notes: run the query on DuckDuckGo or Bing HTML results; Google answers scripted queries with a challenge page.

### <Regional board>
- type: board
- url:
- login:
- apply:
- cv: (for example: `cv/de.md` for German-language boards)
- notes:
