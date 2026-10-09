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

## Regional boards

- **hh.ru**: navigating straight to the response URL (`/applicant/vacancy_response?vacancyId=<id>`) submits when the employer asks no questions; otherwise it renders the question form. A vacancy page carries several "respond" buttons, most of them for similar vacancies further down; verify the "you responded" state on the vacancy itself. The résumé-visibility banner is not a blocker.
- **Habr Career**: applying is one click, then a text area for a cover note appears; always add the note.
- **Djinni**: some postings refuse with an invalid-LinkedIn-URL error even when the profile is fine; it is their bug, record and move on.
- **getmatch**: the specialization filter is the repeated `sp` URL parameter; the UI checkboxes do not survive a reload. Navigate to the filtered URL directly.
- **HireHi**: the server-rendered page shows a login button until the client hydrates, so a snapshot on load always looks logged out. Check the session with `fetch('/api/auth/me')` from `browser_evaluate` instead.
- **Himalayas**: the HTML is behind a challenge page; use the JSON search API with a browser user agent and apply through each job's `applicationLink`.
- **CryptoJobsList**: "Remote" labels are unreliable; the ATS form tells the truth.

## Dead or hostile sources

Remove a source after two runs with no relevant postings or a permanent challenge page. A challenge page is a stop, never something to get past.
