#!/usr/bin/env node
/**
 * swanifly-claude-addon — installer
 *
 * Materializes the Claude Code integration into an app:
 *   - AGENTS.md, SOUL.md, CLAUDE.md   -> app root        (CREATE-IF-MISSING — never clobbers app-owned identity)
 *   - the MERGED_SECTIONS below       -> those same files (MERGE — content-guarded, per section: adds the
 *                                                          section or refreshes it when the canonical snippet
 *                                                          changes; the rest of the file is left untouched)
 *   - .claude/commands/<all>           -> app/.claude      (OVERWRITE — canonical rituals, incl. /port)
 *   - .claude/skills/<all>            -> app/.claude      (OVERWRITE — canonical tooling)
 *   - docs/project/design/PORT-MAP-TEMPLATE.md -> app docs (OVERWRITE — reference template for the /port loop)
 *   - .claude/hooks/no-mock-guard.ps1 -> app/.claude      (OVERWRITE)
 *   - .claude/hooks/session-telemetry.mjs -> app/.claude  (OVERWRITE)
 *   - .claude/hooks/{ship-push.sh,land.mjs,verify-gate.mjs} -> app/.claude (OVERWRITE — the "land, don't ship" engine, v313.a)
 *   - .claude/hooks/flight-deck.mjs   -> app/.claude      (OVERWRITE — /brief + the SessionStart resume hook, v316.a)
 *   - .claude/hooks/pilotage-refresh.mjs -> app/.claude  (OVERWRITE — rebuilds docs/pilotage/index.html
 *       at Stop, but ONLY when the turn touched docs/sprints/** or chantiers.mjs; inert and silent
 *       in an app that has no scripts/build-pilotage.mjs)
 *   - .gitignore                      -> app root         (APPEND `.method/` once, only if a .gitignore exists)
 *   - .claude/settings.json           -> app/.claude      (MERGE the no-mock PostToolUse hook + the Stop/SessionEnd/SessionStart hooks, idempotent PER ENTRY)
 *
 * Canonical section bodies live in `payload/snippets/*.md` — edit them there, never in an app repo.
 *
 * Usage (standalone):   node install.mjs <appRoot> [--dry-run]
 * Programmatic:         import { installClaudeAddon, mergeSection } from './install.mjs'
 *
 * Called automatically per app by scripts/sync-method-to-all-apps.mjs.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Canonical sections merged into the app's identity files.
 *
 * The identity files themselves stay CREATE-IF-MISSING: each app owns its own CLAUDE.md / SOUL.md /
 * AGENTS.md and we never clobber them. Only the sections listed here are hub-owned — they are
 * injected when absent and refreshed in place when the canonical snippet changes, leaving every
 * other line of the app's file alone. That is what makes a standing order actually propagate to
 * repos that already had an identity file (the copy step would skip them forever).
 *
 * A section spans from its `heading` to the next `## ` heading (so `### ` subsections belong to it
 * and MUST be part of the snippet, or the merge would drop them).
 *
 * `legacy` lists earlier spellings of the same heading. Without it the merge would not recognise
 * the old section, append a duplicate, and leave the stale copy in the file — e.g. every mirror
 * seeded before this change carries `## Model routing` (lowercase r).
 *
 * @type {{file:string, heading:string, snippet:string, legacy?:string[]}[]}
 */
const MERGED_SECTIONS = [
  { file: "CLAUDE.md", heading: "## Design port directive", snippet: "design-port-directive.md" },
  { file: "CLAUDE.md", heading: "## Model Routing", snippet: "model-routing.md", legacy: ["## Model routing"] },
  { file: "SOUL.md", heading: "## Non-negotiables", snippet: "non-negotiables.md" },
  { file: "SOUL.md", heading: "## Boundaries", snippet: "boundaries.md" },
];

/**
 * Idempotently inject or refresh one markdown section in a destination file.
 *
 * - destination or snippet missing        -> "skipped" (nothing written)
 * - heading absent                        -> "added"   (snippet appended at the end of the file)
 * - heading present, section identical    -> "present" (nothing written)
 * - heading present, section differs      -> "updated" (section replaced in place, rest preserved)
 *
 * @param {string} destFile      absolute path of the file to merge into
 * @param {string} headingText   the `## Heading` that opens the section (prefix match is enough)
 * @param {string} snippetPath   absolute path of the canonical snippet (must start with headingText)
 * @param {{dryRun?:boolean, legacy?:string[]}} [opts]  `legacy`: earlier spellings of the heading,
 *   claimed and renamed in place instead of leaving a stale duplicate behind.
 * @returns {"added"|"present"|"updated"|"skipped"}
 */
export function mergeSection(destFile, headingText, snippetPath, { dryRun = false, legacy = [] } = {}) {
  if (!existsSync(snippetPath) || !existsSync(destFile)) return "skipped";
  const current = readFileSync(destFile, "utf8");
  const block = readFileSync(snippetPath, "utf8").trimEnd();
  let start = current.indexOf(headingText);
  for (const alt of legacy) {
    if (start !== -1) break;
    start = current.indexOf(alt);
  }
  if (start === -1) {
    if (!dryRun) {
      writeFileSync(destFile, current.replace(/\s*$/, "") + "\n\n" + block + "\n", "utf8");
    }
    return "added";
  }
  const nextHeading = current.indexOf("\n## ", start + 1);
  const end = nextHeading === -1 ? current.length : nextHeading;
  if (current.slice(start, end).trimEnd() === block) return "present";
  if (!dryRun) {
    const updated = current.slice(0, start) + block + "\n" +
      (nextHeading === -1 ? "" : current.slice(end));
    writeFileSync(destFile, updated, "utf8");
  }
  return "updated";
}

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
 * @returns {{created:string[], kept:string[], updated:string[], merged:boolean, hooksMerged:string[], telemetryMerged:boolean, settingsSkipped:boolean, sections:Record<string,"added"|"present"|"updated"|"skipped">, directive:string}}
 */
