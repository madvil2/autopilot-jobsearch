#!/usr/bin/env node
// Sends a plain-text mail with files attached from disk, so the sweep can apply to postings that
// accept applications only by email with the CV PDF attached. The claude.ai mail connector takes an
// attachment only as base64 inside the tool call, which costs tens of thousands of output tokens per
// CV and fails often; this script reads the file itself and talks SMTP.
//
//   node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...
//   node scripts/mail.mjs test      mails the account itself, nothing attached (/init runs it to verify the setup)
//   node scripts/mail.mjs check     says whether .mail.env is there and which address sends; exit 1 when it is not
//
// Config: .mail.env in the workspace, the folder the command runs in (template: templates/mail.env),
// KEY=VALUE lines: MAIL_USER (the Gmail address), MAIL_APP_PASSWORD (a 16-character app password,
// never the account password), optional MAIL_FROM_NAME (display name), optional MAIL_HOST and
// MAIL_PORT for another provider (defaults smtp.gmail.com and 465, TLS). The file must be readable
// by its owner only (chmod 600); the password is never printed. The body may not contain an em-dash
// or a double hyphen, because rules.md forbids them in anything sent in the person's name.

import { readFileSync, existsSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import nodemailer from "nodemailer";

const CONFIG = resolve(process.cwd(), ".mail.env");
const USAGE = [
  "usage: node scripts/mail.mjs send --to <addr> [--cc <addr>] --subject <text> (--body <text> | --body-file <path>) [--attach <path>]...",
  "       node scripts/mail.mjs test     send a test mail to the configured account itself",
  "       node scripts/mail.mjs check    print whether .mail.env exists and the sender address",
  "config: .mail.env in the current folder (copy templates/mail.env, fill it in, chmod 600 .mail.env)",
].join("\n");

main().catch((e) => fail(e.message));

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
  console.log(`.mail.env found, sends as ${config.user}`);
}

async function test() {
  const config = loadConfig();
  const info = await deliver(config, {
    to: config.user,
    subject: "autopilot-jobsearch mail test",
    body: "This is a test mail from autopilot-jobsearch. If it arrived, the sweep can send email applications from this account.\n",
    attachments: [],
  });
  report(info);
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
  const info = await deliver(config, { to: args.to, cc: args.cc, subject: args.subject, body, attachments });
  report(info);
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

// Reads .mail.env from the current folder. Refuses a file other users can read: the app password
// gives full access to the mailbox.
function loadConfig() {
  if (!existsSync(CONFIG)) fail(`no .mail.env in ${process.cwd()}: copy templates/mail.env there, fill in the address and an app password, then chmod 600 .mail.env (see /init)`);
  if (statSync(CONFIG).mode & 0o077) fail(".mail.env is readable by other users; run: chmod 600 .mail.env");
  const env = {};
  for (const raw of readFileSync(CONFIG, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) fail(`.mail.env: cannot read line "${line.length > 40 ? line.slice(0, 40) + "..." : line}" (expected KEY=VALUE)`);
    env[line.slice(0, eq).trim()] = unquote(line.slice(eq + 1).trim());
  }
  const user = env.MAIL_USER || "";
  // Google shows the app password in four groups; the spaces are not part of it.
  const pass = (env.MAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user || !user.includes("@") || user === "you@gmail.com") fail(".mail.env: MAIL_USER is missing or still the template value");
  if (!pass || /^x+$/i.test(pass)) fail(".mail.env: MAIL_APP_PASSWORD is missing or still the template value");
  const port = Number(env.MAIL_PORT || 465);
  if (!Number.isInteger(port) || port <= 0) fail(`.mail.env: MAIL_PORT "${env.MAIL_PORT}" is not a port number`);
  return { user, pass, fromName: env.MAIL_FROM_NAME || "", host: env.MAIL_HOST || "smtp.gmail.com", port };
}

function unquote(value) {
  return /^(["']).*\1$/.test(value) ? value.slice(1, -1) : value;
}

// ---------- SMTP ----------

async function deliver(config, { to, cc, subject, body, attachments }) {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  });
  try {
    return await transport.sendMail({
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
}

function report(info) {
  const accepted = (info.accepted || []).map((a) => (typeof a === "string" ? a : a.address));
  console.log(`sent ${info.messageId} to ${accepted.join(", ") || "nobody"}`);
  if (info.rejected && info.rejected.length) fail(`rejected by the server: ${info.rejected.join(", ")}`);
}

function firstLine(text) {
  return String(text).split("\n")[0].trim();
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
