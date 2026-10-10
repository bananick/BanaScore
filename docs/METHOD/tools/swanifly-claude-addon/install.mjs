#!/usr/bin/env node
/**
 * swanifly-claude-addon — installer
 *
 * Materializes the Claude Code integration into an app. Ownership is explicit — the hub owns the
 * rules, the app owns its identity and anything it declares in `docs/METHOD/app-settings.json`
 * → `claudeAddon` (`ownedSections`, `ownedAgents`, `activeAgents`, `appOwnedIdentity`):
 *
 *   - SOUL.md                         -> app root        (CREATE-IF-MISSING, then MERGE the two hub-owned
 *                                                          sections — `## Non-negotiables` and `## Boundaries` —
 *                                                          and nothing else. Identity, Mission, Personas, Voice
 *                                                          and every other byte belong to the app: an app H1
 *                                                          that is not the payload's marks an app-owned identity,
 *                                                          kept and reported. An earlier version overwrote the
 *                                                          whole file on the claim that "51 mirrors held zero
 *                                                          app-specific content"; that did not hold — BanaLazer's
 *                                                          SOUL.md is a different product's soul and was replaced
 *                                                          by the 317.a sync.)
 *   - AGENTS.md                       -> app root        (CREATE-IF-MISSING; an existing file gets the same
 *                                                          section merge, but only for sections it already has)
 *   - CLAUDE.md                       -> app root        (CREATE-IF-MISSING — carries per-app stack detection
 *                                                          and proto/ specifics, so we never clobber it)
 *   - CLAUDE_MERGED_SECTIONS below    -> CLAUDE.md        (MERGE — per section, anchored heading-prefix match:
 *                                                          added when absent, refreshed in place when the canonical
 *                                                          text changes, skipped when listed in `ownedSections`;
 *                                                          the rest of the file is left untouched. Compared
 *                                                          CRLF-insensitively, written in the file's own EOL style;
 *                                                          a section 318.a folded into another —
 *                                                          REMOVED_SECTIONS — is deleted, unless owned)
 *   - .claude/commands/<all>          -> app/.claude      (OVERWRITE — canonical rituals, incl. /port)
 *   - .claude/skills/<all>            -> app/.claude      (OVERWRITE — canonical tooling; a skill the hub keeps in
 *                                                          `.claude/_dormant/skills/` is not installed)
 *   - docs/project/design/PORT-MAP-TEMPLATE.md -> app docs (OVERWRITE — reference template for the /port loop)
 *   - .claude/hooks/no-mock-guard.ps1 -> app/.claude      (OVERWRITE)
 *   - .claude/hooks/session-telemetry.mjs -> app/.claude  (OVERWRITE — appends the ledger; hooks no longer commit it since v318.a)
 *   - .claude/hooks/{ship-push.sh,land.mjs,verify-gate.mjs} -> app/.claude (OVERWRITE — the "land, don't ship" engine, v313.a)
 *   - .claude/hooks/flight-deck.mjs   -> app/.claude      (OVERWRITE — /brief + the SessionStart resume hook, v316.a)
 *   - .claude/hooks/pilotage-refresh.mjs -> app/.claude  (OVERWRITE — rebuilds docs/pilotage/index.html
 *       at Stop, but ONLY when the turn touched docs/sprints/** or chantiers.mjs; inert and silent
 *       in an app that has no scripts/build-pilotage.mjs)
 *   - .gitignore                      -> app root         (APPEND `.method/`, the telemetry ledger and the raw-extracts line (RAW_EXTRACTS_IGNORE)
 *                                                          once each, only if a .gitignore exists)
 *   - .claude/settings.json           -> app/.claude      (MERGE the no-mock PostToolUse hook + the Stop/SessionEnd/SessionStart hooks, idempotent PER ENTRY)
 *
 * "OVERWRITE" is guarded when the caller supplies a `classify` function (scripts/lib/method-sync.mjs
 * does): a file whose content is neither the incoming one nor a known historical hub version is a
 * CLOBBER — reported, and skipped unless `force`. Without `classify` (standalone use) it overwrites.
 * The SECTION rewrites (the two SOUL sections, the five merged CLAUDE.md / AGENTS.md sections, the removal of a
 * folded one) are guarded the same way through `classifySection`: a section whose current text is no version the
 * hub ever published is APP-AUTHORED — kept, listed in `sectionsKept`, replaced only by `force`.
 *
 * Canonical section bodies: a `payload/snippets/*.md` whose first line is the section heading, else
 * the section of the same name inside `payload/CLAUDE.md` (or `payload/AGENTS.md` for AGENTS.md).
 * Edit them there, never in an app repo.
 *
 * USER LEVEL (`--user`, separate from the per-app install above): payload/user/{CLAUDE.md,settings.json,scripts/flight-deck.ps1}
 * -> ~/.claude/ (or $CLAUDE_HOME). Three files, nothing else — never memory/, credentials, logins or .env.
 * A target that exists and differs is backed up as `<name>.bak-<YYYYMMDD-HHMMSS>` first; an identical one is
 * skipped. settings.json carries `__HOME__`, replaced by os.homedir() when written. Run it on a new machine.
 *
 * Usage (standalone):   node install.mjs <appRoot> [--dry-run] [--force]
 *                       node install.mjs --user [--dry-run] [--only settings.json] [--env-only]
 *                       (--env-only writes just the missing env.CLAUDE_CODE_SUBAGENT_MODEL; exit 1 if settings.json is invalid JSON)
 * Programmatic:         import { installClaudeAddon, installUserLevel, mergeSection } from './install.mjs'
 *
 * Called automatically per app by scripts/sync-method-to-all-apps.mjs and
 * Apps/script/sync-method-to-github.mjs.
 */
