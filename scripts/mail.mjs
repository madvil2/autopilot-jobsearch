#!/usr/bin/env node
// Sends a plain-text mail with files attached from disk, so the sweep can apply to postings that
// accept applications only by email with the CV PDF attached. The claude.ai mail connector takes an
// attachment only as base64 inside the tool call, which costs tens of thousands of output tokens per
// CV and fails often; this script reads the file itself and hands it to a mail transport.
//
//   node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...
//   node scripts/mail.mjs test      mails the account itself, nothing attached (/init runs it to verify the setup)
//   node scripts/mail.mjs check     says which transport and address would send; exit 1 when that cannot work
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
// never leaves from the wrong one), optional MAIL_FROM_NAME (display name), optional MAIL_TRANSPORT
// (smtp, applemail or outlook). For SMTP also MAIL_APP_PASSWORD (an app password, never the account
// password) and optional MAIL_HOST and MAIL_PORT (defaults smtp.gmail.com and 465, TLS). A file
// holding a password must be readable by its owner only (chmod 600); the password is never printed.
// The subject and body may not contain an em-dash or a double hyphen, because rules.md forbids them in
// anything sent in the person's name. Every refusal about the message runs before any transport.

import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";

export const TRANSPORTS = ["smtp", "applemail", "outlook"];
const LABEL = { smtp: "SMTP", applemail: "Mail.app", outlook: "Outlook" };
const CONFIG = resolve(process.cwd(), ".mail.env");
const USAGE = [
  "usage: node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...",
  "       node scripts/mail.mjs test     send a test mail to the configured account itself",
  "       node scripts/mail.mjs check    print the transport and the sender address, and whether that account is there",
  "config: .mail.env in the current folder (copy templates/mail.env and fill in MAIL_USER; see /init)",
].join("\n");

// Runs the CLI only when this file is the script node was started with, so test.mjs can import the
// pure helpers below without sending anything.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((e) => fail(e.message));
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "--help" || command === "-h") {
    console.log(USAGE);
    process.exit(command ? 0 : 1);
  }
  if (command === "check") return check();
  if (command === "test") return test();
  if (command === "send") return send(parseArgs(rest));
  fail(`unknown command "${command}"\n${USAGE}`);
}

function check() {
  const config = loadConfig();
  if (config.transport === "smtp") {
    console.log(`.mail.env found, sends as ${config.user} via SMTP (${config.host}:${config.port})`);
    return;
  }
  requireAccount(config);
  const note = config.transport === "outlook" ? " (the Outlook transport is untested)" : "";
  console.log(`sends as ${config.user} via ${LABEL[config.transport]}, account found${note}`);
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
  if (args.body === undefined && !args.bodyFile) fail("one of --body or --body-file is required");
  if (args.body !== undefined && args.bodyFile) fail("give --body or --body-file, not both");
  let body = args.body;
  if (args.bodyFile) {
    const file = resolve(args.bodyFile);
    if (!existsSync(file)) fail(`body file not found: ${file}`);
    body = readFileSync(file, "utf8");
  }
  if (!body.trim()) fail("the body is empty");
  for (const [what, text] of [["subject", args.subject], ["body", body]]) {
    if (text.includes(String.fromCharCode(0x2014))) fail(`the ${what} contains an em-dash; rules.md forbids them in anything sent in the person's name. Rewrite it with a comma, a colon or a full stop.`);
    if (text.includes("--")) fail(`the ${what} contains a double hyphen; rules.md forbids them in anything sent in the person's name. Rewrite it with a comma, a colon or a full stop.`);
  }
  const attachments = args.attach.map((p) => {
    const file = resolve(p);
    if (!existsSync(file)) fail(`attachment not found: ${file}`);
    return { filename: basename(file), path: file };
  });
  const config = loadConfig();
  await deliver(config, { to: args.to, cc: args.cc, subject: args.subject, body, attachments });
}

// ---------- CLI ----------

function parseArgs(argv) {
  const args = { attach: [] };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    const need = () => {
      if (value === undefined) fail(`${flag} needs a value`);
      i++;
      return value;
    };
    switch (flag) {
      case "--to": args.to = need(); break;
      case "--cc": args.cc = need(); break;
      case "--subject": args.subject = need(); break;
      case "--body": args.body = need(); break;
      case "--body-file": args.bodyFile = need(); break;
      case "--attach": args.attach.push(need()); break;
      default: fail(`unknown option "${flag}"\n${USAGE}`);
    }
  }
  return args;
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
  try {
    transport = pickTransport(env, process.platform);
  } catch (e) {
    fail(e.message);
  }
  const config = { transport, user, fromName: env.MAIL_FROM_NAME || "" };
  if (transport !== "smtp") return config;
  // Google shows the app password in four groups; the spaces are not part of it.
  if (!hasPassword(env)) fail(".mail.env: MAIL_APP_PASSWORD is missing or still the template value (MAIL_TRANSPORT=smtp needs one)");
  const port = Number(env.MAIL_PORT || 465);
  if (!Number.isInteger(port) || port <= 0) fail(`.mail.env: MAIL_PORT "${env.MAIL_PORT}" is not a port number`);
  return { ...config, pass: env.MAIL_APP_PASSWORD.replace(/\s+/g, ""), host: env.MAIL_HOST || "smtp.gmail.com", port };
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
  tell application "Mail"
    repeat with acc in every account
      repeat with addr in (email addresses of acc)
        set end of out to (addr as text)
      end repeat
    end repeat
  end tell
  set AppleScript's text item delimiters to linefeed
  return out as text
end run
`;

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
  if (r.status !== 0) fail(`Outlook failed: ${firstLine((r.stderr || "").trim()) || `powershell exit ${r.status}`}`);
  return r.stdout;
}

function outlookAddresses() {
  return powershell({ mode: "accounts" }).split(/\r?\n/).map((a) => a.trim()).filter(Boolean);
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
