# Platform notes

Platform quirks for `/sweep`.

## Playwright

- **"Browser is already in use."** Orphaned Playwright MCP server processes from earlier sessions hold the same browser profile. Fix it and carry on:

  ```bash
  ps -eo pid,etime,command | grep playwright-mcp | grep -v grep
  ```

  Keep the newest one (it serves the current session), send TERM to all older ones, wait three seconds, re-run the `ps`, retry the navigation. Match only on the string `playwright-mcp`.
- The Playwright profile keeps logins across runs. A logged-out board is skipped and reported; `/init` step 3 re-logs it with the person present.
- Large pages: read the description element with `browser_evaluate` and a selector, or `browser_find` the one control you need by its specific name; on a busy page a vague `browser_find` returns hundreds of matches.
- Clicks that land on an overlay or a zero-size element, or time out after 5 seconds on a covered or detached element: scroll it into view, or call `.click()` on it from `browser_evaluate`.
- `<input type="date">` takes `YYYY-MM-DD` only (typing a word fails with "Malformed value"): set the value through the native setter and dispatch `input` and `change` events from `browser_evaluate`.
- Location autocompletes reject free text: type a partial string, then pick from the listbox.
- Angular and some React forms ignore `fill`: focus the field and type slowly.
- "Ref not found", "Unknown engine ref" or "Malformed value" on a click means a stale ref: snapshot or find again.
- The Playwright MCP has no `computer`, `get_page_text` or `javascript_tool`; `browser_evaluate` does all of that.
- `browser_press_key` uses Playwright key names: `Control+a`, `Meta+a`, `Enter`, `ArrowDown` (`ctrl+a` is "Unknown key"). To clear a field, use `browser_fill_form` or `browser_evaluate` with `el.value = ""`.

## JobCubby (the tracker)

Field names the tools reject silently or with an unhelpful error:

- `update_application_status`: `id` (not `application_id`), `status`, and `rejection_reason` for `rejected`.
- `add_event`: `application_id`, `note` (not `content` or `text`), optional `occurred_at` as a full ISO timestamp.
- `create_application` and `update_application`: `applied_at` and `follow_up_at` are full ISO 8601 timestamps with an offset (`2026-10-17T09:00:00+02:00`); a bare date is "invalid". `resume_id` comes from `list_resumes`, once per run.
- Account limits: 10,000 applications including the archive, 200 new applications a day, 30 a minute. Pace bulk imports to under 30 creates a minute.
- `list_applications` with no filters normally exceeds the tool-output limit and lands in a file over the Read size limit: `grep` it, never `Read` it.
- 2026-10-11: `list_applications` with no filters can instead return inline, silently capped at 100, so the duplicate list misses entries. `create_application` and `save_posting` refuse an exact match and return the existing id: trust that refusal over the duplicate list.

## LinkedIn

- Search URL: quote each keyword and join with `OR` (unquoted keywords go through semantic search and return unrelated roles). Use `geoId` for the location, not the `location` text parameter. `f_TPR=r259200` means last three days; `f_WT=2` means remote. `sortBy=DD` sorts by date.
- Results lazy-load: scroll the results pane and read titles from `li[data-occludable-job-id]`. Page with `&start=25`, `&start=50`.
- If the first navigation lands on `/authwall`, open the feed once and retry.
- Easy Apply radio buttons: click `label[for=<input id>]`, not the input.
- 2026-10-10: the Easy Apply modal is not always `[role=dialog]` in the light DOM on first load; find it with `document.querySelector('dialog[open], [role="dialog"], .jobs-easy-apply-modal')` (also check the `#interop-outlet` shadowRoot). Read fields via `input.labels`, not a snapshot.
- Premium "Top applicant" collection (`/jobs/collections/top-applicant/`): cards are occluded until scrolled into view. "Mark as top choice" is limited per month; spend it only on roles that match the profile exactly.
- Aggregator reposts (generic "Software Engineer" titles from staffing brands) often hide a different stack; open and read before applying.
- Voice messages cannot be transcribed: report them once with the sender and date, then leave them to the person.

## Indeed

- Direct `viewjob?jk=...` links can return a challenge page; load the search results with `&vjk=<jk>` appended and read the detail panel instead.
- Many postings redirect to join.com, which pre-fills a stored, outdated CV: remove the file and upload the current one before submitting.

## StepStone