import {
  readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync, statSync,
} from "fs";
import { homedir } from "os";
import { join, dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PAYLOAD_REL = "docs/METHOD/tools/swanifly-claude-addon/payload";

/** Path of the per-machine telemetry ledger, relative to an app root (gitignored since v318.a; no hook commits it any more). */
export const TELEMETRY_LEDGER = "docs/project/telemetry/sessions.jsonl";

/**
 * SOUL.md sections the hub owns, by exact H2 heading. Every other part of a SOUL.md is the app's.
 * @type {string[]}
 */
export const HUB_SOUL_SECTIONS = ["## Non-negotiables", "## Boundaries"];

/**
 * Sections merged into CLAUDE.md (and into AGENTS.md when it already carries them), matched by an
 * anchored, case-insensitive heading PREFIX — the count in `## Agent Cohort (10 active …)` changes
 * from release to release, the prefix does not. A section runs to the next H1/H2.
 *
 * `legacy` lists earlier spellings of the same heading. Without it the merge would not recognise
 * the old section, append a duplicate and leave the stale copy in the file — every mirror seeded
 * before 318.a carries `## Landing (the default) …` and `## Operator reporting …`.
 *
 * @type {{prefix:string, legacy:string[]}[]}
 */
export const CLAUDE_MERGED_SECTIONS = [
  { prefix: "## Agent Cohort", legacy: ["## Agent cohort"] },
  { prefix: "## Model Routing", legacy: ["## Model routing"] },
  { prefix: "## Landing & conversation size", legacy: ["## Landing (the default)"] },
  { prefix: "## Communication Contract", legacy: ["## Operator reporting"] },
  { prefix: "## Design port directive", legacy: [] },
];

/**
 * Sections that 318.a folded into another one (`## Délégation par défaut` — the delegation order — is now
 * part of `## Model Routing`). An app's CLAUDE.md that still carries one has it REMOVED, unless the app
 * lists it in `ownedSections`. Reported as `removed`.
 * @type {string[]}
 */
export const REMOVED_SECTIONS = ["## Délégation par défaut"];

/**
 * Where a REMOVED section went. The removal is only safe because its content now arrives inside the host
 * section: an app that owns the host (`ownedSections` lists `## Model Routing`) never receives it, so the folded
 * section is the only copy of the delegation order it has — it stays.
 * @type {Record<string,string>}
 */
export const FOLDED_INTO = { "## Délégation par défaut": "## Model Routing" };

/** The gitignore line for raw study extracts (Iris, rule 3: personal data stays local and out of git). */
export const RAW_EXTRACTS_IGNORE = "docs/deliverables/**/raw/";

// ── text plumbing ───────────────────────────────────────────────────────────

/** Line endings are a checkout artefact (core.autocrlf), never content: compare without them. */
export const lf = (s) => s.replace(/\r\n/g, "\n");
/** The dominant EOL style of a file — what a section written into it must use. */
export function eolOf(s) {
  const crlf = (s.match(/\r\n/g) ?? []).length;
  const bare = (s.match(/(?<!\r)\n/g) ?? []).length;
  return crlf > bare ? "\r\n" : "\n";
}
const h1Of = (s) => lf(s).replace(/^\uFEFF/, "").split("\n").find((l) => /^#\s/.test(l))?.trim() ?? "";
const normHeading = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();
const startsWithHeading = (heading, prefix) => normHeading(heading).startsWith(normHeading(prefix));
const equalsHeading = (heading, name) => normHeading(heading) === normHeading(name);

/** Every H1/H2 line of a markdown text with its offset; headings inside fenced code are not headings. */
function headingsOf(text) {
  const out = [];
  let pos = 0;
  let fence = null;
  for (;;) {
    const nl = text.indexOf("\n", pos);
    const line = text.slice(pos, nl === -1 ? text.length : nl).replace(/\r$/, "");
    // CommonMark: a fence closes only on the SAME character, at least as long as the opening one, and with
    // nothing but spaces after it. A shorter run, the other character, or a run followed by text is content.
    const f = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (f) {
      if (!fence) fence = { ch: f[1][0], len: f[1].length };
      else if (f[1][0] === fence.ch && f[1].length >= fence.len && f[2].trim() === "") fence = null;
    } else if (!fence) {
      const m = /^(#{1,2})[ \t]+\S/.exec(line);
      if (m) out.push({ start: pos, level: m[1].length, text: line.trimEnd() });
    }
    if (nl === -1) break;
    pos = nl + 1;
  }
  return out;
}

/** The first H2 section whose heading `accept`s, as { start, end, heading } — `end` = next H1/H2 or EOF. */
function locate(text, accept) {
  const hs = headingsOf(text);
  for (let i = 0; i < hs.length; i++) {
    if (hs[i].level === 2 && accept(hs[i].text)) {
      return { start: hs[i].start, end: i + 1 < hs.length ? hs[i + 1].start : text.length, heading: hs[i].text };
    }
  }
  return null;
}

/** The LF-normalised, right-trimmed text of one H2 section (heading line included), or null. */
export function extractSection(text, accept) {
  const sec = locate(text, typeof accept === "string" ? (h) => equalsHeading(h, accept) : accept);
  return sec ? lf(text.slice(sec.start, sec.end)).trimEnd() : null;
}

/**
 * One MERGED section as the merge sees it: the first H2 whose heading starts with `prefix` or one of its
 * `legacy` spellings. `spec` is a CLAUDE_MERGED_SECTIONS entry (or `{ prefix }` for a REMOVED_SECTIONS one).
 * The fleet doctor reads an app's current text with this, so it judges exactly what the sync would replace.
 */
export function mergedSectionText(text, { prefix, legacy = [] }) {
  const names = [prefix, ...legacy];
  return extractSection(text, (h) => names.some((n) => startsWithHeading(h, n)));
}

/**
 * Inject or refresh one section in a destination file, leaving every other byte alone.
 * `guard(currentText)` (optional) says whether the section's CURRENT text may be replaced: when it says no, the
 * section is left exactly as it is and the outcome is "kept" (app-authored text — see `classifySection`).
 * @returns {"added"|"present"|"updated"|"skipped"|"kept"}
 */
function mergeInto(destFile, { accept, legacy = [], canonical, append = true, dryRun = false, detail = {}, guard = null }) {
  const current = readFileSync(destFile, "utf8");
  const eol = eolOf(current);
  const block = eol === "\n" ? canonical : canonical.replace(/\n/g, eol);
  let sec = locate(current, accept);
  for (const alt of legacy) {
    if (sec) break;
    sec = locate(current, alt);
  }
  if (!sec) {
    if (!append) return "skipped";
    if (!dryRun) writeFileSync(destFile, current.replace(/\s*$/, "") + eol + eol + block + eol, "utf8");
    return "added";
  }
  const body = current.slice(sec.start, sec.end);
  const before = lf(body).trimEnd();
  if (before === canonical) return "present";
  detail.before = before.split("\n").length; // lines replaced → lines written: a big drop is an app-edited section
  detail.after = canonical.split("\n").length;
  if (guard && !guard(before)) return "kept";
  if (!dryRun) {
    const keep = /\s*$/.exec(body)[0]; // the blank lines that separate it from the next heading
    writeFileSync(destFile, current.slice(0, sec.start) + block + keep + current.slice(sec.end), "utf8");
  }
  return "updated";
}

/** Delete one H2 section (heading to the next H1/H2), leaving every other byte alone. @returns {"removed"|"absent"} */
function removeSection(destFile, accept, dryRun) {
  const current = readFileSync(destFile, "utf8");
  const sec = locate(current, accept);
  if (!sec) return "absent";
  if (!dryRun) {
    const before = current.slice(0, sec.start);
    // the last section of the file: end the file on one newline instead of a dangling blank line
    const out = sec.end >= current.length ? before.replace(/\s*$/, "") + eolOf(current) : before + current.slice(sec.end);
    writeFileSync(destFile, out, "utf8");
  }
  return "removed";
}

/**
 * Idempotently inject or refresh one markdown section in a destination file (public API since the
 * single-section era).
 *
 * - destination or snippet missing        -> "skipped" (nothing written)
 * - heading absent                        -> "added"   (snippet appended at the end of the file)
 * - heading present, section identical    -> "present" (nothing written; CRLF vs LF is not a difference)
 * - heading present, section differs      -> "updated" (section replaced in place, rest preserved)
 *
 * The heading is matched anchored — a heading LINE that starts with `headingText`, case-insensitively —
 * never as a substring anywhere in the file, so a prose mention can no longer hijack the merge.
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
  return mergeInto(destFile, {
    accept: (h) => startsWithHeading(h, headingText),
    legacy: legacy.map((alt) => (h) => startsWithHeading(h, alt)),
    canonical: lf(readFileSync(snippetPath, "utf8")).trimEnd(),
    dryRun,
  });
}

// ── app settings ────────────────────────────────────────────────────────────

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

const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

/** `claudeAddon` in the app's docs/METHOD/app-settings.json — the one file the sync preserves. */
export function readAddonSettings(appRoot) {
  const c = readJsonSafe(join(appRoot, "docs", "METHOD", "app-settings.json"))?.claudeAddon ?? {};
  return {
    appOwnedIdentity: c.appOwnedIdentity === true,
    ownedSections: strings(c.ownedSections),
    ownedAgents: strings(c.ownedAgents).map((n) => n.toLowerCase().replace(/\.md$/, "")),
    activeAgents: strings(c.activeAgents).map((n) => n.toLowerCase().replace(/\.md$/, "")),
    activeSkills: strings(c.activeSkills).map((n) => n.toLowerCase()),
  };
}

/** A section is app-owned when `ownedSections` lists a heading that starts with its prefix. */
const isOwnedSection = (owned, prefix) => owned.some((o) => startsWithHeading(o, prefix));

// ── canonical section sources ───────────────────────────────────────────────

/** The `payload/snippets/*.md` files as { text (LF), head (first non-empty line) }. */
function readSnippets(payload) {
  const dir = join(payload, "snippets");
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => {
      const text = lf(readFileSync(join(dir, e.name), "utf8"));
      return { text, head: text.split("\n").find((l) => l.trim()) ?? "" };
    });
}

/**
 * The canonical text of one merged section: a snippet that opens with the heading (or a legacy
 * spelling of it), else the same section inside `fallbackFile`. null = the payload has no source.
 */
function canonicalFor({ prefix, legacy }, snippets, fallbackText) {
  const names = [prefix, ...legacy];
  const snip = snippets.find((s) => names.some((n) => startsWithHeading(s.head, n)));
  if (snip) return snip.text.trimEnd();
  if (fallbackText) return extractSection(fallbackText, (h) => names.some((n) => startsWithHeading(h, n)));
  return null;
}

/**
 * Where each merged CLAUDE.md section comes from (doctor E15 uses this): `text` is what the sync would
 * write (the snippet when there is one, else the payload CLAUDE.md section); `snippet` and `claude`
 * are the two candidate sources, null when absent, so the doctor can tell when they disagree.
 */
export function canonicalClaudeSections(addonDir = HERE) {
  const payload = join(addonDir, "payload");
  const snippets = readSnippets(payload);
  const claude = existsSync(join(payload, "CLAUDE.md")) ? lf(readFileSync(join(payload, "CLAUDE.md"), "utf8")) : "";
  return CLAUDE_MERGED_SECTIONS.map((spec) => ({
    prefix: spec.prefix,
    text: canonicalFor(spec, snippets, claude),
    snippet: canonicalFor(spec, snippets, ""),
    claude: canonicalFor(spec, [], claude),
  }));
}

// ── files ───────────────────────────────────────────────────────────────────

function* walkFiles(dir, rel = "") {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) yield* walkFiles(join(dir, e.name), rel ? `${rel}/${e.name}` : e.name);
    else yield rel ? `${rel}/${e.name}` : e.name;
  }
}

