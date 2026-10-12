#!/usr/bin/env node
// Sends a plain-text mail with files attached from disk, so the sweep can apply to postings that
// accept applications only by email with the CV PDF attached. The claude.ai mail connector takes an
// attachment only as base64 inside the tool call, which costs tens of thousands of output tokens per
// CV and fails often; this script reads the file itself and hands it to a mail transport. With
// MAIL_READ=app it also reads the inbox and replies in a thread through the same mail app, for a
// workspace that chose the mail app over a mail connector for reading.
//
//   node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...
//   node scripts/mail.mjs test      mails the account itself, nothing attached (/init runs it to verify the setup)
//   node scripts/mail.mjs check     says which transport and address would send and which path reads; exit 1 when that cannot work
//   node scripts/mail.mjs list --since <ISO with offset | Nd | Nh> [--mailbox inbox|junk|both]
//        one line per message, newest first: <id> TAB <date, local ISO> TAB <from> TAB <subject>
//   node scripts/mail.mjs show --id <id>     the headers (from, to, cc, date, subject), a blank line, the plain text
//   node scripts/mail.mjs reply --id <id> (--body <text> | --body-file <path>) [--all] [--attach <path>]...
//        replies in the thread from MAIL_USER (to everyone on it with --all); the body is the whole reply,
//        no quote of the original is added. Same refusals as send, before the app is touched.
//
// Reading (list, show, reply) needs MAIL_READ=app and the mail app transport: SMTP cannot read mail.
// With MAIL_READ=connector, the default, the skills read and reply through the mail connector and
// these three commands refuse. Mail.app reads the inbox and the junk mailbox (named Junk, Spam, Junk
// E-mail, Junk Email or Bulk Mail) of the account whose address is MAIL_USER. It knows only what it
// has downloaded, so list first tells Mail to check that account for new mail and waits a few seconds
// (MAIL_CHECK_WAIT, default 8) before reading; a Mac that just woke up may still miss the newest mail
// for a minute. A message id is the Message-ID header as Mail reports it, stable when the message moves
// between mailboxes; a message without one gets "#" plus Mail's own number for it, which holds only
// while the message stays in its mailbox. show and reply look an id up in the inbox, then the junk
// mailbox, of the same account. In Outlook the id is the item's EntryID. Reply in Mail.app and all of
// the Outlook reading path are untested.
//
// Transports, picked by pickTransport() below:
//   applemail  macOS: Mail.app through osascript, from an account added in System Settings > Internet
//              Accounts. Needs no password; the default on macOS when no app password is set.
//   outlook    Windows: classic Outlook through its COM interface (PowerShell). Needs no password; the
//              default on Windows when no app password is set. UNTESTED: written without a Windows
//              machine to run it on.
//   smtp       any OS: SMTP with an app password (Gmail by default). The default whenever
//              MAIL_APP_PASSWORD is set.
//
// Config: .mail.env in the workspace, the folder the command runs in (template: templates/mail.env),
// KEY=VALUE lines: MAIL_USER (the sender address, always required: it picks the account, so a mail
// never leaves from the wrong one), optional MAIL_FROM_NAME (display name), MAIL_TRANSPORT (smtp,
// applemail or outlook; /init writes it, and when it is absent the default above applies) and MAIL_READ
// (connector or app; connector when absent). For SMTP also MAIL_APP_PASSWORD (an app password, never the account
// password) and optional MAIL_HOST and MAIL_PORT (defaults smtp.gmail.com and 465, TLS). A file
// holding a password must be readable by its owner only (chmod 600); the password is never printed.
// The subject and body may not contain an em-dash or a double hyphen, because rules.md forbids them in
// anything sent in the person's name. Every refusal about the message runs before any transport.

import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { parseInstant, localParts, formatLocal, forbiddenDash, APPLE_DATE } from "./calendar.mjs";

export const TRANSPORTS = ["smtp", "applemail", "outlook"];
export const READ_PATHS = ["connector", "app"];
const MAILBOXES = ["inbox", "junk", "both"];
const DEFAULT_CHECK_WAIT = 8;
const LABEL = { smtp: "SMTP", applemail: "Mail.app", outlook: "Outlook" };
const CONFIG = resolve(process.cwd(), ".mail.env");
const USAGE = [
  "usage: node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...",
  "       node scripts/mail.mjs test     send a test mail to the configured account itself",
  "       node scripts/mail.mjs check    print the transport, the sender address and the read path, and whether that account is there",
  "       node scripts/mail.mjs list --since <ISO with offset | Nd | Nh> [--mailbox inbox|junk|both]",
  "       node scripts/mail.mjs show --id <id>",
  "       node scripts/mail.mjs reply --id <id> (--body <text> | --body-file <path>) [--all] [--attach <path>]...",
  "config: .mail.env in the current folder (copy templates/mail.env and fill in MAIL_USER; see /init)",
].join("\n");


