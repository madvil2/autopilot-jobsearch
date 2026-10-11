#!/usr/bin/env node
// Renders a CV or cover letter from markdown to PDF (and a PNG preview).
//
//   node scripts/render.mjs cv/base.md                 -> cv/<Name>_CV.pdf + preview PNGs
//   node scripts/render.mjs cover-letters/acme.md      -> cover-letters/acme.pdf
//   node scripts/render.mjs cv/base.md --out out.pdf --no-preview
//
// The markdown contract is described in templates/cv.md and templates/cover-letter.md.
// Design lives in templates/cv.html and templates/cover-letter.html. This script only
// parses the markdown and fills the template.

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve, extname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATES = join(ROOT, "templates");
// Set in main(): the folder the input file's parent sits in, which is the workspace for cv/x.md.
let INPUT_DIR = process.cwd();
const FONTS = join(ROOT, "fonts");

// ---------- CLI ----------

async function main() {

  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help")) {
    console.log("usage: node scripts/render.mjs <file.md> [--out <file.pdf>] [--no-preview] [--html]");
    process.exit(args.length === 0 ? 1 : 0);
  }
  const input = resolve(args[0]);
  INPUT_DIR = dirname(input);
  const outArg = args.includes("--out") ? resolve(args[args.indexOf("--out") + 1]) : null;
  const wantPreview = !args.includes("--no-preview");
  const dumpHtml = args.includes("--html");

  if (!existsSync(input)) fail(`file not found: ${input}`);

  const source = readFileSync(input, "utf8");
  const { meta, body } = splitFrontmatter(source);
  const type = meta.type || guessType(input, body);
  const labels = loadLabels(meta.language || "en");

  let html, outPdf;
  if (type === "cv") {
    const cv = parseCv(body, labels);
    html = fillTemplate("cv.html", cvView(cv, meta, labels));
    outPdf = outArg || join(dirname(input), cvFileName(cv.name, meta, labels));
  } else if (type === "cover-letter") {
    const letter = parseLetter(body);
    html = fillTemplate("cover-letter.html", letterView(letter, meta));
    outPdf = outArg || join(dirname(input), basename(input, extname(input)) + ".pdf");
  } else {
    fail(`unknown type "${type}". Set "type: cv" or "type: cover-letter" in the frontmatter.`);
  }

  if (dumpHtml) writeFileSync(outPdf.replace(/\.pdf$/, ".html"), html);

  await renderPdf(html, outPdf);
  console.log(`PDF  ${outPdf}  (${countPages(outPdf)} page(s))`);
  if (wantPreview) {
    for (const png of preview(outPdf)) console.log(`PNG  ${png}`);
  }
}