/** Names of the directories under <hubRoot>/.claude/_dormant/skills — read dynamically, never hardcoded. */
function dormantSkillNames(hubRoot) {
  const dir = join(hubRoot, ".claude", "_dormant", "skills");
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase()));
}

const LEDGER_IGNORES = new Set([
  TELEMETRY_LEDGER, `/${TELEMETRY_LEDGER}`, "docs/project/telemetry/", "docs/project/telemetry/*",
  "docs/project/telemetry/*.jsonl", "/docs/project/telemetry/", "*.jsonl",
]);
const ignoresLedger = (gitignore) => lf(gitignore).split("\n").some((l) => LEDGER_IGNORES.has(l.trim()));
const RAW_IGNORES = new Set([RAW_EXTRACTS_IGNORE, `/${RAW_EXTRACTS_IGNORE}`, "docs/deliverables/", "/docs/deliverables/", "docs/deliverables", "**/raw/", "raw/"]);
const ignoresRawExtracts = (gitignore) => lf(gitignore).split("\n").some((l) => RAW_IGNORES.has(l.trim()));

/**
 * @param {{appRoot:string, addonDir?:string, hubRoot?:string, dryRun?:boolean, force?:boolean,
 *   classify?:(hubRels:string[], current:Buffer)=>"known-hub-version"|"CLOBBER",
 *   classifySection?:(s:{kind:"soul"|"merged", name:string, text:string})=>boolean}} opts
 *   `classify` guards the OVERWRITE copies; `classifySection` guards the SECTION rewrites the same way: it says
 *   whether `text` — an app's current text of a hub-owned SOUL section (`kind: "soul"`, `name` = heading) or of a
 *   merged CLAUDE.md / AGENTS.md section or a folded one (`kind: "merged"`, `name` = heading prefix) — is a
 *   version the hub once published. A section whose text it rejects is APP-AUTHORED: it is kept, listed in
 *   `sectionsKept`, and only `force` replaces it. Without `classifySection` (standalone use) every section is
 *   rewritten, as before. `hubRoot` (default: four levels above `addonDir`) is where the hub's
 *   `.claude/_dormant/` is read from.
 * @returns {{created:string[], kept:string[], updated:string[], skipped:string[], files:{path:string,class:string}[], merged:boolean, hooksMerged:string[], telemetryMerged:boolean, settingsSkipped:boolean, settingsCreated:boolean, sections:Record<string,"added"|"present"|"updated"|"skipped"|"app-owned"|"removed"|"kept">, sectionLines:Record<string,string>, sectionsKept:{label:string, file:string, heading:string, lines:number, linesAfter:number, would:"overwritten"|"deleted"}[], directive:string}}
 */
