#!/usr/bin/env node
// Smoke test for the renderer: renders every example, checks page counts and that the
// text made it into the PDF with the template's font embedded. Run with `npm test`. Needs
// poppler (pdftotext, pdffonts) for the text and font checks; without it only page counts
// and file sizes are checked.

import { execFileSync } from "node:child_process";
import { existsSync, statSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
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
  const text = pdfText(output);
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
  const fonts = pdfFonts(output);
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

process.exit(failed ? 1 : 0);

function pdfText(path) {
  try {
    return execFileSync("pdftotext", ["-layout", path, "-"], { encoding: "utf8" });
  } catch {
    return null;
  }
}

// Names of the fonts embedded in the PDF, as pdffonts lists them (`AAAAAA+Roboto-Regular`).
function pdfFonts(path) {
  try {
    const out = execFileSync("pdffonts", [path], { encoding: "utf8" });
    return out
      .split("\n")
      .slice(2)
      .filter((line) => line.trim())
      .map((line) => line.split(/\s+/)[0]);
  } catch {
    return null;
  }
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