// ---------- Frontmatter ----------

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  let currentKey = null;
  for (const raw of m[1].split(/\r?\n/)) {
    if (/^\s+/.test(raw) && currentKey) {
      meta[currentKey] = (meta[currentKey] ? meta[currentKey] + "\n" : "") + raw.trim();
      continue;
    }
    const kv = raw.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valueRaw] = kv;
    let value = valueRaw.replace(/\s+#.*$/, "").trim();
    if (value === "|" || value === ">") {
      currentKey = key;
      meta[key] = "";
      continue;
    }
    currentKey = null;
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else value = value.replace(/^["'](.*)["']$/, "$1");
    meta[key] = value;
  }
  return { meta, body: text.slice(m[0].length) };
}

function guessType(path, body) {
  if (/[\\/]cover-letters?[\\/]/.test(path)) return "cover-letter";
  if (/[\\/]cv[\\/]/.test(path)) return "cv";
  return /^##\s/m.test(body) ? "cv" : "cover-letter";
}

function loadLabels(language) {
  const all = JSON.parse(readFileSync(join(TEMPLATES, "labels.json"), "utf8"));
  if (!all[language]) fail(`no labels for language "${language}" in templates/labels.json (have: ${Object.keys(all).join(", ")})`);
  return { ...all.en, ...all[language] };
}

// ---------- CV parsing ----------

const CANONICAL_SECTIONS = [
  "summary",
  "technical skills",
  "work experience",
  "education",
  "achievements",
  "certifications",
  "language skills",
  "hobbies",
];
const ENTRY_SECTIONS = new Set(["work experience", "education"]);

function parseCv(body, labels) {
  const lines = body.split(/\r?\n/);
  const cv = { name: "", header: [], sections: [] };
  let section = null;
  let entry = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^#\s+/.test(trimmed)) {
      if (cv.name) fail(`line ${i + 1}: a CV has exactly one "# Name" heading`);
      cv.name = trimmed.replace(/^#\s+/, "");
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      const title = trimmed.replace(/^##\s+/, "").trim();
      const key = title.toLowerCase();
      if (!CANONICAL_SECTIONS.includes(key)) {
        fail(`line ${i + 1}: unknown section "## ${title}". Allowed: ${CANONICAL_SECTIONS.map(titleCase).join(", ")}`);
      }
      section = { key, label: labels[key] || title, entries: [], lines: [] };
      cv.sections.push(section);
      entry = null;
      continue;
    }
    if (/^###\s+/.test(trimmed)) {
      if (!section || !ENTRY_SECTIONS.has(section.key)) {
        fail(`line ${i + 1}: "### ..." entries are only allowed under Work Experience and Education`);
      }
      const head = trimmed.replace(/^###\s+/, "");
      const [dates, ...rest] = head.split("|");
      if (rest.length === 0) fail(`line ${i + 1}: entry heading must be "### <dates> | <role or degree>"`);
      entry = { dates: dates.trim(), role: rest.join("|").trim(), org: "", project: "", bullets: [], tech: "", extra: [] };
      section.entries.push(entry);
      continue;
    }
    if (!trimmed) continue;
    if (!section) {
      if (!cv.name) fail(`line ${i + 1}: the CV must start with "# Name"`);
      cv.header.push(trimmed);
      continue;
    }
    if (entry) {
      if (/^-\s+/.test(trimmed)) entry.bullets.push(trimmed.replace(/^-\s+/, ""));
      else if (/^project:/i.test(trimmed)) entry.project = trimmed.replace(/^project:\s*/i, "");
      else if (/^technologies used:/i.test(trimmed)) entry.tech = trimmed.replace(/^technologies used:\s*/i, "");
      else if (!entry.org) entry.org = trimmed;
      else entry.extra.push(trimmed);
      continue;
    }
    section.lines.push(trimmed);
  }
  if (!cv.name) fail('the CV must start with "# Name"');
  cv.sections = cv.sections.filter((s) => s.entries.length || s.lines.length);
  return cv;
}

function cvView(cv, meta, labels) {
  const showPhoto = meta.photo && meta.photo !== "none";
  const photo = showPhoto ? dataUri(assetPath(meta.photo)) : "";
  const header = cv.header
    .filter((l) => meta.show_birth_date !== false || !/\b(born|geboren|geb\.)\b/i.test(l))
    .map((l) => `<p class="header-line">${inline(l)}</p>`)
    .join("\n");

  const signature = meta.sign_place
    ? `<div class="signature"><p>${escapeHtml(meta.sign_place)}, ${todayFor(meta.language || "en")}</p>${meta.signature ? `<img class="signature-img" src="${dataUri(assetPath(meta.signature))}" alt="">` : ""}<p class="signature-name">${escapeHtml(cv.name)}</p></div>`
    : "";
  const sections = cv.sections
    .map((s) => {
      const bodyHtml = s.entries.length
        ? s.entries.map(entryHtml).join("\n")
        : s.lines.map((l) => `<p class="text">${inline(l)}</p>`).join("\n");
      return `<section class="section section-${s.key.replace(/\s+/g, "-")}">
  <h2>${escapeHtml(s.label)}</h2>
  ${bodyHtml}
</section>`;
    })
    .join("\n");

  return {
    lang: meta.language || "en",
    name: escapeHtml(cv.name),
    title: inline(meta.title || ""),
    photo,
    // Where the face is in the source: a tall portrait keeps it in the upper part, so the square crop
    // defaults to "50% 20%". Override with `photo_focus: 50% 35%` in the frontmatter.
    photoFocus: meta.photo_focus || "50% 20%",
    // Zoom into the face: 1 shows the square crop as is, 1.5 enlarges it around the focus point.
    photoZoom: meta.photo_zoom || 1,
    photoClass: showPhoto ? "" : "no-photo",
    header,
    sections: sections + signature,
    fontsDir: fileUrl(FONTS),
    pageLabel: escapeHtml(labels["page"] || "Page"),
    ofLabel: escapeHtml(labels["of"] || "of"),
  };

  function entryHtml(e) {
    const parts = [];
    if (e.org) parts.push(`<p class="org">${inline(e.org)}</p>`);
    if (e.project) parts.push(`<p class="project"><strong>${escapeHtml(labels["project"] || "Project")}:</strong> ${inline(e.project)}</p>`);
    for (const x of e.extra) parts.push(`<p class="text">${inline(x)}</p>`);
    if (e.bullets.length) parts.push(`<ul>${e.bullets.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`);
    if (e.tech) parts.push(`<p class="tech"><strong>${escapeHtml(labels["technologies used"] || "Technologies used")}:</strong> ${inline(e.tech)}</p>`);
    return `<div class="entry">
    <div class="dates">${inline(e.dates)}</div>
    <div class="entry-body">
      <p class="role">${inline(e.role)}</p>
      ${parts.join("\n      ")}
    </div>
  </div>`;
  }
}

function cvFileName(name, meta, labels) {
  const safe = name.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "");
  const suffix = meta.version && meta.version !== "base" ? `_${meta.version}` : "";
  return `${safe}_${labels["cv file suffix"] || "CV"}${suffix}.pdf`;
}

// ---------- Cover letter parsing ----------

function parseLetter(body) {
  const paragraphs = [];
  let current = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      if (current.length) paragraphs.push(current.join(" "));
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current.join(" "));
  if (!paragraphs.length) fail("the cover letter body is empty");
  return { paragraphs };
}