export function installClaudeAddon({ appRoot, addonDir = HERE, hubRoot, dryRun = false, force = false, classify = null, classifySection = null } = {}) {
  const payload = join(addonDir, "payload");
  if (!existsSync(payload)) throw new Error(`payload not found at ${payload}`);
  const hub = hubRoot ?? resolve(addonDir, "..", "..", "..", "..");
  const res = {
    created: [], kept: [], updated: [], skipped: [], files: [], merged: false, hooksMerged: [],
    telemetryMerged: false, settingsSkipped: false, settingsCreated: false, sections: {}, sectionLines: {}, sectionsKept: [], directive: "skipped",
  };
  const addon = readAddonSettings(appRoot);

  /** One section merge; an `updated` one also records how many lines it replaced (a big drop = app-edited text). */
  const mayOverwrite = (kind, name) => (text) => !classifySection || force || classifySection({ kind, name, text });
  const keptEntry = (label, lines, linesAfter, would) => {
    const [file, heading] = label.split(" → ");
    res.sectionsKept.push({ label, file, heading, lines, linesAfter, would });
  };
  const merge = (label, dest, { kind, name, ...opts }) => {
    const detail = {};
    const outcome = mergeInto(dest, { ...opts, dryRun, detail, guard: mayOverwrite(kind, name) });
    res.sections[label] = outcome;
    if (outcome === "updated") res.sectionLines[label] = `${detail.before}→${detail.after} lines`;
    if (outcome === "kept") keptEntry(label, detail.before, detail.after, "overwritten");
  };

  /** One OVERWRITE copy, classified: new · same (CRLF-insensitive) · known-hub-version · CLOBBER · changed. */
  const put = (src, dest, label, hubRels) => {
    const incoming = readFileSync(src);
    let cls = "new";
    if (existsSync(dest)) {
      const current = readFileSync(dest);
      if (current.equals(incoming) || lf(current.toString("utf8")) === lf(incoming.toString("utf8"))) cls = "same";
      else cls = classify ? classify(hubRels, current) : "changed";
    }
    res.files.push({ path: label, class: cls });
    if (cls === "same") return;
    if (cls === "CLOBBER" && !force) { res.skipped.push(label); return; }
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
    res.updated.push(label);
  };

  const snippets = readSnippets(payload);
  const readPayload = (name) => (existsSync(join(payload, name)) ? lf(readFileSync(join(payload, name), "utf8")) : "");
  const payloadSoul = readPayload("SOUL.md");
  const payloadClaude = readPayload("CLAUDE.md");
  const payloadAgents = readPayload("AGENTS.md");

  // 1) SOUL.md — the app owns its identity; the hub owns exactly two sections of it.
  {
    const dest = join(appRoot, "SOUL.md");
    if (payloadSoul) {
      if (!existsSync(dest)) {
        if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(payload, "SOUL.md"), dest); }
        res.created.push("SOUL.md");
      } else {
        const current = readFileSync(dest, "utf8");
        const h1 = h1Of(current);
        if (addon.appOwnedIdentity || (h1 && h1 !== h1Of(payloadSoul))) res.kept.push(`SOUL.md (app-owned identity: ${h1 || "no H1"})`);
        for (const heading of HUB_SOUL_SECTIONS) {
          const label = `SOUL.md → ${heading}`;
          if (isOwnedSection(addon.ownedSections, heading)) { res.sections[label] = "app-owned"; continue; }
          const canonical = extractSection(payloadSoul, heading);
          if (canonical === null) res.sections[label] = "skipped";
          else merge(label, dest, { accept: (h) => equalsHeading(h, heading), canonical, kind: "soul", name: heading });
        }
      }
    }
  }

  // 1b) AGENTS.md — create-if-missing; an existing file refreshes only the sections it already carries.
  {
    const dest = join(appRoot, "AGENTS.md");
    if (payloadAgents) {
      if (!existsSync(dest)) {
        if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(join(payload, "AGENTS.md"), dest); }
        res.created.push("AGENTS.md");
      } else {
        for (const spec of CLAUDE_MERGED_SECTIONS) {
          const names = [spec.prefix, ...spec.legacy];
          const current = readFileSync(dest, "utf8");
          if (!locate(current, (h) => names.some((n) => startsWithHeading(h, n)))) continue;
          const label = `AGENTS.md → ${spec.prefix}`;
          if (isOwnedSection(addon.ownedSections, spec.prefix)) { res.sections[label] = "app-owned"; continue; }
          const canonical = canonicalFor(spec, [], payloadAgents);
          if (canonical === null) continue;
          merge(label, dest, {
            accept: (h) => startsWithHeading(h, spec.prefix),
            legacy: spec.legacy.map((alt) => (h) => startsWithHeading(h, alt)),
            canonical, append: false, kind: "merged", name: spec.prefix,
          });
        }
      }
    }
  }

  // 1c) CLAUDE.md — create-if-missing, then MERGE each hub-owned section into it. An app that already
  // had its own CLAUDE.md would never receive an updated standing order via the copy; the merge is
  // content-guarded (rewritten only when the canonical text changed) and never touches the rest.
  {
    const dest = join(appRoot, "CLAUDE.md");
    const src = join(payload, "CLAUDE.md");
    if (existsSync(src)) {
      if (existsSync(dest)) res.kept.push("CLAUDE.md");
      else {
        if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
        res.created.push("CLAUDE.md");
      }
    }
    if (existsSync(dest)) {
      for (const spec of CLAUDE_MERGED_SECTIONS) {
        const label = `CLAUDE.md → ${spec.prefix}`;
        if (isOwnedSection(addon.ownedSections, spec.prefix)) { res.sections[label] = "app-owned"; continue; }
        const canonical = canonicalFor(spec, snippets, payloadClaude);
        if (canonical === null) { res.sections[label] = "skipped"; continue; }
        merge(label, dest, {
          accept: (h) => startsWithHeading(h, spec.prefix),
          legacy: spec.legacy.map((alt) => (h) => startsWithHeading(h, alt)),
          canonical, kind: "merged", name: spec.prefix,
        });
      }
    }
    // Sections folded into another in 318.a: gone from the app unless it owns them.
    if (existsSync(dest)) {
      for (const prefix of REMOVED_SECTIONS) {
        const label = `CLAUDE.md → ${prefix}`;
        const accept = (h) => startsWithHeading(h, prefix);
        if (!locate(readFileSync(dest, "utf8"), accept)) continue;
        const host = FOLDED_INTO[prefix];
        const kept = isOwnedSection(addon.ownedSections, prefix) || (host && isOwnedSection(addon.ownedSections, host));
        if (kept) { res.sections[label] = "app-owned"; continue; }
        // The delegation text goes only if it is text the hub published; an app's own delegation order stays.
        const text = extractSection(readFileSync(dest, "utf8"), accept);
        if (!mayOverwrite("merged", prefix)(text)) {
          res.sections[label] = "kept";
          keptEntry(label, text.split("\n").length, 0, "deleted");
          continue;
        }
        res.sections[label] = removeSection(dest, accept, dryRun);
      }
    }
    // Back-compat: callers written against the single-section era still read `res.directive`.
    res.directive = res.sections["CLAUDE.md → ## Design port directive"] ?? "skipped";
  }

  // 2) Commands — overwrite (canonical rituals, like METHOD files)
  const commandsSrc = join(payload, "commands");
  if (existsSync(commandsSrc)) {
    for (const e of readdirSync(commandsSrc, { withFileTypes: true })) {
      if (!e.isFile()) continue;
      put(join(commandsSrc, e.name), join(appRoot, ".claude", "commands", e.name), `.claude/commands/${e.name}`,
        [`.claude/commands/${e.name}`, `${PAYLOAD_REL}/commands/${e.name}`]);
    }
  }

  // 3) Skills — overwrite (canonical tooling, like METHOD files). A skill the hub parks in
  // `.claude/_dormant/skills/` is not installed (the agent sync moves any live copy out of the app),
  // unless the app lists it in `activeSkills`/`activeAgents`.
  // Some repos keep `.claude/skills` as a symlink (materialized as a plain file on
  // Windows checkouts) — skip those instead of erroring; the target dir is theirs to manage.
  const skillsSrc = join(payload, "skills");
  const skillsDest = join(appRoot, ".claude", "skills");
  if (existsSync(skillsSrc)) {
    if (existsSync(skillsDest) && !statSync(skillsDest).isDirectory()) {
      res.kept.push(".claude/skills (symlink stub — skipped)");
    } else {
      const dormant = dormantSkillNames(hub);
      for (const e of readdirSync(skillsSrc, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const name = e.name.toLowerCase();
        if (dormant.has(name) && !addon.activeSkills.includes(name) && !addon.activeAgents.includes(name)) {
          res.kept.push(`.claude/skills/${e.name} (dormant in the hub — not installed)`);
          continue;
        }
        for (const rel of walkFiles(join(skillsSrc, e.name))) {
          put(join(skillsSrc, e.name, rel), join(skillsDest, e.name, rel), `.claude/skills/${e.name}/${rel}`,
            [`${PAYLOAD_REL}/skills/${e.name}/${rel}`, `.claude/skills/${e.name}/${rel}`, `.claude/_dormant/skills/${e.name}/${rel}`]);
        }
      }
    }
  }

  // 4) Guard hook — overwrite
  const hookSrc = join(payload, "hooks", "no-mock-guard.ps1");
  if (existsSync(hookSrc)) {
    put(hookSrc, join(appRoot, ".claude", "hooks", "no-mock-guard.ps1"), ".claude/hooks/no-mock-guard.ps1",
      [".claude/hooks/no-mock-guard.ps1", `${PAYLOAD_REL}/hooks/no-mock-guard.ps1`]);
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
    put(src, join(appRoot, ".claude", "hooks", name), `.claude/hooks/${name}`,
      [`.claude/hooks/${name}`, `${PAYLOAD_REL}/hooks/${name}`]);
  }

  // 4d) .gitignore — per-machine state is never committed: the landing gate's scratch (`.method/`)
  // and, since v318.a, the telemetry ledger (it used to cost a `chore(telemetry)` commit per
  // conversation). land.mjs and verify-gate.mjs also filter `.method/` themselves, so this is
  // hygiene, not correctness — an app without a .gitignore is left alone. NB: ignoring a file the
  // app already TRACKS changes nothing until it runs `git rm --cached` on it (the sync never does).
  const ignorePath = join(appRoot, ".gitignore");
  if (existsSync(ignorePath)) {
    const current = readFileSync(ignorePath, "utf8");
    const eol = eolOf(current);
    const add = [];
    if (!current.includes(".method/")) {
      add.push("# Landing gate scratch state (HEAD-pinned verify marker, last-reported block reasons)", ".method/");
      res.updated.push(".gitignore (.method/)");
    }
    if (!ignoresLedger(current)) {
      if (add.length) add.push("");
      add.push("# Session telemetry ledger — per-machine; hooks no longer commit it (318.a), the file becomes untracked in a follow-up; read it with `npm run telemetry:report` in the hub",
        TELEMETRY_LEDGER);
      res.updated.push(".gitignore (telemetry ledger)");
    }
    // Iris's rule 3: raw study extracts hold personal data and never reach a remote.
    if (!ignoresRawExtracts(current)) {
      if (add.length) add.push("");
      add.push("# Raw study extracts (Iris) — personal data stays local and out of git", RAW_EXTRACTS_IGNORE);
      res.updated.push(".gitignore (raw study extracts)");
    }
    if (add.length && !dryRun) writeFileSync(ignorePath, current.replace(/\s*$/, "") + eol + eol + add.join(eol) + eol, "utf8");
  }

  // 4b) Porting kit — drop the PORT-MAP template so the /port loop has a starting point in-repo.
  // (docs/porting/ is not on the METHOD sync surface; the design-port SPEC ships via
  // docs/METHOD/design-method.md, but the per-app template must travel with the addon.)
  const portMapTpl = join(payload, "porting", "PORT-MAP-TEMPLATE.md");
  if (existsSync(portMapTpl)) {
    put(portMapTpl, join(appRoot, "docs", "project", "design", "PORT-MAP-TEMPLATE.md"), "docs/project/design/PORT-MAP-TEMPLATE.md",
      [`${PAYLOAD_REL}/porting/PORT-MAP-TEMPLATE.md`, "docs/project/design/PORT-MAP-TEMPLATE.md"]);
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
  // The dry run must say whether the file is NEW (a whole wiring file that did not exist) or merged into.
  res.settingsCreated = !existsSync(setPath) && (res.merged || res.hooksMerged.length > 0);

  if (!dryRun && (res.merged || res.hooksMerged.length)) {
    mkdirSync(dirname(setPath), { recursive: true });
    writeFileSync(setPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  }
  return res;
}

// ── user level (~/.claude) ──────────────────────────────────────────────────

/** The only files `--user` ever writes (three; the script is what the settings hooks call), relative to payload/user/ and to the Claude dir. */
export const USER_FILES = ["CLAUDE.md", "settings.json", "scripts/flight-deck.ps1"];

/** Replace the `__HOME__` placeholder in every string of a parsed JSON value (JSON-safe on Windows backslashes). */
function fillHome(v, home) {
  if (typeof v === "string") return v.replaceAll("__HOME__", home);
  if (Array.isArray(v)) return v.map((x) => fillHome(x, home));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillHome(x, home)]));
  return v;
}

