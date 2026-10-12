#!/usr/bin/env node
// Creates and finds events in the calendar app on this machine, the CALENDAR_VIA=app path for
// putting a booked interview or an assessment deadline in the calendar. A calendar account added to
// the app (Google in System Settings > Internet Accounts with Calendars on, for example) syncs the
// event to the account.
//
//   node scripts/calendar.mjs add --title <text> --start <ISO 8601 with offset> (--end <ISO> | --duration <minutes>)
//        [--url <link>] [--location <text>] [--notes <text> | --notes-file <path>] [--alarm <minutes before, default 30>]
//        [--calendar <name>] [--force]
//   node scripts/calendar.mjs find --from <ISO> --to <ISO> [--match <text>] [--calendar <name>]
//   node scripts/calendar.mjs remove --title <exact title> --start <ISO> [--calendar <name>]
//   node scripts/calendar.mjs check       transport, target calendar, whether it exists and is writable
//   node scripts/calendar.mjs calendars   the calendar names the app has, with a writable flag
//
// Transports, picked by pickTransport() below:
//   applecal  macOS: Calendar.app through osascript.
//   outlook   Windows: classic Outlook through its COM interface (PowerShell).
//
// Config: optional .calendar.env in the workspace, the folder the command runs in (template:
// templates/calendar.env), KEY=VALUE lines: CALENDAR_VIA (app or connector, app when absent),
// CALENDAR_NAME (the calendar to write to and search) and optional CALENDAR_TRANSPORT (applecal or
// outlook). With CALENDAR_VIA=connector the skills use the calendar connector and this script is not
// used; check says so and exits 0. --calendar overrides CALENDAR_NAME. On macOS a
// calendar name is required, because Calendar.app's default calendar cannot be read reliably by a
// script; Outlook falls back to its default calendar.
//
// Times: --start, --end, --from and --to are instants and must carry an offset or Z, since a bare
// local time is ambiguous in a scheduled run. The script converts each instant to this machine's time
// zone and hands the app plain numbers (never a date string, whose parsing depends on the locale).
// Every time printed is local to this machine, with its offset.
//
// Duplicates: add first looks for an event in the target calendar that overlaps [start, end] and
// whose title, compared case-insensitively, contains the new title or is contained in it, or that
// starts at the same minute. If there is one it prints "exists: <title> <start>" and creates nothing,
// unless --force. Recurring events are matched by their first occurrence only.
//
// The title and notes may not contain an em-dash or a double hyphen, because docs/rules.md forbids them in
// anything written in the person's name. Every refusal about the input runs before any transport.

import { readFileSync, existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const TRANSPORTS = ["applecal", "outlook"];
export const VIA = ["app", "connector"];
const LABEL = { applecal: "Calendar.app", outlook: "Outlook" };
const CONFIG = resolve(process.cwd(), ".calendar.env");
const DEFAULT_ALARM = 30;
const USAGE = [
  "usage: node scripts/calendar.mjs add --title <text> --start <ISO with offset> (--end <ISO> | --duration <minutes>) [--url <link>] [--location <text>] [--notes <text> | --notes-file <path>] [--alarm <minutes>] [--calendar <name>] [--force]",
  "       node scripts/calendar.mjs find --from <ISO> --to <ISO> [--match <text>] [--calendar <name>]",
  "       node scripts/calendar.mjs remove --title <exact title> --start <ISO> [--calendar <name>]",
  "       node scripts/calendar.mjs check       print the transport and the target calendar, and whether it is writable",
  "       node scripts/calendar.mjs calendars   list the calendars the app has",
  "config: optional .calendar.env in the current folder with CALENDAR_NAME=<calendar> (copy templates/calendar.env; see /init)",
].join("\n");

const FLAGS = {
  "--title": "title",
  "--start": "start",
  "--end": "end",
  "--duration": "duration",
  "--url": "url",
  "--location": "location",
  "--notes": "notes",
  "--notes-file": "notesFile",
  "--alarm": "alarm",
  "--calendar": "calendar",
  "--from": "from",
  "--to": "to",
  "--match": "match",
};
const ALLOWED = {
  add: ["title", "start", "end", "duration", "url", "location", "notes", "notesFile", "alarm", "calendar", "force"],
  find: ["from", "to", "match", "calendar"],
  remove: ["title", "start", "calendar"],
  check: ["calendar"],
  calendars: [],
};

function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }
  if (!ALLOWED[command]) fail(`unknown command "${command}"\n${USAGE}`);
  const args = parseArgs(rest, command);
  if (command === "add") return add(args);
  if (command === "find") return find(args);
  if (command === "remove") return remove(args);
  if (command === "check") return check(args);
  return calendars();
}