async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }
  if (!ALLOWED[command]) fail(`unknown command "${command}"\n${USAGE}`);
  const args = parseArgs(rest, command);
  if (command === "check") return check();
  if (command === "test") return test();
  if (command === "send") return send(args);
  if (command === "list") return list(args);
  if (command === "show") return show(args);
  return reply(args);
}

function check() {
  const config = loadConfig();
  const reads = config.read === "app" ? `reads mail via ${LABEL[config.transport]} (MAIL_READ=app)` : "reads mail via the mail connector (MAIL_READ=connector)";
  if (config.read === "app" && config.transport === "smtp") fail(smtpCannotRead());
  if (config.transport === "smtp") {
    console.log(`.mail.env found, sends as ${config.user} via SMTP (${config.host}:${config.port}), ${reads}`);
    return;
  }
  requireAccount(config);
  const note = config.transport === "outlook" ? " (the Outlook transport is untested)" : "";
  console.log(`sends as ${config.user} via ${LABEL[config.transport]}, account found, ${reads}${note}`);
}

async function test() {
  const config = loadConfig();
  await deliver(config, {
    to: config.user,
    subject: "autopilot-jobsearch mail test",
    body: "This is a test mail from autopilot-jobsearch. If it arrived, the sweep can send email applications from this account.\n",
    attachments: [],
  });
}

async function send(args) {
  if (!args.to) fail("--to is required");
  if (!args.subject) fail("--subject is required");
  const body = readBody(args);
  refuseDashes([["subject", args.subject], ["body", body]]);
  const attachments = readAttachments(args);
  const config = loadConfig();
  await deliver(config, { to: args.to, cc: args.cc, subject: args.subject, body, attachments });
}

function list(args) {
  if (!args.since) fail("--since is required: an ISO 8601 time with an offset, or a span like 2d or 12h");
  let since;
  try {
    since = parseSince(args.since);
  } catch (e) {
    fail(`--since: ${e.message}`);
  }
  const mailbox = (args.mailbox || "both").toLowerCase();
  if (!MAILBOXES.includes(mailbox)) fail(`--mailbox "${args.mailbox}" is not one of ${MAILBOXES.join(", ")}`);
  const config = readConfig();
  const { messages, junk } = config.transport === "applemail" ? appleMailList(config, since, mailbox) : outlookList(config, since, mailbox);
  if (!junk && mailbox !== "inbox") console.error(`note: no junk mailbox found for ${config.user}; listed the inbox only`);
  const seen = new Set();
  for (const m of messages.sort((a, b) => b.date - a.date)) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    console.log([m.id, formatLocal(m.date), oneLine(m.from), oneLine(m.subject)].join("\t"));
  }
}

function show(args) {
  if (!args.id) fail("--id is required (the first column of list)");
  const config = readConfig();
  const m = config.transport === "applemail" ? appleMailShow(config, args.id) : outlookShow(config, args.id);
  console.log(`From: ${oneLine(m.from)}`);
  console.log(`To: ${oneLine(m.to)}`);
  console.log(`Cc: ${oneLine(m.cc)}`);
  console.log(`Date: ${formatLocal(m.date)}`);
  console.log(`Subject: ${oneLine(m.subject)}`);
  console.log("");
  console.log(m.body);
}

function reply(args) {
  if (!args.id) fail("--id is required (the first column of list)");
  const body = readBody(args);
  refuseDashes([["body", body]]);
  const attachments = readAttachments(args);
  const config = readConfig();
  const to = config.transport === "applemail"
    ? osascript(APPLEMAIL_REPLY, appleReplyArgs({ user: config.user, sender: senderField(config), id: args.id, all: !!args.all, body, attachments })).trim()
    : powershell({ mode: "reply", user: config.user, id: args.id, all: !!args.all, body, attachments: attachments.map((a) => a.path) }).trim();
  console.log(`replied via ${LABEL[config.transport]} to ${oneLine(to) || "the sender"}`);
}

