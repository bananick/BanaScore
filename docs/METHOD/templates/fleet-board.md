# Fleet board — the `/projects` contract (`fleet-board/1`)

**Owner:** Lucia (contract) · Hugo (builder)
**Version:** 337.a
**Purpose:** How the hub turns every chantier fiche on the machine into one snapshot, one static page and one desk artifact — discovery, fallback rules, the snapshot shape, the answer relay.

> Doctrine: `sprints-method.md` → "The chantier" (the fiche, the inbox rules of 322.g as amended by 337.a, "Finding the fiche").
> Fiche schema: `templates/chantier-status.schema.json` (optional board fields since 337.a). Ritual: `/projects` (hub only).
> Journey: `docs/project/journeys/nicolas-voit-la-flotte-en-30-secondes.md`.

**One source, two views.** `node scripts/build-projects.mjs` (hub) writes `docs/projects/snapshot.json` and the read-only
page `docs/projects/index.html`; `/projects` republishes the desk artifact from the same snapshot. Both outputs are
**generated and gitignored** (machine paths, rewritten on every run); the builder, its pure helpers and the page
template are committed. The board **reads** fiches and never writes one: the fiche's single writer stays its sub-session.

## 1. Discovery — which apps, which copy of each fiche

- **D1 · Apps.** Every direct child of the apps root (default `C:/Apps`, `--root <dir>`) holding a `.git` entry. No `.git` →
  `skipped` `not-git`.
- **D2 · One app per origin.** Group by normalised `remote.origin.url` (lowercase, `git@github.com:` → `https://github.com/`,
  no trailing `/` or `.git`); no origin → its own group, keyed by path.
