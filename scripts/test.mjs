#!/usr/bin/env node
// Smoke test for the renderer: renders every example, checks page counts and that the
// text made it into the PDF with the template's font embedded. Run with `npm test`. Needs
// poppler (pdftotext, pdffonts) for the text and font checks; without it only page counts
// and file sizes are checked.

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, statSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, chmodSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

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

// The mail script must refuse before it touches the network: no .mail.env, one other users can read, one still
// holding the template values, and a body with an em-dash or a double hyphen. Each case runs in an empty temp
// folder (the script reads .mail.env from the current folder) and must exit 1 with the expected reason.
const mail = join(ROOT, "scripts", "mail.mjs");
const mailDir = mkdtempSync(join(tmpdir(), "autopilot-mail-"));
try {
  mailRefuses("check without .mail.env", ["check"], /no \.mail\.env/);
  mailRefuses("send refuses an em-dash", ["send", "--to", "a@b.c", "--subject", "x", "--body", `x ${String.fromCharCode(0x2014)} y`], /em-dash/);
  mailRefuses("send refuses a double hyphen", ["send", "--to", "a@b.c", "--subject", "x", "--body", "x -- y"], /double hyphen/);
  mailRefuses("send refuses a missing attachment", ["send", "--to", "a@b.c", "--subject", "x", "--body", "x", "--attach", "missing.pdf"], /attachment not found/);
  writeFileSync(join(mailDir, ".mail.env"), readFileSync(join(ROOT, "templates", "mail.env")), { mode: 0o644 });
  mailRefuses("check refuses a .mail.env others can read", ["check"], /chmod 600/);
  chmodSync(join(mailDir, ".mail.env"), 0o600);
  mailRefuses("check refuses the unfilled template", ["check"], /template value/);
} finally {
  rmSync(mailDir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);

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