function readBody(args) {
  if (args.body === undefined && !args.bodyFile) fail("one of --body or --body-file is required");
  if (args.body !== undefined && args.bodyFile) fail("give --body or --body-file, not both");
  let body = args.body;
  if (args.bodyFile) {
    const file = resolve(args.bodyFile);
    if (!existsSync(file)) fail(`body file not found: ${file}`);
    body = readFileSync(file, "utf8");
  }
  if (!body.trim()) fail("the body is empty");
  return body;
}

function refuseDashes(fields) {
  for (const [what, text] of fields) {
    const problem = forbiddenDash(text);
    if (problem) fail(`the ${what} contains ${problem}; rules.md forbids them in anything sent in the person's name. Rewrite it with a comma, a colon or a full stop.`);
  }
}

function readAttachments(args) {
  return args.attach.map((p) => {
    const file = resolve(p);
    if (!existsSync(file)) fail(`attachment not found: ${file}`);
    return { filename: basename(file), path: file };
  });
}

function readConfig() {
  const config = loadConfig();
  if (config.read !== "app") fail(`.mail.env: MAIL_READ is ${config.read}, so mail is read and answered through the mail connector; list, show and reply are for MAIL_READ=app (run /init to change the choice)`);
  if (config.transport === "smtp") fail(smtpCannotRead());
  return config;
}

function smtpCannotRead() {
  return ".mail.env: SMTP cannot read mail. MAIL_READ=app needs the mail app: MAIL_TRANSPORT=applemail on macOS or outlook on Windows; or set MAIL_READ=connector (run /init to change the choice)";
}

function oneLine(text) {
  return String(text ?? "").replace(/[\t\r\n\u001e\u001f]+/g, " ").trim();
}

// ---------- CLI ----------

const FLAGS = {
  "--to": "to",
  "--cc": "cc",
  "--subject": "subject",
  "--body": "body",
  "--body-file": "bodyFile",
  "--attach": "attach",
  "--since": "since",
  "--mailbox": "mailbox",
  "--id": "id",
};
const ALLOWED = {
  check: [],
  test: [],
  send: ["to", "cc", "subject", "body", "bodyFile", "attach"],
  list: ["since", "mailbox"],
  show: ["id"],
  reply: ["id", "body", "bodyFile", "attach", "all"],
};

function parseArgs(argv, command) {
  const args = { attach: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const key = flag === "--all" ? "all" : FLAGS[flag];
    if (!key) fail(`unknown option "${flag}"\n${USAGE}`);
    if (!ALLOWED[command].includes(key)) fail(`${flag} does not apply to ${command}\n${USAGE}`);
    if (key === "all") {
      args.all = true;
      continue;
    }
    if (argv[i + 1] === undefined) fail(`${flag} needs a value`);
    const value = argv[++i];
    if (key === "attach") args.attach.push(value);
    else args[key] = value;
  }
  return args;
}

export function parseSince(text, now = new Date()) {
  const s = String(text ?? "").trim();
  const span = s.match(/^(\d+)\s*([dh])$/i);
  if (span) {
    const n = Number(span[1]);
    if (n <= 0) throw new Error(`"${text}" is an empty span; give at least 1d or 1h`);
    return new Date(now.getTime() - n * (span[2].toLowerCase() === "d" ? 86400000 : 3600000));
  }
  try {
    return parseInstant(s);
  } catch {
    throw new Error(`"${text}" is neither an ISO 8601 time with an offset or Z (2026-10-12T08:00:00+02:00) nor a span like 2d or 12h`);
  }
}

// ---------- config ----------