function add(args) {
  if (!args.title || !args.title.trim()) fail("--title is required");
  if (!args.start) fail("--start is required");
  if (args.end === undefined && args.duration === undefined) fail("one of --end or --duration is required");
  if (args.end !== undefined && args.duration !== undefined) fail("give --end or --duration, not both");
  if (args.notes !== undefined && args.notesFile) fail("give --notes or --notes-file, not both");
  const start = instant("--start", args.start);
  let end;
  if (args.duration !== undefined) {
    const minutes = Number(args.duration);
    if (!Number.isInteger(minutes) || minutes <= 0) fail(`--duration "${args.duration}" is not a whole number of minutes above 0`);
    end = new Date(start.getTime() + minutes * 60000);
  } else {
    end = instant("--end", args.end);
  }
  if (end <= start) fail("the end is not after the start");
  let notes = args.notes || "";
  if (args.notesFile) {
    const file = resolve(args.notesFile);
    if (!existsSync(file)) fail(`notes file not found: ${file}`);
    notes = readFileSync(file, "utf8");
  }
  const alarm = args.alarm === undefined ? DEFAULT_ALARM : Number(args.alarm);
  if (!Number.isInteger(alarm) || alarm < 0) fail(`--alarm "${args.alarm}" is not a whole number of minutes`);
  for (const [what, text] of [["title", args.title], ["notes", notes]]) {
    const problem = forbiddenDash(text);
    if (problem) fail(`the ${what} contains ${problem}; docs/rules.md forbids them in anything written in the person's name. Rewrite it with a comma, a colon or a full stop.`);
  }
  const config = loadConfig(args, { needName: true });
  const event = { title: args.title.trim(), start, end, url: args.url || "", location: args.location || "", notes: eventNotes(args.url, notes), alarm };
  if (!args.force) {
    const twin = readEvents(config, start, end).find((e) => isDuplicate(e, event));
    if (twin) {
      console.log(`exists: ${twin.title} ${formatLocal(twin.start)}`);
      return;
    }
  }
  if (config.transport === "applecal") osascript(APPLE_ADD, appleAddArgs(config.calendar, event));
  else outlook({ mode: "add", calendar: config.calendar, title: event.title, start: start.toISOString(), end: end.toISOString(), location: event.location, body: event.notes, alarm });
  console.log(`added: ${event.title} ${formatLocal(start)} (${config.calendar || "default calendar"})`);
}

function find(args) {
  if (!args.from) fail("--from is required");
  if (!args.to) fail("--to is required");
  const from = instant("--from", args.from);
  const to = instant("--to", args.to);
  if (to <= from) fail("--to is not after --from");
  const config = loadConfig(args, { needName: true });
  const match = (args.match || "").toLowerCase();
  const events = readEvents(config, from, to)
    .filter((e) => !match || e.title.toLowerCase().includes(match))
    .sort((a, b) => a.start - b.start);
  for (const e of events) console.log(`${formatLocal(e.start)} ${formatLocal(e.end)} ${e.title}`);
}

function remove(args) {
  if (!args.title) fail("--title is required");
  if (!args.start) fail("--start is required");
  const start = instant("--start", args.start);
  const config = loadConfig(args, { needName: true });
  let removed;
  if (config.transport === "applecal") removed = Number(osascript(APPLE_REMOVE, [config.calendar, args.title, ...dateArgs(start)]).trim());
  else removed = Number(outlook({ mode: "remove", calendar: config.calendar, title: args.title, start: start.toISOString() }).trim());
  console.log(`removed: ${removed} event(s) titled "${args.title}" at ${formatLocal(start)} (${config.calendar || "default calendar"})`);
}

