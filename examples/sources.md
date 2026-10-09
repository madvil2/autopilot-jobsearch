# Sources

Where `/sweep` looks, in order. One block per source.

## Inboxes (checked first, every run)

### Email
- type: inbox
- where: Gmail, query `newer_than:1d in:inbox`
- notes: open anything that looks like a status change or a question; ignore alerts and newsletters

### LinkedIn messages
- type: inbox
- where: https://www.linkedin.com/messaging/
- login: yes
- notes: reply to every recruiter who asks something; apply through direct links they send

## Tracker (checked second)

### JobCubby index and matches
- type: jobcubby
- notes: saved searches "Frontend OR Full Stack, Germany" and "Frontend OR Full Stack, Remote EU"; read matches with gaps

## Boards

### LinkedIn, Berlin
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22%20OR%20%22Frontend%22&geoId=106967730&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form
- notes: quoted keywords with OR; `geoId=106967730` is Berlin; last 3 days

### LinkedIn, remote EU
- type: board
- url: https://www.linkedin.com/jobs/search/?keywords=%22React%22%20OR%20%22TypeScript%22%20OR%20%22Frontend%22&geoId=91000000&f_WT=2&f_TPR=r259200&sortBy=DD
- login: yes
- apply: easy-apply, else company-form

### Indeed Germany
- type: board
- url: https://de.indeed.com/jobs?q=React+TypeScript&l=Berlin&fromage=1&sort=date
- login: yes
- apply: platform-button, else company-form
- notes: open details with `&vjk=<id>` on the search page, direct viewjob links hit a challenge page

### StepStone
- type: board
- url: https://www.stepstone.de/jobs/react-typescript/in-berlin?radius=30&sort=2&action=sort_publish
- login: yes
- apply: platform-button, else company-form
- notes: read `#jobDescriptionText` through evaluate, the full snapshot is too large

### Wellfound
- type: board
- url: https://wellfound.com/jobs?remote=true&keywords=react%20typescript
- login: yes
- apply: platform-button

### Berlin Startup Jobs
- type: board
- url: https://berlinstartupjobs.com/engineering/
- login: no
- apply: company-form

### InfoJobs (Spain)
- type: board
- url: https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=react&sortBy=PUBLICATION_DATE
- login: yes
- apply: platform-button
- cv: `cv/es.md`
- notes: Spanish market, profile fields per the Spain row in profile.md