// An app password counts only when it is filled in: the template's row of x is no password.
export function hasPassword(env) {
  const pass = (env.MAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  return pass !== "" && !/^x+$/i.test(pass);
}

// Which transport sends. An explicit MAIL_TRANSPORT wins; otherwise SMTP when an app password is
// set, else the OS mail app (Mail.app on macOS, classic Outlook on Windows). Throws when nothing
// can send on this platform. Pure: reads only its arguments.
export function pickTransport(env, platform) {
  const explicit = (env.MAIL_TRANSPORT || "").trim().toLowerCase();
  if (explicit) {
    if (!TRANSPORTS.includes(explicit)) throw new Error(`.mail.env: MAIL_TRANSPORT "${env.MAIL_TRANSPORT}" is not one of ${TRANSPORTS.join(", ")}`);
    if (explicit === "applemail" && platform !== "darwin") throw new Error(".mail.env: MAIL_TRANSPORT=applemail works only on macOS");
    if (explicit === "outlook" && platform !== "win32") throw new Error(".mail.env: MAIL_TRANSPORT=outlook works only on Windows");
    return explicit;
  }
  if (hasPassword(env)) return "smtp";
  if (platform === "darwin") return "applemail";
  if (platform === "win32") return "outlook";
  throw new Error(".mail.env: set MAIL_APP_PASSWORD for SMTP (no mail app transport on this platform)");
}

export function pickRead(env) {
  const value = (env.MAIL_READ || "").trim().toLowerCase();
  if (!value) return "connector";
  if (!READ_PATHS.includes(value)) throw new Error(`.mail.env: MAIL_READ "${env.MAIL_READ}" is not one of ${READ_PATHS.join(", ")}`);
  return value;
}

// Reads .mail.env from the current folder. Refuses a file other users can read when it holds an
// app password: that password gives full access to the mailbox.
function loadConfig() {
  if (!existsSync(CONFIG)) fail(`no .mail.env in ${process.cwd()}: copy templates/mail.env there and fill in MAIL_USER, the address to send from (see /init)`);
  const env = {};
  for (const raw of readFileSync(CONFIG, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) fail(`.mail.env: cannot read line "${line.length > 40 ? line.slice(0, 40) + "..." : line}" (expected KEY=VALUE)`);
    env[line.slice(0, eq).trim()] = unquote(line.slice(eq + 1).trim());
  }
  if (hasPassword(env) && statSync(CONFIG).mode & 0o077) fail(".mail.env holds a password and is readable by other users; run: chmod 600 .mail.env");
  const user = env.MAIL_USER || "";
  if (!user || !user.includes("@") || user === "you@gmail.com") fail(".mail.env: MAIL_USER is missing or still the template value");
  let transport;
  let read;
  try {
    transport = pickTransport(env, process.platform);
    read = pickRead(env);
  } catch (e) {
    fail(e.message);
  }
  const config = { transport, read, user, fromName: env.MAIL_FROM_NAME || "", checkWait: checkWait(env) };
  if (transport !== "smtp") return config;
  // Google shows the app password in four groups; the spaces are not part of it.
  if (!hasPassword(env)) fail(".mail.env: MAIL_APP_PASSWORD is missing or still the template value (MAIL_TRANSPORT=smtp needs one)");
  const port = Number(env.MAIL_PORT || 465);
  if (!Number.isInteger(port) || port <= 0) fail(`.mail.env: MAIL_PORT "${env.MAIL_PORT}" is not a port number`);
  return { ...config, pass: env.MAIL_APP_PASSWORD.replace(/\s+/g, ""), host: env.MAIL_HOST || "smtp.gmail.com", port };
}

function checkWait(env) {
  if (env.MAIL_CHECK_WAIT === undefined || env.MAIL_CHECK_WAIT === "") return DEFAULT_CHECK_WAIT;
  const n = Number(env.MAIL_CHECK_WAIT);
  if (!Number.isInteger(n) || n < 0 || n > 60) fail(`.mail.env: MAIL_CHECK_WAIT "${env.MAIL_CHECK_WAIT}" is not a whole number of seconds from 0 to 60`);
  return n;
}

function unquote(value) {
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
}

function splitAddresses(list) {
  return String(list || "").split(/[,;]/).map((a) => a.trim()).filter(Boolean);
}

function senderField(config) {
  return config.fromName ? `${config.fromName} <${config.user}>` : config.user;
}

async function deliver(config, message) {
  if (config.transport === "smtp") return deliverSmtp(config, message);
  requireAccount(config);
  const recipients = [...splitAddresses(message.to), ...splitAddresses(message.cc)];
  if (config.transport === "applemail") deliverAppleMail(config, message);
  else deliverOutlook(config, message);
  // Neither app hands back a message id; the mail is in the app's Sent folder.
  console.log(`sent via ${LABEL[config.transport]} to ${recipients.join(", ")}`);
}

// Exits 1 unless the mail app has an account for the sender address. Read-only.
function requireAccount(config) {
  const addresses = config.transport === "applemail" ? appleMailAddresses() : outlookAddresses();
  const want = config.user.toLowerCase();
  if (addresses.some((a) => a.toLowerCase() === want)) return;
  const known = addresses.length ? ` (it has: ${addresses.join(", ")})` : "";
  if (config.transport === "applemail") fail(`Mail.app has no account for ${config.user}${known}: add it in System Settings > Internet Accounts`);
  fail(`Outlook has no account for ${config.user}${known}: add it in Outlook under File > Account Settings`);
}

// ---------- SMTP ----------

async function deliverSmtp(config, { to, cc, subject, body, attachments }) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  let info;
  try {
    info = await transport.sendMail({
      from: config.fromName ? { name: config.fromName, address: config.user } : config.user,
      to,
      cc: cc || undefined,
      subject,
      text: body,
      attachments,
    });
  } catch (e) {
    if (e.code === "EAUTH") fail(`authentication failed for ${config.user}: check MAIL_APP_PASSWORD in .mail.env (an app password from https://myaccount.google.com/apppasswords, not the account password)`);
    if (e.code === "ESOCKET" || e.code === "ECONNECTION" || e.code === "ETIMEDOUT") fail(`could not reach ${config.host}:${config.port}: ${firstLine(e.message)}`);
    fail(`send failed: ${firstLine(e.message)}`);
  } finally {
    transport.close();
  }
  const accepted = (info.accepted || []).map((a) => (typeof a === "string" ? a : a.address));
  console.log(`sent ${info.messageId} to ${accepted.join(", ") || "nobody"}`);
  if (info.rejected && info.rejected.length) fail(`rejected by the server: ${info.rejected.join(", ")}`);
}