function check(args) {
  let via;
  try {
    via = pickVia(readEnv());
  } catch (e) {
    fail(e.message);
  }
  if (via === "connector") {
    console.log("CALENDAR_VIA=connector: events go through the calendar connector, scripts/calendar.mjs is not used");
    return;
  }
  const config = loadConfig(args, { needName: true });
  const list = listCalendars(config);
  const target = config.calendar;
  const hits = target ? list.filter((c) => c.name === target) : list.filter((c) => c.isDefault);
  if (!hits.length) fail(`${LABEL[config.transport]} has no calendar named "${target}"; run: node scripts/calendar.mjs calendars, then set CALENDAR_NAME in .calendar.env to one of them`);
  if (!hits.some((c) => c.writable)) fail(`the calendar "${target}" in ${LABEL[config.transport]} is read-only; pick a writable one from: node scripts/calendar.mjs calendars`);
  const twins = hits.length > 1 ? `, ${hits.length} calendars share this name and the first is used` : "";
  console.log(`CALENDAR_VIA=app: writes to "${target || hits[0].name}" via ${LABEL[config.transport]}, calendar found and writable${twins}`);
}

function calendars() {
  const config = loadConfig({}, { needName: false });
  for (const c of listCalendars(config)) console.log(`${c.name}${c.writable ? "" : " (read-only)"}${c.isDefault ? " (default)" : ""}`);
}

// ---------- pure helpers ----------

function parseArgs(argv, command) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--force") {
      args.force = true;
    } else if (FLAGS[flag]) {
      if (argv[i + 1] === undefined) fail(`${flag} needs a value`);
      args[FLAGS[flag]] = argv[++i];
    } else {
      fail(`unknown option "${flag}"\n${USAGE}`);
    }
    const key = flag === "--force" ? "force" : FLAGS[flag];
    if (!ALLOWED[command].includes(key)) fail(`${flag} does not apply to ${command}\n${USAGE}`);
  }
  return args;
}

// An ISO 8601 instant with an explicit offset or Z. Throws on anything else, a bare local time
// included: in a scheduled run the machine's zone may not be the one the message meant.
export function parseInstant(text) {
  const m = String(text).trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i);
  if (!m) throw new Error(`"${text}" is not an ISO 8601 time with an offset or Z (for example 2026-10-14T10:00:00+02:00)`);
  const date = new Date(String(text).trim().replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (Number.isNaN(date.getTime())) throw new Error(`"${text}" is not a valid time`);
  return date;
}

// The wall-clock components of an instant in a time zone (this machine's when none is given).
export function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const p = Object.fromEntries(fmt.formatToParts(date).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return { year: p.year, month: p.month, day: p.day, hours: p.hour, minutes: p.minute, seconds: p.second };
}

// An instant as local ISO 8601 with the zone's offset, e.g. 2026-10-14T10:00:00+02:00.
export function formatLocal(date, timeZone) {
  const p = localParts(date, timeZone);
  const offset = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hours, p.minutes, p.seconds) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  const pad = (n, w = 2) => String(Math.abs(n)).padStart(w, "0");
  const sign = offset < 0 ? "-" : "+";
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
}

// True when an existing event is the one about to be created: the two overlap in time, and either
// one title contains the other (case-insensitive) or both start in the same minute.
export function isDuplicate(existing, wanted) {
  const overlaps = existing.start < wanted.end && existing.end > wanted.start;
  if (!overlaps) return false;
  const a = existing.title.trim().toLowerCase();
  const b = wanted.title.trim().toLowerCase();
  if (a && b && (a.includes(b) || b.includes(a))) return true;
  return Math.floor(existing.start.getTime() / 60000) === Math.floor(wanted.start.getTime() / 60000);
}

// Which transport writes. An explicit CALENDAR_TRANSPORT wins; otherwise Calendar.app on macOS and
// classic Outlook on Windows. Throws when nothing can write on this platform. Pure.
export function pickTransport(env, platform) {
  const explicit = (env.CALENDAR_TRANSPORT || "").trim().toLowerCase();
  if (explicit) {
    if (!TRANSPORTS.includes(explicit)) throw new Error(`.calendar.env: CALENDAR_TRANSPORT "${env.CALENDAR_TRANSPORT}" is not one of ${TRANSPORTS.join(", ")}`);
    if (explicit === "applecal" && platform !== "darwin") throw new Error(".calendar.env: CALENDAR_TRANSPORT=applecal works only on macOS");
    if (explicit === "outlook" && platform !== "win32") throw new Error(".calendar.env: CALENDAR_TRANSPORT=outlook works only on Windows");
    return explicit;
  }
  if (platform === "darwin") return "applecal";
  if (platform === "win32") return "outlook";
  throw new Error(`no calendar app transport on this platform (${platform}): the script supports Calendar.app on macOS and classic Outlook on Windows`);
}