- **D3 · The canonical root.** In a group, a child whose `.git` is a **file** is a worktree → `skipped` `worktree-of:<root>` (it
  is read through D4, never as an app). Among children whose `.git` is a **directory**: the one whose name equals the repo
  name of the origin (case-insensitive), else the alphabetically first; any other is `skipped` `clone-of:<root>` (its pushed
  branches are seen through the canonical's `origin/*` refs). The hub itself (`Bana-Share`) is not skipped; it simply has no fiche today.
- **D4 · Fiche keys.** The union of `docs/chantiers/<chantier>/<file>.json` (README and non-`.json` excluded) found in: the
  trunk (`git ls-tree -r --name-only <trunk> -- docs/chantiers`); the filesystem of every worktree of
  `git -C <root> worktree list --porcelain`; every local branch ahead of the trunk
  (`git log --format= --name-only <trunk>..<branch> -- docs/chantiers`). `<trunk>` = `origin/HEAD`'s target, else
  `origin/main`, else `main`. The builder does not fetch unless run with `--fetch` (`/projects` runs it with `--fetch`).
- **D5 · The copy, per "Finding the fiche".** Read any copy to learn the fiche's `branch`; then take, in order: the worktree
  holding that branch (filesystem, uncommitted included) → `git show <branch>:<path>` → `git show origin/<branch>:<path>`
  → the trunk (tried only when the fiche exists there). No readable copy in that chain → among the copies found, the newest `updatedAt`. The chosen copy's
  `source` = `{ path, from: "worktree" | "branch" | "trunk", at }` (`at` = the worktree path, or the ref read).
- **D6 · Apps shown.** An app with ≥ 1 fiche goes into `apps[]`; one with none into `skipped` `no-fiche`. A git failure on
  one app goes into `errors[]` and never stops the run.

## 2. Fallback rules — fiches without the 337.a fields (most of them today)

The builder implements these verbatim, in `scripts/lib/projects-board.mjs` (pure, unit-tested).

- **F1 · Never drop an invalid fiche.** On 2026-10-29, 21 of 84 fiches on this machine validate (older shapes: string
  `operatorActions`, off-enum statuses, long progress items). The builder runs `validateFiche`, records `valid`,
  `errorCount` and the first 3 messages on the slice, then reads every field **defensively**: a field of the wrong type is
  treated as absent. A file that is not JSON → no slice, one entry in that app's `errors[]`.
- **F2 · Rows.** `tasks[]` non-empty → one row per task, in array order, `derived: false`. Otherwise **one derived row per
  slice** (`derived: true`): `title` = fiche `title`, `short` = `slice`, `ref` = `head`, `url` = null, `waitsOn` = [],
  `movedAt` = `updatedAt`, and `step` from `state`:
  `planning` → 0 · `parked` → 0 with `blocked` = `"parked"` · `working` / `waiting` / `blocked` → 2 when `head` is
  non-null **and** `gate.tests` is `pass`, else 1 · `landed` → 3 · anything else → 0. Steps 4 and 5 (Déployé, Prouvé) are
  **never derived**: they need the sub-session's own `tasks[]`.
- **F3 · Blocked.** A task row keeps its `blocked`. A derived row of a `blocked` slice: the first open `operatorActions`
  item's `action`, else the first `progress.doing` item, else `"bloqué"`.
- **F4 · Cards — only `status === "open"` opens a card**; any other value, off-enum ones included (`decided`, `held`), is closed.
  - `decisions[]` item → **`decision`** card: `title` = `question`, `note` = `reco`, `blocking` = (`reversible !== true`),
    `deadline`. Options: objects → as they are; strings → `{ id: "o1", "o2"…, label: <the string> }`. `reco` (option id) =
    `recoId`; else the first string option whose text before ` — ` equals `reco`'s text before ` — `; else null (the card
    shows `reco` as text).
  - `operatorActions[]` item → **`geste`** card: `title` = `action`, `note` = `why`, `blocking` = true. A legacy **string**
    item → a `geste` card (`title` = the string, `legacy: true`) only while the slice is `waiting` or `blocked`.
  - `review[]` item with `needsOperator === true`, **or `needsOperator` absent** (pre-322.g: everything was asked) →
    **`recette`** card: `title` = `what`, `blocking` = false, `questions` = its `questions[]` (each `{q, options, reco}`),
    and `proof` = `{ urls, steps, notProven, minutes, evidence }` — `urls` (`[]` for a plan), `steps` = `script` split before
    each `N. ` (`/\s*(?=\b\d+\.\s)/`), `notProven` (null when absent), `minutes` (3 when absent), `evidence`.
  - **The kind is derived from the array, not stored**: a stored `kind` could disagree with where the item lives — two sources
    of truth for one fact.
  - **An empty `title`** (an `action`, `question` or `what` left empty) falls back to `<itemId> (sans titre dans la fiche)` — a card is never untitled.
  - Card `key` = `<appId>/<chantier>/<slice>/<itemId>` — the stable key of the desk's answer.
- **F5 · On the desk (`you`).** A card with a `task` attaches to that row; without one, to the slice's derived row, or to
  the slice's first non-`Prouvé` task row. A row is `you` while ≥ 1 open card is attached to it. A screen is `you` when
  its `verdict` is `talk`.
- **F6 · Freshness.** Per slice: `age` = `generatedAt − updatedAt`; `fresh` (< 24 h) · `aging` (24–72 h) · `old` (> 72 h) ·
  `unknown` (missing or unparseable). `stale: true` when `isStale(updatedAt, <last commit outside docs/chantiers on the
  branch, %ct>)` — the Stop hook's rule. Per row: `late: true` when `step < 5` and `now − movedAt > 48 h` (orange).
- **F7 · Next.** Slice `next` = fiche `next`, else the first `progress.doing` item, else the first `progress.todo`, else null.
  Project `next` = the `title` of its first card in desk order (F9), else the `next` of its first non-`landed` slice, else
  null.
- **F8 · Session and screens.** `session` = the fiche's `session` when it matches `SESSION_RE`, else null — never guessed
  from a title. `screens` = the fiche's `screens[]` when present; a project whose fiches declare none has `screens: []` and
  `screensDeclared: false`, and the page says so (explicit empty state).