// ---------- Mail.app (macOS) ----------

// Every value reaches the script as an argument of its run handler, never spliced into the source,
// so quotes or backslashes in a subject cannot break or change the script. Argument layout, built by
// appleMailArgs(): sender, subject, body, number of To addresses, the To addresses, number of Cc
// addresses, the Cc addresses, then one POSIX path per attachment.
const APPLEMAIL_SEND = `
on run argv
  set theSender to item 1 of argv
  set theSubject to item 2 of argv
  set theBody to item 3 of argv
  set i to 4
  set toList to {}
  repeat ((item i of argv) as integer) times
    set i to i + 1
    set end of toList to item i of argv
  end repeat
  set i to i + 1
  set ccList to {}
  repeat ((item i of argv) as integer) times
    set i to i + 1
    set end of ccList to item i of argv
  end repeat
  set fileList to {}
  repeat with j from (i + 1) to (count of argv)
    set end of fileList to ((POSIX file (item j of argv)) as alias)
  end repeat
  tell application "Mail"
    set msg to make new outgoing message with properties {subject:theSubject, content:theBody, visible:false}
    set sender of msg to theSender
    tell msg
      repeat with addr in toList
        make new to recipient at end of to recipients with properties {address:(contents of addr)}
      end repeat
      repeat with addr in ccList
        make new cc recipient at end of cc recipients with properties {address:(contents of addr)}
      end repeat
      repeat with f in fileList
        make new attachment with properties {file name:(contents of f)} at after last paragraph of content
        -- Mail drops an attachment that has not finished loading when send runs.
        delay 1
      end repeat
    end tell
    send msg
  end tell
end run
`;

const APPLEMAIL_ACCOUNTS = `
on run argv
  set out to {}
  -- Fetch the values in one call; looping over Mail's object references and coercing them fails (-1700).
  tell application "Mail" to set perAccount to email addresses of every account
  repeat with addrs in perAccount
    repeat with addr in (contents of addrs)
      set end of out to ((contents of addr) as text)
    end repeat
  end repeat
  set AppleScript's text item delimiters to linefeed
  return out as text
end run
`;

