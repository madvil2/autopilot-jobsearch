#!/usr/bin/env node
// Checks the skills for the things that silently break them:
// - every skill has frontmatter with name and description
// - every workspace path a skill mentions has a template or is created by /init
// - every section label used in templates/cv.md exists in templates/labels.json
// - .claude/settings.json (the sweep's pre-approved tools) is valid, names tools one by one, covers the sweep's Playwright tools and matches templates/settings.json
// Run with `npm run lint`.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, ".claude", "skills");

// Workspace files and folders that /init creates. Keep in sync with .claude/skills/init/SKILL.md.
const WORKSPACE = ["profile.md", "rules.md", "sources.md", "cv/", "cover-letters/", "prep/", "photos/", "documents/", "transcripts/", "recordings/", "reports/"];
const TEMPLATE_FOR = { "profile.md": "profile.md", "rules.md": "rules.md", "sources.md": "sources.md", "cv/": "cv.md", "cover-letters/": "cover-letter.md", "prep/": "prep.md" };

let failed = 0;

for (const name of readdirSync(SKILLS)) {
  const file = join(SKILLS, name, "SKILL.md");
  if (!existsSync(file)) {
    fail(`${name}: missing SKILL.md`);
    continue;
  }
  const text = readFileSync(file, "utf8");
  const fm = text.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    fail(`${name}: no frontmatter`);
    continue;
  }
  if (!/^name:\s*\S/m.test(fm[1])) fail(`${name}: frontmatter has no name`);
  if (!/^description:\s*\S/m.test(fm[1])) fail(`${name}: frontmatter has no description`);
  const fmName = (fm[1].match(/^name:\s*(\S+)/m) || [])[1];
  if (fmName && fmName !== name) fail(`${name}: frontmatter name "${fmName}" differs from folder name`);

  // Paths like `templates/foo.md`, `docs/foo.md`, `scripts/foo.mjs`, `routines/foo.md` must exist.
  for (const m of text.matchAll(/`(?:node )?(?:"?\$\{CLAUDE_PLUGIN_ROOT\}\/)?((?:templates|docs|scripts|routines|examples)\/[\w./-]+)(?:"|\s[^`]*)?`/g)) {
    if (!existsSync(join(ROOT, m[1]))) fail(`${name}: references missing file ${m[1]}`);
  }
  // Workspace paths must be ones /init creates.
  for (const m of text.matchAll(/`((?:profile|rules|sources)\.md|(?:cv|cover-letters|prep|photos|documents|transcripts|recordings|reports)\/)[\w./<>-]*`/g)) {
    if (!WORKSPACE.includes(m[1])) fail(`${name}: workspace path ${m[0]} is not created by /init`);
  }
}

for (const [ws, tpl] of Object.entries(TEMPLATE_FOR)) {
  if (!existsSync(join(ROOT, "templates", tpl))) fail(`templates/${tpl} missing (needed for ${ws})`);
}

const labels = JSON.parse(readFileSync(join(ROOT, "templates", "labels.json"), "utf8"));
const cvTemplate = readFileSync(join(ROOT, "templates", "cv.md"), "utf8");
for (const m of cvTemplate.matchAll(/^##\s+(.+)$/gm)) {
  const key = m[1].trim().toLowerCase();
  for (const lang of Object.keys(labels)) {
    if (!labels[lang][key]) fail(`templates/labels.json: "${key}" has no ${lang} label`);
  }
}

// The sweep's pre-approved tool list (issue 8): .claude/settings.json is the clone's copy, templates/settings.json
// the one /init writes into a workspace. They must be the same file, valid JSON, with an allow list that names
// tools one by one (no server-wide or all-tools wildcard) and covers every Playwright tool the sweep's Budget names.
{
  const committed = join(ROOT, ".claude", "settings.json");
  const template = join(ROOT, "templates", "settings.json");
  for (const file of [committed, template]) if (!existsSync(file)) fail(`${file.slice(ROOT.length + 1)} missing`);
  if (existsSync(committed) && existsSync(template) && readFileSync(committed, "utf8") !== readFileSync(template, "utf8")) {
    fail(".claude/settings.json and templates/settings.json differ");
  }
  if (existsSync(committed)) {
    let settings;
    try {
      settings = JSON.parse(readFileSync(committed, "utf8"));
    } catch (e) {
      fail(`.claude/settings.json is not valid JSON: ${e.message}`);
    }
    const allow = settings?.permissions?.allow;
    if (!Array.isArray(allow) || allow.length === 0) fail(".claude/settings.json: permissions.allow is missing or empty");
    for (const rule of allow || []) {
      if (/^mcp__[^_]+(__)?$/.test(rule) || (rule.startsWith("mcp__") && rule.includes("*")) || /^(Bash|WebFetch|\*)(\(\*\))?$/.test(rule)) {
        fail(`.claude/settings.json: "${rule}" is broader than one tool`);
      }
    }
    const sweep = readFileSync(join(SKILLS, "sweep", "SKILL.md"), "utf8");
    const budget = (sweep.match(/^- Tools: (.+)$/m) || [])[1] || "";
    for (const m of budget.matchAll(/`(browser_\w+)`/g)) {
      if (!(allow || []).includes(`mcp__playwright__${m[1]}`)) fail(`.claude/settings.json: sweep Budget names ${m[1]} but mcp__playwright__${m[1]} is not allowed`);
    }
  }
}

console.log(failed ? `${failed} problem(s)` : "skills ok");
process.exit(failed ? 1 : 0);

function fail(msg) {
  failed++;
  console.log(`FAIL ${msg}`);
}