- **F9 · Order.** Cards: `blocking` first and, **among blocking cards, `decision` before the other kinds (`geste`, `recette`)**; then the earliest `deadline`, then slice code.
  The desk groups cards by slice (§4): a block takes the place of its best card, cards keep this order inside it. Rows: slice code, then task order.
  Projects: open blocking cards ↓, open cards ↓, newest `updatedAt`. Apps: same keys, then name.
- **F10 · Desk scope (display only).** A card is `asleep: true` when its slice's `state` is `landed` or `parked` (every card),
  or the slice's `ageSeconds` is > 7 days (604 800 s) **and the card is not `blocking`** — a blocking card never sleeps for
  age alone; else `asleep: false`. `asleepWhy` = `"landed"` · `"parked"` · `"old"` (the first
  that applies, in that order; `null` when awake). Only awake cards count: `you` (F5), the project and app counters
  (`decision`/`geste`/`recette`/`blocking`, `counts.open`) and the F9 ranking all ignore asleep ones, and `asleepCards` is
  counted beside them (project, app, summary). Nothing is deleted: asleep cards stay in `cards[]`, keep their key and stay
  answerable — the page shows them in a collapsed "En sommeil" block under the desk, by app. Order among awake cards is F9.

## 3. The snapshot — `docs/projects/snapshot.json`, schema `fleet-board/1`

Every element carries `source` (D5) and `updatedAt` (the fiche's), so each figure traces to a file.

```json
{
  "schema": "fleet-board/1",
  "generatedAt": "<ISO, real clock>",
  "root": "C:/Apps",
  "apps": [{
    "id": "<lowercase canonical dir name>", "name": "<canonical dir name>", "root": "<abs path>",
    "origin": "<normalised URL>", "trunk": "<ref>", "worktrees": ["<abs path>"],
    "updatedAt": "<max of its slices>",
    "counts": { "slices": 0, "rows": 0, "decision": 0, "geste": 0, "recette": 0, "blocking": 0, "asleepCards": 0, "stale": 0, "invalid": 0 },
    "projects": [{
      "id": "<appId>/<chantier>", "chantier": "<slug>", "label": "<README H1, else the slug>", "next": "<F7 | null>",
      "updatedAt": "<max>", "screensDeclared": false,
      "counts": { "open": 0, "blocking": 0, "asleepCards": 0 },
      "slices": [{
        "slice": "S1", "title": "", "agent": "", "branch": "", "journey": "", "state": "", "head": null,
        "gate": {}, "session": null, "next": null, "freshness": "fresh", "stale": false,
        "valid": true, "errorCount": 0, "errors": [], "source": {}, "updatedAt": ""
      }],
      "rows": [{
        "id": "<appId>/<chantier>/<slice>/<taskId | '_'>", "slice": "S1", "title": "", "short": "",
        "step": 0, "stepLabel": "À faire", "waitsOn": ["<row id>"], "movedAt": "", "late": false,
        "ref": null, "url": null, "blocked": null, "you": false, "derived": true, "source": {}, "updatedAt": ""
      }],
      "cards": [{
        "key": "<appId>/<chantier>/<slice>/<itemId>", "kind": "decision | geste | recette", "slice": "S1",
        "itemId": "d1", "row": "<row id>", "title": "", "note": "", "options": [{ "id": "", "label": "", "why": null }],
        "reco": null, "blocking": true, "asleep": false, "asleepWhy": null, "deadline": null, "questions": [], "proof": null, "legacy": false,
        "status": "open", "answer": null, "answeredAt": null, "answeredVia": null, "source": {}, "updatedAt": ""
      }],
      "screens": [{ "group": "", "code": "", "title": "", "step": 0, "verdict": "keep", "vnote": null, "note": null,
                    "slice": "S1", "you": false, "source": {}, "updatedAt": "" }]
    }]
  }],
  "skipped": [{ "dir": "<abs path>", "reason": "not-git | no-fiche | worktree-of:<root> | clone-of:<root>" }],
  "errors": [{ "app": "<id | dir>", "message": "" }]
}
```

`cards[]` lists the **open** items only (the desk); the page counts closed ones from the fiches when it needs a history.
No figure is invented: an unknown value is `null` and the page prints `inconnu`.

## 4. The desk and the relay — answers go back through the sub-session

- **The page** opens on **Flotte** (tabs: Flotte · À toi · Par écran · Journal): one line per app — blocking / open / asleep
  counts, the `next` of its top project, its single top card in compact form with a « Répondre » button that jumps to the
  card — then « Tout le bureau (N) ». **À toi** shows one block per slice (app · project · slice, slice `next`, session
  link): its first card in full, the others folded as « +N gestes / +N décisions ». Drill-down (app → project → matrix) stays.
- **The artifact db** keeps, per card `key`: `{ choice, done, note, at }` (`at` = the click, ISO) and `relayed`, `relayedAt`.
  It never writes a fiche. **An answer changed after a relay is a new answer**: the page sets `relayed: false` and drops
  `relayedAt` / `sentAt` on every non-quiet write, so it is relayed again.
- **Unrelayed** = `!relayedAt || relayedAt < at` — the page's `needsSend` test (which also counts `sentAt`, the page's own
  « envoyé »). The `/projects` session relays exactly the unrelayed answers.