export function pickVia(env) {
  const value = (env.CALENDAR_VIA || "").trim().toLowerCase();
  if (!value) return "app";
  if (!VIA.includes(value)) throw new Error(`.calendar.env: CALENDAR_VIA "${env.CALENDAR_VIA}" is not one of ${VIA.join(", ")}`);
  return value;
}

export function forbiddenDash(text) {
  if (String(text).includes(String.fromCharCode(0x2014))) return "an em-dash";
  if (String(text).includes("--")) return "a double hyphen";
  return null;
}

// The event description: the link first, so it survives a sync that drops the URL field, then the notes.
export function eventNotes(url, notes) {
  return [url || "", (notes || "").trim()].filter(Boolean).join("\n\n");
}

// Calendar name, title, start as six numbers, end as six numbers, location, URL, description,
// alarm minutes. Every value is a separate argument of the run handler, never spliced into source.
export function appleAddArgs(calendar, event, timeZone) {
  return [calendar, event.title, ...dateArgs(event.start, timeZone), ...dateArgs(event.end, timeZone), event.location || "", event.url || "", event.notes || "", String(event.alarm)];
}

function dateArgs(date, timeZone) {
  const p = localParts(date, timeZone);
  return [p.year, p.month, p.day, p.hours, p.minutes, p.seconds].map(String);
}

function instant(flag, text) {
  try {
    return parseInstant(text);
  } catch (e) {
    fail(`${flag}: ${e.message}`);
  }
}

// ---------- config ----------

function readEnv() {
  const env = {};
  if (existsSync(CONFIG)) {
    for (const raw of readFileSync(CONFIG, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) fail(`.calendar.env: cannot read line "${line.length > 40 ? line.slice(0, 40) + "..." : line}" (expected KEY=VALUE)`);
      env[line.slice(0, eq).trim()] = unquote(line.slice(eq + 1).trim());
    }
  }
  return env;
}

function loadConfig(args, { needName }) {
  const env = readEnv();
  let transport;
  try {
    transport = pickTransport(env, process.platform);
  } catch (e) {
    fail(e.message);
  }
  const calendar = (args.calendar || env.CALENDAR_NAME || "").trim();
  if (needName && !calendar && transport === "applecal") {
    fail("no calendar named: run node scripts/calendar.mjs calendars, then put CALENDAR_NAME=<one of them> in .calendar.env in this folder (template: templates/calendar.env), or pass --calendar <name>");
  }
  return { transport, calendar };
}

function unquote(value) {
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
}

function readEvents(config, from, to) {
  if (config.transport === "applecal") return parseAppleEvents(osascript(APPLE_FIND, [config.calendar, ...dateArgs(from), ...dateArgs(to)]));
  const out = outlook({ mode: "find", calendar: config.calendar, from: from.toISOString(), to: to.toISOString() });
  return out.split(/\r?\n/).filter(Boolean).map((line) => {
    const [start, end, ...title] = line.split("\t");
    return { start: new Date(start), end: new Date(end), title: title.join("\t") };
  });
}

function listCalendars(config) {
  if (config.transport === "applecal") {
    return osascript(APPLE_CALENDARS, []).split("\n").filter(Boolean).map((line) => {
      const [name, writable] = line.split("\t");
      return { name, writable: writable === "true", isDefault: false };
    });
  }
  return outlook({ mode: "calendars" }).split(/\r?\n/).filter(Boolean).map((line) => {
    const [name, isDefault] = line.split("\t");
    return { name, writable: true, isDefault: isDefault === "default" };
  });
}

// ---------- Calendar.app (macOS) ----------

// Dates are built from numbers on this machine's calendar: day 1 first, so moving to a shorter month
// never overflows, then year, month, day and the time of day in seconds.
export const APPLE_DATE = `
on mkDate(parts, i)
  set d to current date
  set day of d to 1
  set year of d to ((item i of parts) as integer)
  set month of d to ((item (i + 1) of parts) as integer)
  set day of d to ((item (i + 2) of parts) as integer)
  set time of d to ((item (i + 3) of parts) as integer) * 3600 + ((item (i + 4) of parts) as integer) * 60 + ((item (i + 5) of parts) as integer)
  return d
end mkDate

on dateText(d)
  return ((year of d) as text) & "," & (((month of d) as integer) as text) & "," & ((day of d) as text) & "," & ((time of d) as text)
end dateText
`;