/**
 * Keys `--user` guarantees in the user's settings.json `env` block (added only when absent — an explicit
 * operator value always wins). CLAUDE_CODE_SUBAGENT_MODEL is the default model of a sub-agent that has
 * neither an explicit `model` param nor a `model:` in its agent frontmatter (otherwise it inherits the
 * coordinator, i.e. opus). Never use the `_FORCE` variant: it would override explicit opus for review/security.
 */
export const USER_ENV_DEFAULTS = { CLAUDE_CODE_SUBAGENT_MODEL: "sonnet" };

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Merge the payload settings into the operator's existing ones: the existing value always wins, the payload
 * only fills what is missing (`env` is merged key by key). Idempotent; never drops a machine-specific key.
 */
export function mergeUserSettings(existing, payload) {
  const out = { ...existing };
  for (const [k, v] of Object.entries(payload)) {
    if (!(k in out)) out[k] = v;
    else if (k === "env" && isObj(out.env) && isObj(v)) out.env = { ...v, ...out.env };
  }
  return out;
}

/** The text `--user` would write for one payload file; settings.json gets `__HOME__` filled, CLAUDE.md is verbatim. */
function renderUserFile(name, raw, home) {
  if (name !== "settings.json") return raw;
  return JSON.stringify(fillHome(JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw), home), null, 2) + "\n";
}