- **« Envoyer »** (`comments.sendToClaude`) hands the unrelayed answers to the `/projects` session, which sends **one typed
  message per answer** — the 322.e grammar plus its origin: `DECISION d2 = B (« <option label> ») — note · via board` ·
  `ACTION a1 = done · via board` (or `not-yet`) · `REVIEW r1 = accept (« Accepter ») — note · via board`. The option label
  (≤ ~80 chars, truncated with `…`) is always sent beside the id: a decision with string options has only a synthetic id
  (`o2`), so **the sub-session matches on the label**. Address: the slice's sub-session by its `ListAgents` name (found from
  `list_sessions`: the session whose id equals the fiche's `session`, else the one in group `{app} · {chantier}` whose title
  starts with the slice code); none alive → the chantier's supervisor, which routes it like any operator answer; neither →
  the answer stays unrelayed and `/projects` names it in its report. Then it sets `relayed` / `relayedAt`.
- **The sub-session records it** (single writer): `status`, `answer`, `answeredAt` (real clock), `answeredVia: "board"` — or
  `"chat"` for an answer from the supervisor chat, `"deadline"` for a `defaulted` one.
- **Card states on the desk**, from the db and the snapshot: no db answer → `à toi`; db answer, not relayed → `à envoyer`;
  relayed, fiche item still open → `envoyé`; **`relayé`** when the fiche item's `answeredAt` ≥ the click's `at` — or, for a fiche
  without `answeredAt`, when the item is no longer `open` and the fiche's `updatedAt` ≥ `at`. A card answered in chat
  (closed in the fiche, no db answer) leaves the desk. The fiche is the truth: the desk shows `relayé` only when the fiche says so.

## 5. The fields a sub-session adds on its next write (all optional — `chantier-status/1`, 337.a)

`session` (routed by the supervisor at adoption: `SESSION = local_…`) · `next` (≤ 120) · `tasks[]` `{id, title, short?, step 0–5,
waitsOn?, movedAt, ref?, url?, blocked?}` · `screens[]` `{group?, code, title, step, verdict keep|align|evolve|talk, vnote?,
note?, task?}` · on `decisions[]`: options as `{id, label, why?}` + `recoId` · on every inbox item: `task`, `answeredAt`,
`answeredVia` · on `review[]`: `minutes`. `movedAt` changes only when `step` changes.
