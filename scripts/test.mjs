#!/usr/bin/env node
// Smoke test for the renderer: renders every example, checks page counts and that the
// text made it into the PDF with the template's font embedded. Run with `npm test`. Needs
// poppler (pdftotext, pdffonts) for the text and font checks; without it only page counts
// and file sizes are checked.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const render = join(ROOT, "scripts", "render.mjs");

const cases = [
  {
    input: "examples/cv/base.md",
    output: "examples/cv/Alex_Mustermann_CV.pdf",
    template: "cv.html",
    maxPages: 2,
    mustContain: ["Alex Mustermann", "WORK EXPERIENCE", "Northwind Labs", "Technologies used", "HOBBIES"],
  },
  {
    input: "examples/cover-letters/acme-commerce-frontend-engineer.md",
    output: "examples/cover-letters/acme-commerce-frontend-engineer.pdf",
    template: "cover-letter.html",
    maxPages: 1,
    mustContain: ["Application as Frontend Engineer", "Dear Acme Commerce Team", "Kind regards"],
  },
];

let failed = 0;
for (const c of cases) {
  const input = join(ROOT, c.input);
  const output = join(ROOT, c.output);
  let log;
  try {
    log = execFileSync("node", [render, input, "--no-preview"], { encoding: "utf8" });
  } catch (e) {
    report(c.input, false, `render failed: ${e.stderr || e.message}`);
    continue;
  }
  if (!existsSync(output)) {
    report(c.input, false, `expected ${c.output} to exist`);
    continue;
  }
  const pages = Number((log.match(/\((\d+) page/) || [])[1]);
  if (!(pages >= 1 && pages <= c.maxPages)) {
    report(c.input, false, `expected 1..${c.maxPages} pages, got ${pages}`);
    continue;
  }
  if (statSync(output).size < 10_000) {
    report(c.input, false, `PDF is suspiciously small (${statSync(output).size} bytes)`);
    continue;
  }
  let text, fonts;
  try {
    text = pdfText(output);
    fonts = pdfFonts(output);
  } catch (e) {
    report(c.input, false, e.message);
    continue;
  }
  if (text !== null) {
    const missing = c.mustContain.filter((s) => !text.includes(s));
    if (missing.length) {
      report(c.input, false, `text missing from PDF: ${missing.join(", ")}`);
      continue;
    }
  }
  // The template declares its font with @font-face (Roboto, shipped in fonts/). If the browser
  // could not load it, the PDF silently carries the system fallback instead, which differs per
  // OS and makes the layout non-deterministic across machines and CI.
  if (fonts !== null) {
    const families = declaredFamilies(c.template);
    const missing = families.filter((family) => !fonts.some((f) => f.includes(family)));
    if (missing.length) {
      report(c.input, false, `font not embedded in PDF: ${missing.join(", ")} (embedded: ${fonts.join(", ") || "none"})`);
      continue;
    }
  }
  const skipped = [text === null && "text check skipped (no pdftotext)", fonts === null && "font check skipped (no pdffonts)"].filter(Boolean);
  report(c.input, true, `${pages} page(s)${skipped.length ? ", " + skipped.join(", ") : ""}`);
}

// Every markdown under examples/cv and examples/cover-letters must render without error.
for (const dir of ["examples/cv", "examples/cover-letters"]) {
  for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(".md"))) {
    const input = join(ROOT, dir, f);
    if (cases.some((c) => join(ROOT, c.input) === input)) continue;
    try {
      execFileSync("node", [render, input, "--no-preview"], { encoding: "utf8" });
      report(`${dir}/${f}`, true, "renders");
    } catch (e) {
      report(`${dir}/${f}`, false, `render failed: ${e.stderr || e.message}`);
    }
  }
}