const APPLEMAIL_LOOKUP = `${APPLE_DATE}
on findAccount(theUser)
  tell application "Mail"
    set accs to every account
    repeat with i from 1 to count of accs
      set a to item i of accs
      set addrs to email addresses of a
      repeat with k from 1 to count of addrs
        if (item k of addrs) is theUser then return a
      end repeat
    end repeat
  end tell
  error "Mail.app has no account for " & theUser & ": add it in System Settings > Internet Accounts" number 1002
end findAccount

on accountBoxes(acc)
  tell application "Mail"
    set inboxBox to missing value
    set junkBox to missing value
    set accBoxes to every mailbox of acc
    repeat with i from 1 to count of accBoxes
      set b to item i of accBoxes
      set n to name of b
      if inboxBox is missing value and n is "INBOX" then set inboxBox to b
      if junkBox is missing value and (n is "Junk" or n is "Spam" or n is "Junk E-mail" or n is "Junk Email" or n is "Bulk Mail") then set junkBox to b
    end repeat
  end tell
  if inboxBox is missing value then error "Mail.app shows no inbox for this account yet: open Mail and let it finish loading the account" number 1004
  return {inboxBox, junkBox}
end accountBoxes

on findMessage(acc, theId)
  set {inboxBox, junkBox} to accountBoxes(acc)
  set boxes to {inboxBox}
  if junkBox is not missing value then set end of boxes to junkBox
  tell application "Mail"
    repeat with i from 1 to count of boxes
      set bx to item i of boxes
      if theId starts with "#" then
        set hits to (every message of bx whose id is ((text 2 thru -1 of theId) as integer))
      else
        set hits to (every message of bx whose message id is theId)
      end if
      if (count of hits) > 0 then return item 1 of hits
    end repeat
  end tell
  error "no message with id " & theId & " in the inbox or junk mailbox of this account" number 1003
end findMessage

on joinList(xs, sep)
  set AppleScript's text item delimiters to sep
  set t to xs as text
  set AppleScript's text item delimiters to ""
  return t
end joinList
`;

const APPLEMAIL_LIST = `${APPLEMAIL_LOOKUP}
on run argv
  set theUser to item 1 of argv
  set which to item 2 of argv
  set waitSecs to (item 3 of argv) as integer
  set sinceDate to mkDate(argv, 4)
  set fs to character id 31
  set acc to findAccount(theUser)
  tell application "Mail" to check for new mail for acc
  if waitSecs > 0 then delay waitSecs
  set {inboxBox, junkBox} to accountBoxes(acc)
  set boxes to {}
  if which is not "junk" then set end of boxes to inboxBox
  if which is not "inbox" and junkBox is not missing value then set end of boxes to junkBox
  set out to {}
  if junkBox is missing value then
    set end of out to "junk:no"
  else
    set end of out to "junk:yes"
  end if
  tell application "Mail"
    repeat with i from 1 to count of boxes
      set bx to item i of boxes
      set msgs to (every message of bx whose date received > sinceDate)
      repeat with j from 1 to count of msgs
        set m to item j of msgs
        set {mid, nid, dr, snd, sj} to {message id, id, date received, sender, subject} of m
        if mid is missing value then set mid to ""
        if snd is missing value then set snd to ""
        if sj is missing value then set sj to ""
        set end of out to mid & fs & (nid as text) & fs & my dateText(dr) & fs & snd & fs & sj
      end repeat
    end repeat
  end tell
  return joinList(out, character id 30)
end run
`;

const APPLEMAIL_SHOW = `${APPLEMAIL_LOOKUP}
on run argv
  set m to findMessage(findAccount(item 1 of argv), item 2 of argv)
  tell application "Mail"
    set {snd, dr, sj, theContent} to {sender, date received, subject, content} of m
    set toList to address of every to recipient of m
    set ccList to address of every cc recipient of m
  end tell
  if snd is missing value then set snd to ""
  if sj is missing value then set sj to ""
  if theContent is missing value then set theContent to ""
  set fs to character id 31
  return snd & fs & joinList(toList, ", ") & fs & joinList(ccList, ", ") & fs & dateText(dr) & fs & sj & fs & theContent
end run
`;

const APPLEMAIL_REPLY = `${APPLEMAIL_LOOKUP}
on run argv
  set theUser to item 1 of argv
  set theSender to item 2 of argv
  set theId to item 3 of argv
  set allFlag to ((item 4 of argv) is "1")
  set theBody to item 5 of argv
  set fileList to {}
  repeat with j from 6 to (count of argv)
    set end of fileList to ((POSIX file (item j of argv)) as alias)
  end repeat
  set m to findMessage(findAccount(theUser), theId)
  tell application "Mail"
    set r to reply m opening window false reply to all allFlag
    try
      set sender of r to theSender
      set content of r to theBody
      tell r
        repeat with f in fileList
          make new attachment with properties {file name:(contents of f)} at after last paragraph of content
          delay 1
        end repeat
      end tell
      set toList to address of every to recipient of r
      send r
    on error errMsg number errNum
      try
        close r saving no
      end try
      error errMsg number errNum
    end try
  end tell
  return joinList(toList, ", ")
end run
`;

export function appleReplyArgs({ user, sender, id, all, body, attachments }) {
  return [user, sender, id, all ? "1" : "0", body, ...attachments.map((a) => a.path)];
}