const APPLE_ADD = `${APPLE_DATE}
on run argv
  set calName to item 1 of argv
  set theTitle to item 2 of argv
  set startDate to mkDate(argv, 3)
  set endDate to mkDate(argv, 9)
  set theLocation to item 15 of argv
  set theUrl to item 16 of argv
  set theNotes to item 17 of argv
  set alarmMinutes to (item 18 of argv) as integer
  tell application "Calendar"
    if not (exists calendar calName) then error "no calendar named " & calName number 1001
    set ev to make new event at end of events of calendar calName with properties {summary:theTitle, start date:startDate, end date:endDate, location:theLocation, description:theNotes}
    if theUrl is not "" then set url of ev to theUrl
    tell ev to make new display alarm at end of display alarms with properties {trigger interval:(0 - alarmMinutes)}
  end tell
end run
`;

// The matching events are fetched once and each one's three values are read from that same event,
// so a title can never be paired with another event's times (separate per-property queries are not
// guaranteed to come back in the same order). Reading a property of an event reference is fine; it is
// coercing a loop reference itself that fails (-1700).
const APPLE_FIND = `${APPLE_DATE}
on run argv
  set calName to item 1 of argv
  set fromDate to mkDate(argv, 2)
  set toDate to mkDate(argv, 8)
  tell application "Calendar"
    if not (exists calendar calName) then error "no calendar named " & calName number 1001
    set out to {}
    tell calendar calName
      set evs to every event whose start date < toDate and end date > fromDate
      repeat with i from 1 to count of evs
        set ev to item i of evs
        set {t, s, e} to {summary, start date, end date} of ev
        if t is missing value then set t to ""
        set end of out to my dateText(s) & tab & my dateText(e) & tab & t
      end repeat
    end tell
  end tell
  set AppleScript's text item delimiters to (character id 30)
  return out as text
end run
`;

const APPLE_REMOVE = `${APPLE_DATE}
on run argv
  set calName to item 1 of argv
  set theTitle to item 2 of argv
  set startDate to mkDate(argv, 3)
  tell application "Calendar"
    if not (exists calendar calName) then error "no calendar named " & calName number 1001
    tell calendar calName
      set n to count of (every event whose summary is theTitle and start date is startDate)
      if n > 0 then delete (every event whose summary is theTitle and start date is startDate)
    end tell
  end tell
  return n
end run
`;

const APPLE_CALENDARS = `
on run argv
  tell application "Calendar"
    set names to name of every calendar
    set flags to writable of every calendar
  end tell
  set out to {}
  repeat with i from 1 to count of names
    set end of out to (item i of names) & tab & ((item i of flags) as text)
  end repeat
  set AppleScript's text item delimiters to linefeed
  return out as text
end run
`;

// Parses APPLE_FIND output: records split by character 30, fields by tab, dates as
// "year,month,day,seconds of the day" on this machine's clock.
export function parseAppleEvents(text) {
  return String(text).replace(/\n$/, "").split(String.fromCharCode(30)).filter((r) => r.trim()).map((record) => {
    const [start, end, ...title] = record.split("\t");
    return { start: appleDate(start), end: appleDate(end), title: title.join("\t") };
  });
}

function appleDate(text) {
  const [y, mo, d, secs] = text.trim().split(",").map(Number);
  return new Date(y, mo - 1, d, 0, 0, secs);
}