const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

/**
 * `--user --env-only`: write ONLY the USER_ENV_DEFAULTS keys that are absent from the user's settings.json `env`
 * (today: CLAUDE_CODE_SUBAGENT_MODEL=sonnet). Permissions, hooks, statusLine and autoMode are never read from the
 * payload — this is the safe fix for the doctor's W7 on a machine whose settings.json is already tuned.
 * @returns {{claudeDir:string, files:{path:string, outcome:"written"|"identical"|"backed-up+written"|"skipped-invalid", backup?:string}[]}}
 */
export function installUserEnv({ claudeDir, home = homedir(), dryRun = false, now = new Date() } = {}) {
  const target = claudeDir ?? process.env.CLAUDE_HOME ?? join(home, ".claude");
  const dest = join(target, "settings.json");
  const res = { claudeDir: target, files: [] };
  const out = (outcome, backup) => res.files.push({ path: "settings.json", outcome, ...(backup ? { backup } : {}) });
  let current = {};
  if (existsSync(dest)) {
    try { current = JSON.parse(readFileSync(dest, "utf8").replace(/^\uFEFF/, "")); } catch { current = null; }
    if (!isObj(current) || (current.env !== undefined && !isObj(current.env))) { out("skipped-invalid"); return res; }
  }
  const env = current.env ?? {};
  const missing = Object.entries(USER_ENV_DEFAULTS).filter(([k]) => !(k in env));
  if (!missing.length) { out("identical"); return res; }
  const next = { ...current, env: { ...env, ...Object.fromEntries(missing) } };
  if (!existsSync(dest)) {
    if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, JSON.stringify(next, null, 2) + "\n", "utf8"); }
    out("written");
    return res;
  }
  const backup = `settings.json.bak-${stamp(now)}`;
  if (!dryRun) { copyFileSync(dest, join(target, backup)); writeFileSync(dest, JSON.stringify(next, null, 2) + "\n", "utf8"); }
  out("backed-up+written", backup);
  return res;
}