export function installClaudeAddon({ appRoot, addonDir = HERE, dryRun = false } = {}) {
  const payload = join(addonDir, "payload");
  if (!existsSync(payload)) throw new Error(`payload not found at ${payload}`);
  const res = { created: [], kept: [], updated: [], merged: false, hooksMerged: [], telemetryMerged: false, settingsSkipped: false, sections: {}, directive: "skipped" };

  // 1) Identity files — create-if-missing (preserve any app-authored version)
  for (const f of ["AGENTS.md", "SOUL.md", "CLAUDE.md"]) {
    const src = join(payload, f);
    const dest = join(appRoot, f);
    if (!existsSync(src)) continue;
    if (existsSync(dest)) { res.kept.push(f); continue; }
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
    res.created.push(f);
  }

  // 1b) Canonical sections — MERGE each hub-owned block into the app's identity files.
  // Those files are create-if-missing above, so an app that already had its own CLAUDE.md/SOUL.md
  // would never receive an updated standing order via the copy. Inject or refresh each section
  // idempotently (content-guarded: replaced only when the canonical snippet changes), so the
  // "every session inherits the CURRENT rules" guarantee actually holds — without ever touching
  // the app-authored remainder of the file.
  for (const { file, heading, snippet, legacy } of MERGED_SECTIONS) {
    const outcome = mergeSection(
      join(appRoot, file),
      heading,
      join(payload, "snippets", snippet),
      { dryRun, legacy },
    );
    res.sections[`${file} → ${heading}`] = outcome;
  }
  // Back-compat: callers written against the single-section era still read `res.directive`.
  res.directive = res.sections["CLAUDE.md → ## Design port directive"] ?? "skipped";

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

  // 4c) Program hooks — overwrite. session-telemetry feeds the routing ledger;
  // ship-push + land + verify-gate are the "land, don't ship" engine (v313.a);
  // flight-deck powers /brief + the SessionStart resume hook (v316.a) — it is the fleet
  // port of the machine-local ~/.claude/scripts/flight-deck.ps1, so the pickup card works
  // on every checkout, not just the one PowerShell profile it used to be pinned to.
  // Each of these must travel with the METHOD, not live only on one machine.
  for (const name of ["session-telemetry.mjs", "ship-push.sh", "land.mjs", "verify-gate.mjs", "flight-deck.mjs", "pilotage-refresh.mjs"]) {
    const src = join(payload, "hooks", name);
    if (!existsSync(src)) continue;
    const dest = join(appRoot, ".claude", "hooks", name);
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
    res.updated.push(`.claude/hooks/${name}`);
  }

  // 4d) .gitignore — the landing gate's scratch state is per-machine, never committed.
  // (land.mjs and verify-gate.mjs also filter `.method/` themselves, so this is hygiene,
  // not correctness — an app without a .gitignore is left alone.)
  const ignorePath = join(appRoot, ".gitignore");
  if (existsSync(ignorePath)) {
    const current = readFileSync(ignorePath, "utf8");
    if (!current.includes(".method/")) {
      if (!dryRun) {
        writeFileSync(ignorePath, current.replace(/\s*$/, "\n") +
          "\n# Landing gate scratch state (HEAD-pinned verify marker, last-reported block reasons)\n.method/\n", "utf8");
      }
      res.updated.push(".gitignore (.method/)");
    }
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

  // 5) settings.json — merge hooks (idempotent per hook, preserves everything else)
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
  if (!alreadyThere && snippet?.hooks?.PostToolUse) {
    settings.hooks.PostToolUse.push(...snippet.hooks.PostToolUse);
    res.merged = true;
  }

  // Stop / SessionEnd / SessionStart merge per-entry, not per-array: an app that already has
  // the telemetry hook must still receive the landing hook, and vice versa. Each snippet
  // entry carries a distinctive script name — use it as the idempotency marker.
  const markerOf = (entry) => {
    const s = JSON.stringify(entry);
    for (const m of ["session-telemetry", "ship-push", "land.mjs", "no-mock-guard", "flight-deck", "pilotage-refresh"]) if (s.includes(m)) return m;
    return s;
  };
  for (const event of ["Stop", "SessionEnd", "SessionStart"]) {
    const incoming = snippet?.hooks?.[event];
    if (!Array.isArray(incoming)) continue;
    if (!Array.isArray(settings.hooks[event])) settings.hooks[event] = [];
    const present = JSON.stringify(settings.hooks[event]);
    for (const entry of incoming) {
      if (present.includes(markerOf(entry))) continue;
      settings.hooks[event].push(entry);
      res.hooksMerged.push(`${event}:${markerOf(entry)}`);
    }
  }
  res.telemetryMerged = res.hooksMerged.some((h) => h.includes("session-telemetry"));

  if (!dryRun && (res.merged || res.hooksMerged.length)) {
    mkdirSync(dirname(setPath), { recursive: true });
    writeFileSync(setPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
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
  for (const [label, outcome] of Object.entries(r.sections)) {
    console.log(`  section : ${label} — ${outcome}`);
  }
  if (r.settingsSkipped) console.log("  settings: SKIPPED — existing .claude/settings.json is not valid JSON (left untouched)");
  else {
    console.log("  settings: " + (r.merged ? "no-mock hook merged" : "no-mock hook already present"));
    console.log("  settings: " + (r.hooksMerged.length ? "hooks merged — " + r.hooksMerged.join(", ") : "Stop/SessionEnd/SessionStart hooks already present"));
  }
}
