#!/usr/bin/env node
// Checks the skills for the things that silently break them:
// - every skill has frontmatter with name and description
// - every workspace path a skill mentions has a template or is created by /init
// - every section label used in templates/cv.md exists in templates/labels.json
// - .claude/settings.json (the sweep's pre-approved tools) is valid, names tools one by one, covers the sweep's Playwright tools and matches templates/settings.json
// - every image the README embeds exists and is tracked by git (the CV preview is one)
// - package.json, .claude-plugin/plugin.json and the plugin's marketplace entry carry the same version
// Run with `npm run lint`.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = join(ROOT, ".claude", "skills");

// Workspace files and folders that /init creates, plus .mail.env and .calendar.env, which the person creates from their templates. Keep in sync with .claude/skills/init/SKILL.md.
const WORKSPACE = ["profile.md", "rules.md", "sources.md", ".mail.env", ".calendar.env", "cv/", "cover-letters/", "prep/", "photos/", "documents/", "transcripts/", "recordings/", "reports/"];
const TEMPLATE_FOR = { "profile.md": "profile.md", "rules.md": "rules.md", "sources.md": "sources.md", ".mail.env": "mail.env", ".calendar.env": "calendar.env", "cv/": "cv.md", "cover-letters/": "cover-letter.md", "prep/": "prep.md" };

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
  for (const m of text.matchAll(/`(?:node )?(?:"?\$\{CLAUDE_PLUGIN_ROOT\}\/)?((?:templates|docs|scripts|routines|examples)\/[\w./-]+)"?(?:\s[^`]*)?`/g)) {
    if (!existsSync(join(ROOT, m[1]))) fail(`${name}: references missing file ${m[1]}`);
  }
  // Workspace paths must be ones /init creates.
  for (const m of text.matchAll(/`((?:profile|rules|sources)\.md|\.mail\.env|\.calendar\.env|(?:cv|cover-letters|prep|photos|documents|transcripts|recordings|reports)\/)[\w./<>-]*`/g)) {
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
// tools one by one (no server-wide or all-tools wildcard) and covers every Playwright tool the sweep and its docs name.
checkSettings();
checkVersions();

// Every image the README embeds must exist and be committed. git ls-files says whether it is tracked;
// without a repository (a plugin install, an exported tarball) nothing is tracked, so the check falls
// back to the file existing on disk.
const readme = readFileSync(join(ROOT, "README.md"), "utf8");
const inGit = (() => {
  try { execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { return false; }
})();
for (const m of readme.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
  if (/^https?:/.test(m[1])) continue;
  if (!inGit) {
    if (!existsSync(join(ROOT, m[1]))) fail(`README.md: image ${m[1]} is missing (no git repository here, so only its existence is checked)`);
    continue;
  }
  try { execFileSync("git", ["ls-files", "--error-unmatch", m[1]], { cwd: ROOT, stdio: "ignore" }); }
  catch { fail(`README.md: image ${m[1]} is missing or not tracked by git`); }
}

console.log(failed ? `${failed} problem(s)` : "skills ok");
process.exit(failed ? 1 : 0);

function checkSettings() {
  const committed = join(ROOT, ".claude", "settings.json");
  const template = join(ROOT, "templates", "settings.json");
  for (const file of [committed, template]) if (!existsSync(file)) fail(`${file.slice(ROOT.length + 1)} missing`);
  if (existsSync(committed) && existsSync(template) && readFileSync(committed, "utf8") !== readFileSync(template, "utf8")) {
    fail(".claude/settings.json and templates/settings.json differ");
  }
  if (!existsSync(committed)) return;
  let settings;
  try {
    settings = JSON.parse(readFileSync(committed, "utf8"));
  } catch (e) {
    // Nothing below can be checked on a file that does not parse; one failure says it all.
    fail(`.claude/settings.json is not valid JSON: ${e.message}`);
    return;
  }
  const allow = settings?.permissions?.allow;
  if (!Array.isArray(allow) || allow.length === 0) {
    fail(".claude/settings.json: permissions.allow is missing or empty");
    return;
  }
  for (const rule of allow) {
    if (!isSingleTool(rule)) fail(`.claude/settings.json: "${rule}" is broader than one tool`);
  }
  // Every Playwright tool the sweep or its docs name must be pre-approved.
  const sweepText = ["SKILLS/sweep/SKILL.md", "docs/sweep-events.md", "docs/platform-notes.md"]
    .map((p) => readFileSync(p.startsWith("SKILLS/") ? join(SKILLS, p.slice(7)) : join(ROOT, p), "utf8")).join("\n");
  for (const tool of new Set([...sweepText.matchAll(/\b(browser_[a-z_]+)\b/g)].map((m) => m[1]))) {
    if (!allow.includes(`mcp__playwright__${tool}`)) fail(`.claude/settings.json: the sweep uses ${tool} but mcp__playwright__${tool} is not allowed`);
  }
}

function checkVersions() {
  const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
  const pkg = read("package.json").version;
  const plugin = read(".claude-plugin/plugin.json").version;
  const entry = read(".claude-plugin/marketplace.json").plugins?.find((p) => p.name === "autopilot-jobsearch")?.version;
  if (!pkg) fail("package.json has no version");
  if (plugin !== pkg) fail(`.claude-plugin/plugin.json version ${plugin} differs from package.json ${pkg}`);
  if (entry !== pkg) fail(`.claude-plugin/marketplace.json plugin version ${entry} differs from package.json ${pkg}`);
}

// True when a permission rule approves exactly one tool, narrowed or not. False for a whole MCP server
// (`mcp__jobcubby`, `mcp__claude_ai_gmail__`, whatever the server name contains), any `mcp__` rule with a
// wildcard, a bare tool name with no specifier (`Bash`, `WebFetch`, `Edit`, `Read`, `Write`, `*`) and the
// `X(*)` form, which is the bare name spelled out.
function isSingleTool(rule) {
  if (rule.startsWith("mcp__")) {
    if (rule.includes("*")) return false;
    const rest = rule.slice("mcp__".length);
    const sep = rest.indexOf("__");
    return sep > 0 && sep + 2 < rest.length;
  }
  return !/^(?:\*|\w+)(?:\(\*\))?$/.test(rule);
}

function fail(msg) {
  failed++;
  console.log(`FAIL ${msg}`);
}