/**
 * Restore the operator's user-level Claude config on a new machine.
 * settings.json is MERGED into the existing one (existing keys win, missing keys are filled, `env` per key,
 * USER_ENV_DEFAULTS guaranteed); the other files are replaced with a .bak backup.
 * @param {{addonDir?:string, claudeDir?:string, home?:string, dryRun?:boolean, now?:Date, only?:string[]}} [opts]
 *   `claudeDir` defaults to $CLAUDE_HOME, else `<os.homedir()>/.claude`; `only` restricts to some USER_FILES.
 * @returns {{claudeDir:string, files:{path:string, outcome:"written"|"identical"|"backed-up+written"|"skipped-invalid", backup?:string}[]}}
 */
export function installUserLevel({ addonDir = HERE, claudeDir, home = homedir(), dryRun = false, now = new Date(), only } = {}) {
  const src = join(addonDir, "payload", "user");
  const target = claudeDir ?? process.env.CLAUDE_HOME ?? join(home, ".claude");
  const res = { claudeDir: target, files: [] };
  for (const name of USER_FILES) {
    if (only && !only.includes(name)) continue;
    const from = join(src, name);
    if (!existsSync(from)) continue; // a payload without a file simply skips it
    let text = renderUserFile(name, readFileSync(from, "utf8"), home);
    const dest = join(target, name);
    if (name === "settings.json" && existsSync(dest)) {
      let current;
      try { current = JSON.parse(readFileSync(dest, "utf8").replace(/^\uFEFF/, "")); } catch { current = null; }
      if (!isObj(current)) { res.files.push({ path: name, outcome: "skipped-invalid" }); continue; }
      const merged = mergeUserSettings(current, JSON.parse(text));
      merged.env = { ...USER_ENV_DEFAULTS, ...(isObj(merged.env) ? merged.env : {}) };
      if (JSON.stringify(merged) === JSON.stringify(current)) { res.files.push({ path: name, outcome: "identical" }); continue; }
      const backup = `${name}.bak-${stamp(now)}`;
      if (!dryRun) { copyFileSync(dest, join(target, backup)); writeFileSync(dest, JSON.stringify(merged, null, 2) + "\n", "utf8"); }
      res.files.push({ path: name, outcome: "backed-up+written", backup });
      continue;
    }
    if (name === "settings.json") text = JSON.stringify({ ...JSON.parse(text), env: { ...USER_ENV_DEFAULTS, ...(JSON.parse(text).env ?? {}) } }, null, 2) + "\n";
    if (!existsSync(dest)) {
      if (!dryRun) { mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text, "utf8"); }
      res.files.push({ path: name, outcome: "written" });
      continue;
    }
    const current = readFileSync(dest, "utf8");
    if (lf(current) === lf(text)) { res.files.push({ path: name, outcome: "identical" }); continue; }
    const backup = `${name}.bak-${stamp(now)}`;
    if (!dryRun) { copyFileSync(dest, join(target, backup)); writeFileSync(dest, text, "utf8"); }
    res.files.push({ path: name, outcome: "backed-up+written", backup });
  }
  return res;
}

