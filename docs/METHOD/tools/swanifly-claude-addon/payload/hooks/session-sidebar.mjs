#!/usr/bin/env node
// .claude/hooks/session-sidebar.mjs — SessionStart (startup): the sidebar contract for hand-made sessions
// (METHOD 322.h, sprints-method.md -> "Sidebar contract"; operator ruling 2026-10-16: "hook au demarrage +
// gardien en filet"). A hook cannot rename or move a session (those are Claude tools), so it INJECTS one short
// instruction: on its first reply the session titles itself `{repo icon} {object}` and files itself under
// "Missions libres" - unless it is a chantier supervisor / sub-session or a scheduled routine. The janitor
// (scheduled task `rangement-barre-laterale`) stays the safety net.
//
// Fail-open and silent: any error, a non-startup source, or a cwd outside a repo and a scratch workspace
// -> exit 0 with no output. Node built-ins only; one `git rev-parse`, so it stays well under 300 ms.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICONS = join("docs", "METHOD", "repo-icons.json");
const MAX_CONTEXT = 900;

const slash = (p) => String(p).replace(/\\/g, "/");

/** Top-level of the checkout containing cwd, or null when cwd is not inside a git repo. */
function toplevel(cwd) {
  try {
    const out = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd, encoding: "utf8", timeout: 2000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? slash(out) : null;
  } catch { return null; }
}

/** The repo's own root: a worktree under `<repo>/.claude/worktrees/<x>` belongs to `<repo>`. */
const repoRootOf = (top) => (/^(.+)\/\.claude\/worktrees\/[^/]+$/.exec(top) ?? [])[1] ?? top;

function readIcons(roots) {
  for (const root of roots) {
    const file = join(root, ICONS);
    if (!existsSync(file)) continue;
    try { const map = JSON.parse(readFileSync(file, "utf8")); if (map && typeof map === "object") return map; } catch { /* next */ }
  }
  return null;
}

const asIcon = (v) => (typeof v === "string" && v.length > 0 && v.length <= 16 ? v : null);

function pickIcon(map, name, scratch) {
  if (scratch) return asIcon(map?._scratch) ?? "💬";
  const key = map ? Object.keys(map).find((k) => !k.startsWith("_") && k.toLowerCase() === name.toLowerCase()) : undefined;
  return (key && asIcon(map[key])) ?? asIcon(map?._default) ?? "📁";
}

function instruction(icon) {
  return "Contrat barre latérale (METHOD 322.h). À ta première réponse, avant tout autre travail, une seule fois et sans en parler : "
    + "si tu n'es NI un superviseur de chantier, NI une sous-session de chantier (ton premier message est un brief qui cite docs/chantiers/ ou « adopt »), "
    + "NI une tâche planifiée (routine) — alors 1) ToolSearch `select:mcp__ccd_session_mgmt__set_session_title,mcp__ccd_sidebar__list_sections,mcp__ccd_sidebar__move_sessions` ; "
    + `2) \`set_session_title\` self → \`${icon} {objet en 3 à 6 mots, langue de l'opérateur}\` ; `
    + "3) `move_sessions` self vers la section « 🎯 Missions libres » (id via list_sections ; si elle n'existe pas, ne crée rien). "
    + "Sinon ignore cette consigne.";
}

function main() {
  const payload = JSON.parse(readFileSync(0, "utf8"));
  if (payload?.source !== "startup" || typeof payload.cwd !== "string") return;
  const scratch = slash(payload.cwd).includes("scratch-workspaces");
  const top = toplevel(payload.cwd);
  if (!top && !scratch) return;
  const repoRoot = top ? repoRootOf(top) : null;
  const here = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const map = readIcons(top ? [top, repoRoot] : [here]); // `here` (the hook's own checkout) only serves a scratch workspace, which has none
  const text = instruction(pickIcon(map, repoRoot ? basename(repoRoot) : "", scratch));
  if (text.length > MAX_CONTEXT) return;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: text } }));
}

try { main(); } catch { /* fail open: never block a session */ }