function letterView(letter, meta) {
  const required = ["name", "contact", "company", "subject", "greeting", "signoff"];
  for (const k of required) if (!meta[k]) fail(`cover letter frontmatter is missing "${k}"`);
  const address = (meta.address || "").split("\n").filter(Boolean).map((l) => `<p>${inline(l)}</p>`).join("");
  const dateLine = [meta.place, meta.date].filter(Boolean).join(", ");
  return {
    lang: meta.language || "en",
    name: escapeHtml(meta.name),
    contact: inline(meta.contact),
    company: inline(meta.company),
    address,
    dateLine: escapeHtml(dateLine),
    subject: inline(meta.subject),
    greeting: inline(meta.greeting),
    paragraphs: letter.paragraphs.map((p) => `<p>${inline(p)}</p>`).join("\n"),
    signoff: inline(meta.signoff),
    fontsDir: fileUrl(FONTS),
  };
}

// ---------- Templates and inline markdown ----------

function fillTemplate(file, view) {
  const tpl = readFileSync(join(TEMPLATES, file), "utf8");
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in view ? String(view[key]) : ""));
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, href) => `<a href="${href}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,;:]|$)/g, "$1<em>$2</em>");
  s = s.replace(/\s\|\s/g, ' <span class="sep">|</span> ');
  return s;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function todayFor(language) {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return language === "de" ? `${dd}.${mm}.${d.getFullYear()}` : `${dd}/${mm}/${d.getFullYear()}`;
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// A photo or signature path in the frontmatter is relative to the workspace (`photos/x.jpeg`). Try the
// current folder, then the input file's parent folder, then the method root (for the examples).
function assetPath(p) {
  for (const base of [process.cwd(), resolve(INPUT_DIR, ".."), ROOT]) {
    const f = resolve(base, p);
    if (existsSync(f)) return f;
  }
  return resolve(process.cwd(), p);
}

function dataUri(path) {
  if (!existsSync(path)) fail(`photo not found: ${path}`);
  const ext = extname(path).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

function fileUrl(path) {
  return "file://" + path.replace(/\\/g, "/");
}

// ---------- PDF ----------

async function launchChromium() {
  try {
    return await chromium.launch();
  } catch (e) {
    if (!/Executable doesn't exist|browserType.launch/.test(String(e))) throw e;
    // Installed as a plugin, the playwright package arrives without its postinstall step, so the
    // browser is missing on first use. Fetch it once (about 150 MB) and retry.
    console.error("Chromium for Playwright is not installed yet, downloading it once...");
    const { execFileSync } = await import("node:child_process");
    execFileSync(process.execPath, [join(ROOT, "node_modules", "playwright", "cli.js"), "install", "chromium"], { stdio: "inherit" });
    return await chromium.launch();
  }
}

async function renderPdf(html, out) {
  mkdirSync(dirname(out), { recursive: true });
  // The page is loaded from a file on disk, not with setContent(): a page set from a string has
  // the origin about:blank, from which Chromium refuses the file:// fonts in the template, and
  // the PDF silently gets the system font instead (a different one on every OS).
  const tmp = mkdtempSync(join(tmpdir(), "autopilot-render-"));
  const browser = await launchChromium();
  try {
    const htmlFile = join(tmp, "index.html");
    writeFileSync(htmlFile, html);
    const page = await browser.newPage();
    await page.goto(fileUrl(htmlFile), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Photos come in at camera size; the PDF only needs ~600px. Downscale in the page so the
    // file stays small enough to mail and to upload to trackers (a 2000px JPEG alone is 150 KB).
    await page.evaluate(async () => {
      for (const img of document.querySelectorAll("img.photo, img.signature-img")) {
        await img.decode().catch(() => {});
        const max = img.classList.contains("photo") ? 600 : 800;
        if (img.naturalWidth <= max && img.naturalHeight <= max) continue;
        const k = max / Math.max(img.naturalWidth, img.naturalHeight);
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * k);
        c.height = Math.round(img.naturalHeight * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        img.src = c.toDataURL("image/jpeg", 0.86);
        await img.decode().catch(() => {});
      }
    });
    await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

function countPages(pdfPath) {
  try {
    const info = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
    const m = info.match(/Pages:\s+(\d+)/);
    if (m) return Number(m[1]);
  } catch {}
  const raw = readFileSync(pdfPath, "latin1");
  const m = raw.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
  return m ? Number(m[1]) : (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
}

function preview(pdfPath) {
  const prefix = pdfPath.replace(/\.pdf$/, "");
  try {
    execFileSync("pdftoppm", ["-r", "72", "-png", pdfPath, prefix]);
    const pages = countPages(pdfPath);
    const files = [];
    for (let i = 1; i <= pages; i++) {
      const candidates = [`${prefix}-${i}.png`, `${prefix}-${String(i).padStart(2, "0")}.png`];
      const f = candidates.find(existsSync);
      if (f) files.push(f);
    }
    return files;
  } catch {
    console.log("PNG  skipped (install poppler for previews: brew install poppler)");
    return [];
  }
}

function fail(msg) {
  console.error(`render: ${msg}`);
  process.exit(1);
}

await main();
