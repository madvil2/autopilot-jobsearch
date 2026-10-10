# Platform notes

Things I learned running the sweep on real boards. None of this is personal; all of it saves a run. `/sweep` reads this file. Add to it whenever a run teaches you something, one line with the date.

## Playwright

- **"Browser is already in use."** The cause is orphaned Playwright MCP server processes from earlier sessions, all holding the same browser profile. Fix it, do not report and stop:

  ```bash
  ps -eo pid,etime,command | grep playwright-mcp | grep -v grep
  ```

  Keep the newest one (it serves the current session), send TERM to all older ones, wait three seconds, re-run the `ps`, retry the navigation. Never match on anything but the string `playwright-mcp`; never kill the person's own browser.
- The Playwright profile keeps logins across runs. If a board shows a logged-out state, skip it and say so in the report; `/init` step 3 re-logs it with the person present.
- Large pages: do not dump the whole accessibility tree. Use `browser_evaluate` with a selector for the description element, or `browser_find` for the one control you need.
- Clicks that land on an overlay or a zero-size element: call `.click()` on the element from `browser_evaluate`.
- `<input type="date">`: set the value through the native setter and dispatch `input` and `change` events from `browser_evaluate`.
- Location autocompletes reject free text: type a partial string, then pick from the listbox.
- Angular and some React forms ignore `fill`: focus the field and type slowly.
- Radios on Ashby and Greenhouse often do not register through generic `.first()` or `.nth()` selectors: find the labelled element (`label[for=...]`), click it, then verify `[checked]` in a fresh snapshot before moving on.
- Ashby yes/no questions are button groups: click the button inside the question's container (`ancestor::div[.//label][1]`), not a radio.
- Ashby refuses a second application to the same company within about 90 days; log it as a duplicate.

## Context and tool hygiene (the cost driver)

Measured over 93 runs: a run reads 170 to 480 million cached tokens and costs 15 to 100 dollars on a Sonnet-class model, almost all of it page content. The habits that cause it, and the fix:

- Snapshotting a list page (LinkedIn results, hh.ru negotiations, Djinni inbox) puts 50 to 150 KB into context each time. Read lists with `browser_evaluate` and a selector that returns `[{title, company, href}]` per card.
- `browser_find` on a busy page returns hundreds of matches. Search for the one control you need, with a specific name.
- Screenshots are 100 KB to several MB each. One run put 7.7 MB of screenshots into context. Use them only when an element cannot be located any other way.
- The tracker's full application list is over 100 KB. It exceeds the tool-output limit and lands in a file; `grep` that file by company stem, never read it, never spawn a subagent to summarize it.
- Refs from an old snapshot fail with "Ref not found", "Unknown engine ref" or "Malformed value", and each failure costs a retry. After anything that changes the page, snapshot or find again before clicking.
- `browser_file_upload` only works when a file chooser is open: click the upload control first, then upload.
- There is no `computer`, `get_page_text` or `javascript_tool` in the Playwright MCP; `browser_evaluate` does all of that. "Back" is `browser_navigate_back`, not a URL.
- A click that times out after 5 seconds usually targets a covered or detached element: evaluate `.click()` on it, or scroll it into view first.

## LinkedIn

- Search URL: quote each keyword and join with `OR`, otherwise unquoted keywords go through semantic search and return unrelated roles. Use `geoId` for the location, not the `location` text parameter. `f_TPR=r259200` means last three days; `f_WT=2` means remote. `sortBy=DD` sorts by date.
- Results lazy-load: scroll the results pane and read titles from `li[data-occludable-job-id]`. Page with `&start=25`, `&start=50`.
- If the first navigation lands on `/authwall`, open the feed once and retry; the session is fine, the first request lost its cookie.
- Easy Apply radio buttons: click `label[for=<input id>]`, not the input.
- Premium "Top applicant" collection (`/jobs/collections/top-applicant/`) lists jobs where LinkedIn ranks the person near the top; cards are occluded until scrolled into view. "Mark as top choice" is limited per month; spend it only on roles that match the profile exactly.
- Aggregator reposts (generic "Software Engineer" titles from staffing brands) often hide a different stack; open and read before applying.

## Indeed

- Direct `viewjob?jk=...` links can return a challenge page; load the search results with `&vjk=<jk>` appended and read the detail panel instead.
- Many postings redirect to join.com, which pre-fills a stored, outdated CV: remove the file and upload the current one before submitting.

## StepStone

- The full page snapshot is too large; read `#jobDescriptionText` through `browser_evaluate`.
- Keep one CV in the StepStone profile; duplicates break their matching ("could not read your CV").

## ATS boards (Ashby, Greenhouse, Lever, Teamtailor, Personio)

- Always confirm location and work-authorization questions in the actual form before filling; listings mislabel "remote" often.
- Honest answers in structured fields only; free-text fields get nothing volunteered.

## Platform inboxes

- Status lists (hh.ru negotiations, Habr responses, Djinni inbox) read as one block of text shift statuses onto neighbouring cards. Use the list only to see what changed; open the card or thread before writing a status to the tracker.
- Voice messages (LinkedIn) cannot be transcribed by the sweep; report them once with the sender and date, then leave them to the person.
- Forms that ask for a messenger handle (Telegram, WhatsApp) need it in the profile; without it the application stops and goes to the report.
- "Apply by email with CV attached" postings: attaching a PDF through a mail MCP may exceed its payload limit. Report the address and leave it to the person rather than sending a mail without the CV.

## Regional boards

- **hh.ru**: navigating straight to the response URL (`/applicant/vacancy_response?vacancyId=<id>`) submits when the employer asks no questions; otherwise it renders the question form. A vacancy page carries several "respond" buttons, most of them for similar vacancies further down; verify the "you responded" state on the vacancy itself. The résumé-visibility banner is not a blocker.
- **Habr Career**: applying is one click, then a text area for a cover note appears; always add the note.
- **Djinni**: some postings refuse with an invalid-LinkedIn-URL error even when the profile is fine; it is their bug, record and move on.
- **getmatch**: the specialization filter is the repeated `sp` URL parameter; the UI checkboxes do not survive a reload. Navigate to the filtered URL directly.
- **HireHi**: the server-rendered page shows a login button until the client hydrates, so a snapshot on load always looks logged out. Check the session with `fetch('/api/auth/me')` from `browser_evaluate` instead. Contacting an employer through Telegram there is a paid feature with a quota; when the quota reads 0, skip those postings instead of filling forms that cannot be sent. Measured cost: about 18 minutes per run for a handful of applications.
- **Himalayas**: the HTML is behind a challenge page; the JSON search API works with a browser user agent. Since October 2026 applying requires a Himalayas account, so the direct ATS links are gone; either keep an account logged in or drop the source.
- **Djinni**: the profile's country field decides whether Ukraine-only postings accept the application; set it per the profile's location-by-market table, otherwise those applications are refused silently.
- **CryptoJobsList**: "Remote" labels are unreliable; the ATS form tells the truth.

## Dead or hostile sources

Remove a source after two runs with no relevant postings or a permanent challenge page. A challenge page is a stop, never something to get past.