// The mail script must refuse before it touches a mail app: no .mail.env, one still holding the template
// values, and a body with an em-dash or a double hyphen. Each case runs in an empty temp
// folder (the script reads .mail.env from the current folder) and must exit 1 with the expected reason.
const mail = join(ROOT, "scripts", "mail.mjs");
const mailDir = mkdtempSync(join(tmpdir(), "autopilot-mail-"));
try {
  mailRefuses("check without .mail.env", ["check"], /no \.mail\.env/);
  mailRefuses("send refuses an em-dash", ["send", "--to", "a@b.c", "--subject", "x", "--body", `x ${String.fromCharCode(0x2014)} y`], /em-dash/);
  mailRefuses("send refuses a double hyphen", ["send", "--to", "a@b.c", "--subject", "x", "--body", "x -- y"], /double hyphen/);
  mailRefuses("send refuses a missing attachment", ["send", "--to", "a@b.c", "--subject", "x", "--body", "x", "--attach", "missing.pdf"], /attachment not found/);
  writeFileSync(join(mailDir, ".mail.env"), readFileSync(join(ROOT, "templates", "mail.env")));
  mailRefuses("check refuses the unfilled template", ["check"], /template value/);
} finally {
  rmSync(mailDir, { recursive: true, force: true });
}

// Transport selection and the Mail.app argument list are pure functions; importing mail.mjs does not
// run its CLI, so nothing here talks to a mail app or the network.
const { pickTransport, appleMailArgs } = await import(pathToFileURL(mail).href);
transportIs("macOS picks applemail", {}, "darwin", "applemail");
transportIs("Windows picks outlook", {}, "win32", "outlook");
transportIs("Linux has no transport", {}, "linux", /no mail transport on linux/);
transportIs("explicit MAIL_TRANSPORT=Outlook on Windows", { MAIL_TRANSPORT: " Outlook " }, "win32", "outlook");
transportIs("MAIL_TRANSPORT=smtp is refused with the alternatives", { MAIL_TRANSPORT: "SMTP" }, "darwin", /no longer supported; use applemail on macOS or outlook on Windows/);
transportIs("an unknown MAIL_TRANSPORT is an error", { MAIL_TRANSPORT: "carrier-pigeon" }, "darwin", /not one of/);
transportIs("applemail off macOS is an error", { MAIL_TRANSPORT: "applemail" }, "linux", /only on macOS/);
{
  const got = appleMailArgs({ sender: 'A "B" <a@b.c>', to: "x@y.z, w@y.z", cc: undefined, subject: "S", body: "-x\nline", attachments: [{ path: "/p/cv.pdf" }] });
  const want = ['A "B" <a@b.c>', "S", "-x\nline", "2", "x@y.z", "w@y.z", "0", "/p/cv.pdf"];
  const ok = JSON.stringify(got) === JSON.stringify(want);
  report("mail: Mail.app argument list", ok, ok ? "sender, subject, body, counted To and Cc, paths" : `got ${JSON.stringify(got)}`);
}