export function appleListArgs(user, since, mailbox, wait, timeZone) {
  const p = localParts(since, timeZone);
  return [user, mailbox, String(wait), ...[p.year, p.month, p.day, p.hours, p.minutes, p.seconds].map(String)];
}

export function parseAppleList(text) {
  const records = String(text).replace(/\n$/, "").split(String.fromCharCode(30)).filter((r) => r.trim());
  const junk = records.length ? records[0] === "junk:yes" : false;
  const messages = records.slice(1).map((record) => {
    const [mid, nid, date, from, ...subject] = record.split(String.fromCharCode(31));
    return { id: mid ? mid : `#${nid}`, date: appleDate(date), from, subject: subject.join(" ") };
  });
  return { junk, messages };
}

function appleDate(text) {
  const [y, mo, d, secs] = String(text).trim().split(",").map(Number);
  return new Date(y, mo - 1, d, 0, 0, secs);
}

function appleMailList(config, since, mailbox) {
  return parseAppleList(osascript(APPLEMAIL_LIST, appleListArgs(config.user, since, mailbox, config.checkWait)));
}

function appleMailShow(config, id) {
  const [from, to, cc, date, subject, ...body] = osascript(APPLEMAIL_SHOW, [config.user, id]).replace(/\n$/, "").split(String.fromCharCode(31));
  return { from, to, cc, date: appleDate(date), subject, body: body.join(" ") };
}

export function appleMailArgs({ sender, to, cc, subject, body, attachments }) {
  const toList = splitAddresses(to);
  const ccList = splitAddresses(cc);
  return [sender, subject, body, String(toList.length), ...toList, String(ccList.length), ...ccList, ...attachments.map((a) => a.path)];
}

function osascript(script, args) {
  // "-" reads the script from stdin; everything after it goes to the run handler as argv.
  const r = spawnSync("osascript", ["-", ...args], { input: script, encoding: "utf8" });
  if (r.error) fail(`could not run osascript: ${r.error.message}`);
  if (r.status !== 0) {
    const err = (r.stderr || "").trim();
    if (/-1743\b/.test(err)) fail("not allowed to control Mail: allow the terminal (or Claude) to control Mail in System Settings > Privacy & Security > Automation, then run this again");
    if (/\(100[234]\)/.test(err)) fail(err.replace(/^.*?error: /, "").replace(/\s*\(100[234]\)$/, ""));
    fail(`Mail.app failed: ${firstLine(err) || `osascript exit ${r.status}`}`);
  }
  return r.stdout;
}

function appleMailAddresses() {
  return osascript(APPLEMAIL_ACCOUNTS, []).split("\n").map((a) => a.trim()).filter(Boolean);
}

function deliverAppleMail(config, message) {
  osascript(APPLEMAIL_SEND, appleMailArgs({ ...message, sender: senderField(config) }));
}

// ---------- classic Outlook (Windows), UNTESTED ----------