// --- standalone CLI ---
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  if (args.includes("--user")) {
    const oi = args.indexOf("--only");
    const only = oi >= 0 && args[oi + 1] ? args[oi + 1].split(",") : undefined;
    const envOnly = args.includes("--env-only");
    const r = envOnly ? installUserEnv({ dryRun }) : installUserLevel({ dryRun, only });
    console.log(`[swanifly-claude-addon --user${envOnly ? " --env-only" : ""}]${dryRun ? " (dry-run)" : ""} ${r.claudeDir}`);
    for (const f of r.files) {
      const verb = { written: "write ", identical: "skip  ", "backed-up+written": "backup", "skipped-invalid": "SKIP  " }[f.outcome];
      console.log(`  ${verb} : ${f.path}${f.backup ? ` (previous -> ${f.backup})` : f.outcome === "identical" ? " (identical)" : f.outcome === "skipped-invalid" ? " (existing file is not valid JSON — left untouched)" : ""}`);
    }
    const n = (o) => r.files.filter((f) => f.outcome === o).length;
    console.log(`  summary : ${n("written")} written, ${n("backed-up+written")} backed up + written, ${n("identical")} identical, ${n("skipped-invalid")} skipped (invalid JSON)${dryRun ? " — nothing written" : ""}`);
    if (n("skipped-invalid")) {
      console.error(`  WARNING : ${n("skipped-invalid")} file(s) NOT fixed — the existing settings.json is not valid JSON. Repair it by hand, then re-run.`);
      process.exit(1);
    }
    process.exit(0);
  }
  const appRoot = args.find((a) => !a.startsWith("--"));
  if (!appRoot) {
    console.error("Usage: node install.mjs <appRoot> [--dry-run] [--force]");
    process.exit(1);
  }
  const r = installClaudeAddon({ appRoot, dryRun, force });
  console.log(`[swanifly-claude-addon]${dryRun ? " (dry-run)" : ""} ${appRoot}`);
  if (r.created.length) console.log("  created : " + r.created.join(", "));
  if (r.kept.length) console.log("  kept    : " + r.kept.join(", "));
  if (r.updated.length) console.log("  tooling : " + r.updated.length + " command/skill/hook/template paths refreshed");
  if (r.skipped.length) console.log("  skipped : " + r.skipped.join(", "));
  for (const [label, outcome] of Object.entries(r.sections)) {
    console.log(`  section : ${label} — ${outcome}`);
  }
  if (r.settingsSkipped) console.log("  settings: SKIPPED — existing .claude/settings.json is not valid JSON (left untouched)");
  else {
    console.log("  settings: " + (r.merged ? "no-mock hook merged" : "no-mock hook already present"));
    console.log("  settings: " + (r.hooksMerged.length ? "hooks merged — " + r.hooksMerged.join(", ") : "Stop/SessionEnd/SessionStart hooks already present"));
  }
}