function osascript(script, args) {
  const r = spawnSync("osascript", ["-", ...args], { input: script, encoding: "utf8" });
  if (r.error) fail(`could not run osascript: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr || "").trim();
    if (/-1743\b/.test(err)) fail("not allowed to control Calendar: allow the terminal (or Claude) to control Calendar in System Settings > Privacy & Security > Automation, then run this again");
    if (/\(1001\)/.test(err)) fail(`${err.replace(/^.*?error: /, "").replace(/\s*\(1001\)$/, "")}; run: node scripts/calendar.mjs calendars, and set CALENDAR_NAME in .calendar.env to one of them`);
    if (/not authori[sz]ed|privacy|-10004\b|-1744\b/i.test(err)) fail("Calendar access was denied: allow Calendar access in System Settings > Privacy & Security > Calendars (and Automation), then run this again");
    fail(`Calendar.app failed: ${firstLine(err) || `osascript exit ${r.status}`}`);
  }
  return r.stdout;
}

// ---------- classic Outlook (Windows) ----------

// The data travels as JSON in an environment variable, never spliced into the script, and the constant script goes in
// as -EncodedCommand. Times cross as UTC ISO strings and are converted to local DateTime here.
// Exit 3: no Outlook COM class (the new Outlook has none). Exit 4: no calendar with that name.
const OUTLOOK_PS = `
$ErrorActionPreference = 'Stop'
$d = $env:AUTOPILOT_CALENDAR_JSON | ConvertFrom-Json
try { $ol = New-Object -ComObject Outlook.Application } catch { exit 3 }
$ns = $ol.GetNamespace('MAPI')
$default = $ns.GetDefaultFolder(9)
function Walk($folder) {
  if ($folder.DefaultItemType -eq 1) { $folder }
  foreach ($f in $folder.Folders) { Walk $f }
}
$all = @()
foreach ($store in $ns.Stores) { try { $all += @(Walk $store.GetRootFolder()) } catch {} }
if ($d.mode -eq 'calendars') {
  foreach ($f in $all) { $tag = ''; if ($f.EntryID -eq $default.EntryID) { $tag = 'default' }; [Console]::Out.WriteLine($f.Name + "\`t" + $tag) }
  exit 0
}
$folder = $default
if ($d.calendar) {
  $folder = $all | Where-Object { $_.Name -eq $d.calendar } | Select-Object -First 1
  if (-not $folder) { [Console]::Error.WriteLine('no calendar named ' + $d.calendar); exit 4 }
}
function Local($iso) { [DateTime]::Parse($iso, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal).ToLocalTime() }
function Stamp($dt) { $dt.ToString('yyyy-MM-ddTHH:mm:ss', [Globalization.CultureInfo]::InvariantCulture) }
if ($d.mode -eq 'find' -or $d.mode -eq 'remove') {
  $items = $folder.Items
  $items.IncludeRecurrences = $true
  $items.Sort('[Start]')
  if ($d.mode -eq 'find') { $from = Local $d.from; $to = Local $d.to } else { $from = (Local $d.start).AddMinutes(-1); $to = (Local $d.start).AddMinutes(1) }
  $filter = "[Start] < '" + $to.ToString('g') + "' AND [End] > '" + $from.ToString('g') + "'"
  $hits = @($items.Restrict($filter))
  if ($d.mode -eq 'find') {
    foreach ($i in $hits) { [Console]::Out.WriteLine((Stamp $i.Start) + "\`t" + (Stamp $i.End) + "\`t" + $i.Subject) }
    exit 0
  }
  $start = Local $d.start
  $n = 0
  foreach ($i in $hits) { if ($i.Subject -eq $d.title -and $i.Start -eq $start) { $i.Delete(); $n++ } }
  [Console]::Out.WriteLine($n)
  exit 0
}
$a = $folder.Items.Add(1)
$a.Subject = $d.title
$a.Start = Local $d.start
$a.End = Local $d.end
$a.Location = $d.location
$a.Body = $d.body
$a.ReminderSet = $true
$a.ReminderMinutesBeforeStart = [int]$d.alarm
$a.Save()
`;

function outlook(payload) {
  const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(OUTLOOK_PS, "utf16le").toString("base64")], {
    env: { ...process.env, AUTOPILOT_CALENDAR_JSON: JSON.stringify(payload) },
    encoding: "utf8",
  });
  if (r.error) fail(`could not run powershell: ${r.error.message}`);
  if (r.status === 3) fail("classic Outlook is not installed (the new Outlook has no scripting interface)");
  if (r.status === 4) fail(`Outlook has no calendar named "${payload.calendar}"; run: node scripts/calendar.mjs calendars, and set CALENDAR_NAME in .calendar.env to one of them`);
  if (r.status !== 0) fail(`Outlook failed: ${firstLine((r.stderr || "").trim()) || `powershell exit ${r.status}`}`);
  return r.stdout;
}

function firstLine(text) {
  return String(text).split("\n")[0].trim();
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// Last in the file on purpose: main() reaches the script constants above synchronously, so it must
// start after they are initialised. Runs the CLI only when this file is the script node was started
// with, so test.mjs can import the pure helpers above without touching a calendar.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (e) {
    fail(e.message);
  }
}
