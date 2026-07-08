#!/usr/bin/env node
/**
 * swanifly-claude-addon — installer
 *
 * Materializes the Claude Code integration into an app:
 *   - AGENTS.md, SOUL.md, CLAUDE.md   -> app root        (CREATE-IF-MISSING — never clobbers app-owned identity)
 *   - "Design port directive" block   -> app CLAUDE.md    (MERGE — content-guarded: adds the block or refreshes it when the canonical snippet changes)
 *   - .claude/commands/<all>           -> app/.claude      (OVERWRITE — canonical rituals, incl. /port)
 *   - .claude/skills/<all>            -> app/.claude      (OVERWRITE — canonical tooling)
 *   - docs/project/design/PORT-MAP-TEMPLATE.md -> app docs (OVERWRITE — reference template for the /port loop)
 *   - .claude/hooks/no-mock-guard.ps1 -> app/.claude      (OVERWRITE)
 *   - .claude/settings.json           -> app/.claude      (MERGE the no-mock PostToolUse hook, idempotent)
 *
 * Usage (standalone):   node install.mjs <appRoot> [--dry-run]
 * Programmatic:         import { installClaudeAddon } from './install.mjs'
 *
 * Called automatically per app by scripts/sync-method-to-all-apps.mjs.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

/** Read a JSON file, tolerating a UTF-8 BOM. Returns undefined if it can't be parsed. */
function readJsonSafe(file) {
  try {
    let raw = readFileSync(file, "utf8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1); // strip BOM (common on Windows-authored files)
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * @param {{appRoot:string, addonDir?:string, dryRun?:boolean}} opts
 * @returns {{created:string[], kept:string[], updated:string[], merged:boolean, settingsSkipped:boolean, directive:string}}
 */
export function installClaudeAddon({ appRoot, addonDir = HERE, dryRun = false } = {}) {
  const payload = join(addonDir, "payload");
  if (!existsSync(payload)) throw new Error(`payload not found at ${payload}`);
  const res = { created: [], kept: [], updated: [], merged: false, settingsSkipped: false, directive: "skipped" };

  // 1) Identity files — create-if-missing (preserve any app-authored version)
  for (const f of ["AGENTS.md", "SOUL.md", "CLAUDE.md"]) {
    const src = join(payload, f);
    const dest = join(appRoot, f);
    if (!existsSync(src)) continue;
    if (existsSync(dest)) { res.kept.push(f); continue; }
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
    res.created.push(f);
  }

  // 1b) Design port directive — MERGE the standing block into the app's CLAUDE.md.
  // CLAUDE.md is create-if-missing above, so an app that already had its own CLAUDE.md
  // would never receive the block via the copy. Inject or refresh it idempotently
  // (content-guarded: the section is replaced when the canonical snippet changes),
  // so the "every session inherits the CURRENT design-port rule" guarantee actually holds.
  const directiveSnippet = join(payload, "snippets", "design-port-directive.md");
  const appClaude = join(appRoot, "CLAUDE.md");
  if (existsSync(directiveSnippet) && existsSync(appClaude)) {
    const current = readFileSync(appClaude, "utf8");
    const block = readFileSync(directiveSnippet, "utf8").trimEnd();
    const start = current.indexOf("## Design port directive");
    if (start === -1) {
      if (!dryRun) {
        writeFileSync(appClaude, current.replace(/\s*$/, "") + "\n\n" + block + "\n", "utf8");
      }
      res.directive = "added";
    } else {
      const nextHeading = current.indexOf("\n## ", start + 1);
      const end = nextHeading === -1 ? current.length : nextHeading;
      if (current.slice(start, end).trimEnd() === block) {
        res.directive = "present";
      } else {
        if (!dryRun) {
          const updated = current.slice(0, start) + block + "\n" +
            (nextHeading === -1 ? "" : current.slice(end));
          writeFileSync(appClaude, updated, "utf8");
        }
        res.directive = "updated";
      }
    }
  }

  // 2) Commands — overwrite (canonical rituals, like METHOD files)
  const commandsSrc = join(payload, "commands");
  if (existsSync(commandsSrc)) {
    for (const e of readdirSync(commandsSrc, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      const dest = join(appRoot, ".claude", "commands", e.name);
      if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(commandsSrc, e.name), dest); }
      res.updated.push(`.claude/commands/${e.name}`);
    }
  }

  // 3) Skills — overwrite (canonical tooling, like METHOD files)
  // Some repos keep `.claude/skills` as a symlink (materialized as a plain file on
  // Windows checkouts) — skip those instead of erroring; the target dir is theirs to manage.
  const skillsSrc = join(payload, "skills");
  const skillsDest = join(appRoot, ".claude", "skills");
  if (existsSync(skillsSrc)) {
    if (existsSync(skillsDest) && !statSync(skillsDest).isDirectory()) {
      res.kept.push(".claude/skills (symlink stub — skipped)");
    } else {
      for (const e of readdirSync(skillsSrc, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        if (!dryRun) copyDir(join(skillsSrc, e.name), join(skillsDest, e.name));
        res.updated.push(`.claude/skills/${e.name}`);
      }
    }
  }

  // 4) Guard hook — overwrite
  const hookSrc = join(payload, "hooks", "no-mock-guard.ps1");
  if (existsSync(hookSrc)) {
    const hookDest = join(appRoot, ".claude", "hooks", "no-mock-guard.ps1");
    if (!dryRun) { mkdirSync(dirname(hookDest), { recursive: true }); copyFileSync(hookSrc, hookDest); }
    res.updated.push(".claude/hooks/no-mock-guard.ps1");
  }

  // 4b) Porting kit — drop the PORT-MAP template so the /port loop has a starting point in-repo.
  // (docs/porting/ is not on the METHOD sync surface; the design-port SPEC ships via
  // docs/METHOD/design-method.md, but the per-app template must travel with the addon.)
  const portMapTpl = join(payload, "porting", "PORT-MAP-TEMPLATE.md");
  if (existsSync(portMapTpl)) {
    const tplDest = join(appRoot, "docs", "project", "design", "PORT-MAP-TEMPLATE.md");
    if (!dryRun) { mkdirSync(dirname(tplDest), { recursive: true }); copyFileSync(portMapTpl, tplDest); }
    res.updated.push("docs/project/design/PORT-MAP-TEMPLATE.md");
  }

  // 5) settings.json — merge the no-mock PostToolUse hook (idempotent, preserves everything else)
  const snippet = readJsonSafe(join(payload, "settings.snippet.json"));
  const setPath = join(appRoot, ".claude", "settings.json");
  let settings = {};
  if (existsSync(setPath)) {
    const parsed = readJsonSafe(setPath);
    if (parsed === undefined) {
      // Malformed JSON — do NOT overwrite, or we'd destroy the app's settings.
      res.settingsSkipped = true;
      return res;
    }
    settings = parsed;
  }
  if (!settings.$schema) settings.$schema = "https://json.schemastore.org/claude-code-settings.json";
  if (!settings.hooks) settings.hooks = {};
  if (!Array.isArray(settings.hooks.PostToolUse)) settings.hooks.PostToolUse = [];
  const alreadyThere = JSON.stringify(settings.hooks.PostToolUse).includes("no-mock-guard");
  if (!alreadyThere && snippet) {
    settings.hooks.PostToolUse.push(...snippet.hooks.PostToolUse);
    if (!dryRun) { mkdirSync(dirname(setPath), { recursive: true }); writeFileSync(setPath, JSON.stringify(settings, null, 2) + "\n", "utf8"); }
    res.merged = true;
  }
  return res;
}

// --- standalone CLI ---
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const appRoot = args.find((a) => !a.startsWith("--"));
  if (!appRoot) {
    console.error("Usage: node install.mjs <appRoot> [--dry-run]");
    process.exit(1);
  }
  const r = installClaudeAddon({ appRoot, dryRun });
  console.log(`[swanifly-claude-addon]${dryRun ? " (dry-run)" : ""} ${appRoot}`);
  if (r.created.length) console.log("  created : " + r.created.join(", "));
  if (r.kept.length) console.log("  kept    : " + r.kept.join(", ") + " (already present)");
  if (r.updated.length) console.log("  tooling : " + r.updated.length + " command/skill/hook/template paths refreshed");
  if (r.directive === "added") console.log("  directive: design-port block merged into CLAUDE.md");
  else if (r.directive === "present") console.log("  directive: design-port block already present");
  if (r.settingsSkipped) console.log("  settings: SKIPPED — existing .claude/settings.json is not valid JSON (left untouched)");
  else console.log("  settings: " + (r.merged ? "no-mock hook merged" : "no-mock hook already present"));
}