- Read `#jobDescriptionText` through `browser_evaluate`; the full snapshot is too large.
- 2026-10-10: smart-apply only offers the CV stored in the profile, and the agent does not delete the stored file. Keep the current Lebenslauf as the only profile CV; duplicates also break their matching ("could not read your CV").

## ATS boards (Ashby, Greenhouse, Lever, Teamtailor, Personio)

- Confirm location and work-authorization questions in the actual form before filling; listings often mislabel "remote".
- Radios on Ashby and Greenhouse often do not register through generic `.first()` or `.nth()` selectors: click the labelled element (`label[for=...]`), then verify `[checked]` in a fresh snapshot.
- Ashby yes/no questions are button groups: click the button inside the question's container (`ancestor::div[.//label][1]`), not a radio.
- 2026-10-11: Ashby labelled radio groups (not the yes/no button groups) can show `[checked]` in the snapshot while the `<input>`'s `.checked` stays `false`, and submit then fails with "Missing entry for required field". Verify with `document.getElementById(radio.id).checked`; if false, click the `<label for="...">` from `browser_evaluate`.
- Ashby refuses a second application to the same company within about 90 days; log it as a duplicate.
- 2026-10-12: Ashby country or location pickers can be a fixed whitelist with no matching option and no "Other". When a required field has no honest answer in `profile.md`, stop the application.
- 2026-10-10: Lever forms can end in an hCaptcha on submit; that is the captcha case in `docs/sweep-events.md`.
- 2026-10-12: Lever's "Jobgether" tenant hosts postings for several unrelated end clients under one brand; check the client in the description before treating a second Jobgether posting as a company duplicate.
- 2026-10-10: SAP SuccessFactors portals (`/talentcommunity/apply/<id>`, e.g. FUNKE, Bundesdruckerei) redirect to the portal home on direct navigation, and "Jetzt bewerben" leads to a sign-in: they need a candidate account. Schwarz Digits' SAP "rocketapply" dialog works without an account: set UI5 controls through `sap.ui.getCore().byId(id)`; it shows no confirmation, so check the `api/application/$batch` response (204 + ApplicationSet id).
- 2026-10-10: Dayforce (MoneyGram) offers "Apply without an Account"; its resume import mangles employers and countries, fix the work-history fields before Next.

## Platform inboxes

- Status lists (hh.ru negotiations, Habr responses, Djinni inbox) read as one block of text shift statuses onto neighbouring cards. Use the list only to see what changed; open the card or thread before writing a status.
- Forms that ask for a messenger handle (Telegram, WhatsApp) need it in the profile; without it the application stops and goes to the report.

## Regional boards

- **hh.ru**: navigating straight to the response URL (`/applicant/vacancy_response?vacancyId=<id>`) submits when the employer asks no questions; otherwise it renders the question form. A vacancy page carries several "respond" buttons, most of them for similar vacancies further down; verify the "you responded" state on the vacancy itself. The résumé-visibility banner is not a blocker.
- **Habr Career**: applying is one click, then a text area for a cover note appears; always add the note.
- **Djinni**: some postings refuse with an invalid-LinkedIn-URL error even when the profile is fine; record it and move on.
- **Djinni**: the profile's country field decides whether Ukraine-only postings accept the application; set it per the profile's location-by-market table. 2026-10-11: the "Україна" option in "Країна, де ви знаходитесь зараз" is disabled in the profile editor, so Ukraine-only postings on Djinni are unreachable; skip them with a note.
- **getmatch**: the specialization filter is the repeated `sp` URL parameter; the UI checkboxes do not survive a reload. Navigate to the filtered URL directly.
- **HireHi** (2026-10-10): the vacancy page's SSR JSON has `apply_url`; `null` means Telegram-only (PRO quota), a URL (often LinkedIn) means apply there. Check it with `fetch` instead of opening each page.
- **HireHi**: the page shows a login button until the client hydrates, so check the session with `fetch('/api/auth/me')` from `browser_evaluate`, not a snapshot. Contacting an employer through Telegram is a paid feature with a quota; when the quota reads 0, skip those postings.
- **Himalayas**: the HTML is behind a challenge page; the JSON search API works with a browser user agent. 2026-10: applying requires a Himalayas account; keep one logged in or drop the source.
- **CryptoJobsList**: "Remote" labels are unreliable; the ATS form tells the truth.