// Written against the Outlook object model without a Windows machine to run it on. The data travels
// as JSON in an environment variable, never spliced into the script. The script itself is constant
// and goes in as -EncodedCommand rather than on stdin: "-Command -" reads stdin line by line and
// mishandles multi-line blocks. Exit 3: no Outlook COM class (the new Outlook has none).
const OUTLOOK_PS = `
$ErrorActionPreference = 'Stop'
$d = $env:AUTOPILOT_MAIL_JSON | ConvertFrom-Json
try { $ol = New-Object -ComObject Outlook.Application } catch { exit 3 }
$accounts = @($ol.Session.Accounts)
if ($d.mode -eq 'accounts') { foreach ($a in $accounts) { [Console]::Out.WriteLine($a.SmtpAddress) }; exit 0 }
$acct = $accounts | Where-Object { $_.SmtpAddress -ieq $d.user } | Select-Object -First 1
if (-not $acct) { [Console]::Error.WriteLine('no account for ' + $d.user); exit 4 }
$fs = [string][char]31
$rs = [string][char]30
function Utc($dt) { $dt.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture) }
if ($d.mode -eq 'list') {
  $store = $acct.DeliveryStore
  $boxes = @()
  $junk = 'junk:no'
  if ($d.mailbox -ne 'junk') { $boxes += ,$store.GetDefaultFolder(6) }
  try { $j = $store.GetDefaultFolder(23); $junk = 'junk:yes'; if ($d.mailbox -ne 'inbox') { $boxes += ,$j } } catch {}
  $since = [DateTime]::Parse($d.since, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal).ToLocalTime()
  $filter = "[ReceivedTime] > '" + $since.ToString('g') + "'"
  $out = New-Object System.Collections.Generic.List[string]
  $out.Add($junk)
  foreach ($b in $boxes) {
    foreach ($i in @($b.Items.Restrict($filter))) {
      if ($i.Class -ne 43) { continue }
      $out.Add($i.EntryID + $fs + (Utc $i.ReceivedTime) + $fs + $i.SenderName + ' <' + $i.SenderEmailAddress + '>' + $fs + $i.Subject)
    }
  }
  [Console]::Out.Write([string]::Join($rs, $out))
  exit 0
}
if ($d.mode -eq 'show' -or $d.mode -eq 'reply') {
  try { $m = $ol.Session.GetItemFromID($d.id) } catch { [Console]::Error.WriteLine('no message with id ' + $d.id); exit 5 }
  if ($d.mode -eq 'show') {
    [Console]::Out.Write($m.SenderName + ' <' + $m.SenderEmailAddress + '>' + $fs + $m.To + $fs + $m.CC + $fs + (Utc $m.ReceivedTime) + $fs + $m.Subject + $fs + $m.Body)
    exit 0
  }
  if ($d.all) { $r = $m.ReplyAll() } else { $r = $m.Reply() }
  $r.Body = $d.body
  foreach ($p in $d.attachments) { [void]$r.Attachments.Add([string]$p) }
  [void]$r.GetType().InvokeMember('SendUsingAccount', [Reflection.BindingFlags]::SetProperty, $null, $r, @($acct))
  $to = $r.To
  $r.Send()
  [Console]::Out.Write($to)
  exit 0
}
$m = $ol.CreateItem(0)
$m.To = $d.to
if ($d.cc) { $m.CC = $d.cc }
$m.Subject = $d.subject
$m.Body = $d.body
foreach ($p in $d.attachments) { [void]$m.Attachments.Add([string]$p) }
[void]$m.GetType().InvokeMember('SendUsingAccount', [Reflection.BindingFlags]::SetProperty, $null, $m, @($acct))
$m.Send()
`;

function powershell(payload) {
  const r = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(OUTLOOK_PS, "utf16le").toString("base64")], {
    env: { ...process.env, AUTOPILOT_MAIL_JSON: JSON.stringify(payload) },
    encoding: "utf8",
  });
  if (r.error) fail(`could not run powershell: ${r.error.message}`);
  if (r.status === 3) fail("classic Outlook is not installed (the new Outlook has no scripting interface); use SMTP with an app password");
  if (r.status === 4) fail(`Outlook has no account for ${payload.user}: add it in Outlook under File > Account Settings`);
  if (r.status === 5) fail(`no message with id ${payload.id} in Outlook`);
  if (r.status !== 0) fail(`Outlook failed: ${firstLine((r.stderr || "").trim()) || `powershell exit ${r.status}`}`);
  return r.stdout;
}

function outlookAddresses() {
  return powershell({ mode: "accounts" }).split(/\r?\n/).map((a) => a.trim()).filter(Boolean);
}

function outlookList(config, since, mailbox) {
  const records = powershell({ mode: "list", user: config.user, since: since.toISOString(), mailbox }).split(String.fromCharCode(30)).filter((r) => r.trim());
  const junk = records.length ? records[0].trim() === "junk:yes" : false;
  const messages = records.slice(1).map((record) => {
    const [id, date, from, ...subject] = record.split(String.fromCharCode(31));
    return { id, date: new Date(date), from, subject: subject.join(" ") };
  });
  return { junk, messages };
}

function outlookShow(config, id) {
  const [from, to, cc, date, subject, ...body] = powershell({ mode: "show", user: config.user, id }).split(String.fromCharCode(31));
  return { from, to, cc, date: new Date(date), subject, body: body.join(" ") };
}

function deliverOutlook(config, { to, cc, subject, body, attachments }) {
  powershell({ mode: "send", user: config.user, to: splitAddresses(to).join("; "), cc: splitAddresses(cc).join("; "), subject, body, attachments: attachments.map((a) => a.path) });
}

function firstLine(text) {
  return String(text).split("\n")[0].trim();
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// Last in the file on purpose: main() reaches the script constants above synchronously, so it must
// start after they are initialised. Runs the CLI only when this file is the script node was started with, so test.mjs can import the
// pure helpers above without sending anything.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((e) => fail(e.message));
}