{
  const forced = process.platform === "darwin" ? "outlook" : "applemail";
  const dir = mkdtempSync(join(tmpdir(), "autopilot-mail-forced-"));
  try {
    writeFileSync(join(dir, ".mail.env"), `MAIL_USER=a@b.c\nMAIL_TRANSPORT=${forced}\n`);
    cliRefuses(mail, dir, `mail: check with MAIL_TRANSPORT=${forced} forced on ${process.platform}`, ["check"], /works only on (Windows|macOS)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// Reading and replying refuse bad input before .mail.env is read or a mail app is touched. Nothing here reads or
// sends a message.
{
  const dir = mkdtempSync(join(tmpdir(), "autopilot-mail-read-"));
  try {
    cliRefuses(mail, dir, "mail: reply refuses an em-dash", ["reply", "--id", "x@y", "--body", `x ${String.fromCharCode(0x2014)} y`], /em-dash/);
    cliRefuses(mail, dir, "mail: reply refuses a double hyphen", ["reply", "--id", "x@y", "--body", "x -- y"], /double hyphen/);
    cliRefuses(mail, dir, "mail: reply without an id", ["reply", "--body", "Thanks"], /--id is required/);
    cliRefuses(mail, dir, "mail: reply without a body", ["reply", "--id", "x@y"], /--body or --body-file is required/);
    cliRefuses(mail, dir, "mail: reply refuses a missing attachment", ["reply", "--id", "x@y", "--body", "x", "--attach", "missing.pdf"], /attachment not found/);
    cliRefuses(mail, dir, "mail: list with a bad --since", ["list", "--since", "yesterday"], /--since: .*neither an ISO 8601 time/);
    cliRefuses(mail, dir, "mail: list with a time without offset", ["list", "--since", "2026-10-12T08:00:00"], /--since/);
    cliRefuses(mail, dir, "mail: list with an unknown mailbox", ["list", "--since", "2d", "--mailbox", "drafts"], /not one of inbox, junk, both/);
    cliRefuses(mail, dir, "mail: --all does not apply to send", ["send", "--all"], /does not apply to send/);
    writeFileSync(join(dir, ".mail.env"), "MAIL_USER=a@b.c\nMAIL_READ=app\nMAIL_TRANSPORT=smtp\n");
    cliRefuses(mail, dir, "mail: check with MAIL_TRANSPORT=smtp", ["check"], /MAIL_TRANSPORT=smtp is no longer supported/);
    writeFileSync(join(dir, ".mail.env"), "MAIL_USER=a@b.c\n");
    cliRefuses(mail, dir, "mail: list when MAIL_READ is absent (connector)", ["list", "--since", "2d"], /MAIL_READ is connector/);
    writeFileSync(join(dir, ".mail.env"), "MAIL_USER=a@b.c\nMAIL_READ=imap\n");
    cliRefuses(mail, dir, "mail: an unknown MAIL_READ", ["check"], /MAIL_READ "imap" is not one of connector, app/);
    writeFileSync(join(dir, ".mail.env"), "MAIL_USER=a@b.c\nMAIL_READ=imap\nMAIL_APP_PASSWORD=abcdabcdabcdabcd\n");
    cliRefuses(mail, dir, "mail: a leftover MAIL_APP_PASSWORD is warned about", ["check"], /SMTP was removed, so delete that line[\s\S]*MAIL_READ "imap"/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
{
  const { parseSince, pickRead, parseAppleList, appleListArgs, splitSentState } = await import(pathToFileURL(mail).href);
  const now = new Date("2026-10-12T12:00:00Z");
  same("mail: --since 2d", parseSince("2d", now).toISOString(), "2026-10-10T12:00:00.000Z");
  same("mail: --since 12h", parseSince("12H", now).toISOString(), "2026-10-12T00:00:00.000Z");
  same("mail: --since an ISO time with offset", parseSince("2026-10-12T08:00:00+02:00", now).toISOString(), "2026-10-12T06:00:00.000Z");
  for (const bad of ["0d", "2w", "yesterday", "2026-10-12T08:00:00", ""]) {
    let threw = false;
    try { parseSince(bad, now); } catch { threw = true; }
    same(`mail: --since "${bad}" is refused`, threw, true);
  }
  same("mail: MAIL_READ absent means connector", pickRead({}), "connector");
  same("mail: MAIL_READ=App means app", pickRead({ MAIL_READ: " App " }), "app");
  same("mail: Mail.app list arguments", JSON.stringify(appleListArgs("a@b.c", new Date("2026-10-12T06:00:00Z"), "both", 8, "Europe/Berlin")), JSON.stringify(["a@b.c", "both", "8", "2026", "10", "12", "8", "0", "0"]));
  const RS = String.fromCharCode(30);
  const FS = String.fromCharCode(31);
  const parsed = parseAppleList(`junk:yes${RS}abc@x${FS}11${FS}2026,10,12,36000${FS}Ann <a@x>${FS}Hi${RS}${FS}12${FS}2026,10,11,0${FS}Bob <b@x>${FS}Re${FS}x\n`);
  same("mail: Mail.app list output", JSON.stringify([parsed.junk, ...parsed.messages.map((m) => [m.id, m.date.getHours(), m.from, m.subject])]), JSON.stringify([true, ["abc@x", 10, "Ann <a@x>", "Hi"], ["#12", 0, "Bob <b@x>", "Re x"]]));
  same("mail: Mail.app send result, outgoing message gone", JSON.stringify(splitSentState("gone\n")), JSON.stringify({ left: false, rest: "" }));
  same("mail: Mail.app reply result, outgoing message left", JSON.stringify(splitSentState("left\na@x, b@x\n")), JSON.stringify({ left: true, rest: "a@x, b@x" }));
}

// The calendar script refuses bad input before it reaches Calendar.app or Outlook, and a forced transport this
// platform lacks ends in one clean line. Spawned for real, so a crash in the CLI entry (a stack trace, a constant
// used before initialization) fails here. Nothing in this file creates an event.
const calendar = join(ROOT, "scripts", "calendar.mjs");
const calDir = mkdtempSync(join(tmpdir(), "autopilot-calendar-"));
try {
  const at = ["--calendar", "Test", "--duration", "30"];
  cliRefuses(calendar, calDir, "calendar: add without a title", ["add", "--start", "2026-10-14T10:00:00+02:00", ...at], /--title is required/);
  cliRefuses(calendar, calDir, "calendar: add with a start without offset", ["add", "--title", "Acme", "--start", "2026-10-14T10:00:00", ...at], /offset or Z/);
  cliRefuses(calendar, calDir, "calendar: add with the end before the start", ["add", "--title", "Acme", "--start", "2026-10-14T10:00:00+02:00", "--end", "2026-10-14T09:00:00+02:00", "--calendar", "Test"], /end is not after the start/);
  cliRefuses(calendar, calDir, "calendar: add refuses an em-dash", ["add", "--title", `Acme ${String.fromCharCode(0x2014)} call`, "--start", "2026-10-14T10:00:00+02:00", ...at], /em-dash/);
  cliRefuses(calendar, calDir, "calendar: add refuses a double hyphen in notes", ["add", "--title", "Acme", "--start", "2026-10-14T10:00:00Z", "--notes", "a -- b", ...at], /double hyphen/);
  cliRefuses(calendar, calDir, "calendar: unknown command", ["frobnicate"], /unknown command/);
  writeFileSync(join(calDir, ".calendar.env"), "CALENDAR_NAME=Test\nCALENDAR_TRANSPORT=carrier-pigeon\n");
  cliRefuses(calendar, calDir, "calendar: unknown CALENDAR_TRANSPORT", ["check"], /not one of applecal, outlook/);
  const forced = process.platform === "darwin" ? "outlook" : "applecal";
  writeFileSync(join(calDir, ".calendar.env"), `CALENDAR_NAME=Test\nCALENDAR_TRANSPORT=${forced}\n`);
  cliRefuses(calendar, calDir, `calendar: check with CALENDAR_TRANSPORT=${forced} forced on ${process.platform}`, ["check"], /works only on (Windows|macOS)/);
  writeFileSync(join(calDir, ".calendar.env"), "CALENDAR_VIA=connector\n");
  cliRuns(calendar, calDir, "calendar: check with CALENDAR_VIA=connector", ["check"], /CALENDAR_VIA=connector: .*not used/);
  writeFileSync(join(calDir, ".calendar.env"), "CALENDAR_VIA=phone\n");
  cliRefuses(calendar, calDir, "calendar: an unknown CALENDAR_VIA", ["check"], /CALENDAR_VIA "phone" is not one of app, connector/);
} finally {
  rmSync(calDir, { recursive: true, force: true });
}

const cal = await import(pathToFileURL(calendar).href);
{
  const berlin = (iso) => cal.formatLocal(cal.parseInstant(iso), "Europe/Berlin");
  same("calendar: a Z time in Berlin summer time", berlin("2026-10-14T08:00:00Z"), "2026-10-14T10:00:00+02:00");
  same("calendar: an offset without colon", berlin("2026-10-14T10:00:00+0200"), "2026-10-14T10:00:00+02:00");
  same("calendar: before the spring DST jump", berlin("2026-03-29T00:30:00Z"), "2026-03-29T01:30:00+01:00");
  same("calendar: after the spring DST jump", berlin("2026-03-29T01:30:00Z"), "2026-03-29T03:30:00+02:00");
  same("calendar: first 02:30 of the autumn DST change", berlin("2026-10-25T00:30:00Z"), "2026-10-25T02:30:00+02:00");
  same("calendar: second 02:30 of the autumn DST change", berlin("2026-10-25T01:30:00Z"), "2026-10-25T02:30:00+01:00");
  same("calendar: local parts in another zone", JSON.stringify(cal.localParts(cal.parseInstant("2026-12-31T23:30:00Z"), "Asia/Tokyo")), JSON.stringify({ year: 2027, month: 1, day: 1, hours: 8, minutes: 30, seconds: 0 }));
  let threw = false;
  try { cal.parseInstant("2026-10-14T10:00:00"); } catch { threw = true; }
  same("calendar: a time without offset is refused", threw, true);
  const ev = (title, start, end) => ({ title, start: new Date(start), end: new Date(end) });
  const wanted = ev("Interview Acme", "2026-10-14T10:00:00Z", "2026-10-14T11:00:00Z");
  same("calendar: duplicate when one title contains the other", cal.isDuplicate(ev("acme", "2026-10-14T10:30:00Z", "2026-10-14T11:30:00Z"), wanted), true);
  same("calendar: duplicate when both start in the same minute", cal.isDuplicate(ev("Call with Bob", "2026-10-14T10:00:00Z", "2026-10-14T10:15:00Z"), wanted), true);
  same("calendar: no duplicate for another title at another time", cal.isDuplicate(ev("Dentist", "2026-10-14T10:30:00Z", "2026-10-14T11:30:00Z"), wanted), false);
  same("calendar: no duplicate without overlap", cal.isDuplicate(ev("Interview Acme", "2026-10-14T11:00:00Z", "2026-10-14T12:00:00Z"), wanted), false);
  same("calendar: CALENDAR_VIA absent means app", cal.pickVia({}), "app");
  same("calendar: CALENDAR_VIA=Connector means connector", cal.pickVia({ CALENDAR_VIA: "Connector" }), "connector");
  same("calendar: macOS picks Calendar.app", cal.pickTransport({}, "darwin"), "applecal");
  same("calendar: Windows picks Outlook", cal.pickTransport({}, "win32"), "outlook");
  for (const [name, env, platform] of [["Linux has no transport", {}, "linux"], ["applecal off macOS", { CALENDAR_TRANSPORT: "applecal" }, "win32"], ["unknown transport", { CALENDAR_TRANSPORT: "x" }, "darwin"]]) {
    let err = null;
    try { cal.pickTransport(env, platform); } catch (e) { err = e; }
    same(`calendar: ${name} is an error`, err instanceof Error, true);
  }
  const args = cal.appleAddArgs("Work", { title: 'Acme "R1"', start: cal.parseInstant("2026-10-14T08:00:00Z"), end: cal.parseInstant("2026-10-14T09:00:00Z"), location: "", url: "https://x.y", notes: cal.eventNotes("https://x.y", "bring CV"), alarm: 30 }, "Europe/Berlin");
  same("calendar: Calendar.app argument list", JSON.stringify(args), JSON.stringify(["Work", 'Acme "R1"', "2026", "10", "14", "10", "0", "0", "2026", "10", "14", "11", "0", "0", "", "https://x.y", "https://x.y\n\nbring CV", "30"]));
  const parsed = cal.parseAppleEvents(`2026,10,14,36000\t2026,10,14,39600\tAcme\tR1${String.fromCharCode(30)}2026,10,15,0\t2026,10,16,0\tAll day\n`);
  same("calendar: Calendar.app find output", JSON.stringify(parsed.map((e) => [e.title, e.start.getHours(), e.end.getDate()])), JSON.stringify([["Acme\tR1", 10, 14], ["All day", 0, 16]]));
}

for (const script of ["mail.mjs", "calendar.mjs"]) {
  const text = readFileSync(join(ROOT, "scripts", script), "utf8");
  same(`${script}: reads no environment`, /process\.env|[$]env:/.test(text), false);
}

process.exit(failed ? 1 : 0);

function transportIs(name, env, platform, expected) {
  let got;
  try {
    got = pickTransport(env, platform);
  } catch (e) {
    got = e;
  }
  const ok = expected instanceof RegExp ? got instanceof Error && expected.test(got.message) : got === expected;
  report(`mail transport: ${name}`, ok, ok ? String(got.message || got).slice(0, 60) : `expected ${expected}, got ${got}`);
}

function same(name, got, want) {
  const ok = got === want;
  report(name, ok, ok ? String(got).slice(0, 60) : `expected ${want}, got ${got}`);
}

function cliRefuses(script, cwd, name, args, reason) {
  const r = spawnSync("node", [script, ...args], { cwd, encoding: "utf8" });
  const out = `${r.stderr}${r.stdout}`.trim();
  const clean = !/\n\s+at |before initialization|ReferenceError|TypeError/.test(out);
  if (r.status === 1 && reason.test(out) && clean) report(name, true, out.split("\n")[0].slice(0, 60));
  else report(name, false, `expected exit 1 with one clean line matching ${reason}, got exit ${r.status}: ${out}`);
}

function cliRuns(script, cwd, name, args, expect) {
  const r = spawnSync("node", [script, ...args], { cwd, encoding: "utf8" });
  const out = `${r.stderr}${r.stdout}`.trim();
  if (r.status === 0 && expect.test(out)) report(name, true, out.split("\n")[0].slice(0, 60));
  else report(name, false, `expected exit 0 matching ${expect}, got exit ${r.status}: ${out}`);
}

function mailRefuses(name, args, reason) {
  const r = spawnSync("node", [mail, ...args], { cwd: mailDir, encoding: "utf8" });
  const out = `${r.stderr}${r.stdout}`.trim();
  if (r.status === 1 && reason.test(out)) report(`mail: ${name}`, true, out.split("\n")[0].slice(0, 60));
  else report(`mail: ${name}`, false, `expected exit 1 matching ${reason}, got exit ${r.status}: ${out}`);
}

// Runs one poppler tool and returns its output. Null means the tool is not installed (ENOENT), so
// the caller skips its check. Any other failure, such as a PDF the tool cannot open, is thrown and
// reported as a failed case: with poppler present, a corrupt PDF is a failure, not a skip.
function poppler(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw new Error(`${bin} failed: ${(e.stderr || e.message).trim()}`);
  }
}

function pdfText(path) {
  return poppler("pdftotext", ["-layout", path, "-"]);
}

// Names of the fonts embedded in the PDF, as pdffonts lists them (`AAAAAA+Roboto-Regular`).
function pdfFonts(path) {
  const out = poppler("pdffonts", [path]);
  if (out === null) return null;
  return out
    .split("\n")
    .slice(2)
    .filter((line) => line.trim())
    .map((line) => line.split(/\s+/)[0]);
}

// The font families the template's @font-face rules declare.
function declaredFamilies(template) {
  const css = readFileSync(join(ROOT, "templates", template), "utf8");
  const families = new Set();
  for (const m of css.matchAll(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g)) families.add(m[1]);
  return [...families];
}

function report(name, ok, msg) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${msg}`);
}
