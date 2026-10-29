# Tone Method

**Owner:** Lise  
**Version:** 326.a  
**Last Updated:** 2026-10-19  
**Purpose:** How a brand voice is framed, reviewed and kept alive — one voice file per brand persona, hosted in each repo

---

## 0. The idea

A **voice** is the written tone of one *speaker*: a brand, a product, or a person who signs. A voice that
nobody can state, test and amend drifts — one author at a time. This method makes each verb mechanical:

| Verb | By | Where |
|:--|:--|:--|
| **Frame** it | the operator, by quiz, from real texts | the voice file (§ 2) |
| **Review** against it | `lise` (`.claude/agents/lise.md`) | a verdict and a rewrite table (§ 3) |
| **Evolve** it | `lise` proposes, the operator ratifies | the ledger `LOG.md` (§ 4) |

**Vocabulary.** *Voice* = who speaks. `SOUL.md` *personas* (Admin, Sales, Partner, Organizer) = who
reads. A reader persona can hear several voices; a voice speaks to several readers. Never mix the two words.

**The hub ships the mechanism; each repo hosts the content.** This file, the two templates and Lise travel
by the sync. The voices themselves are app-owned and never synced.

## 1. Where things live (in every repo that publishes in a voice)

| Path | What | Owner |
|:--|:--|:--|
| `docs/project/brand/tone/{voice}.md` | **one file per voice** the repo publishes in — from `templates/TONE-VOICE-TEMPLATE.md` | the app |
| `docs/project/brand/tone/_common.md` | optional — what all the repo's voices share (default checks, shared situations) | the app |
| `docs/project/brand/tone/LOG.md` | the loop's ledger, **one per repo**, append-only — from `templates/TONE-LOG-TEMPLATE.md` | Lise appends |
| `docs/project/brand/tone/LOG-archive.md` | rows moved out of `LOG.md` (§ 4), never read whole | Lise |

- **A voice used by two repos** (a founder who signs for two brands) is hosted in **both**: each file's
  `Home:` line names the repo whose copy wins; the other carries `Mirror of: {repo}@v{n}`. Lise reports a
  version gap; she never merges two copies.
- **No voice file yet?** Lise says so, uses `SOUL.md` § Voice as the floor, and drafts a `v0` — every line
  marked `P` — for the operator to ratify. She does not review against a rule nobody wrote.
- `SOUL.md` § Voice stays the repo's one-paragraph summary; add one line pointing here. The voice file
  supersedes it wherever they differ.

## 2. Framing a voice

### Voice vs tone
The **voice** is constant — who is speaking. The **tone** moves with the channel and the moment. In a
voice file, *Identity* and *Attributes* are the voice; *Address* and *Situations* are the tone.

### The four dimensions (general reference)
Place the voice on each axis before writing anything — the Nielsen Norman Group's four dimensions of tone
(Moran, 2016): **funny ↔ serious · formal ↔ casual · respectful ↔ irreverent · enthusiastic ↔
matter-of-fact**. Two voices that differ on no axis are one voice. The file records the position as *words and a
dose* ("one touch of humour per page"), not as a slider.

### Procedure — from nothing to `v1`
1. **Gather evidence.** What is actually published and sent: ≥ 20 real texts per channel, plus 5–10 external
   references. Anonymise every client (Iris owns the rule). *Bias to what the speaker already does well.*
2. **Name the identity as a role image,** one sentence: "the host who planned everything and lets you enjoy
   the party". Not a list of adjectives.
3. **Fix the axes by quiz** (the operator's grammar: ≤ 4 questions, recommended first, one consequence each):
   who speaks (*I* / *we*), *tu* / *vous* per channel, energy and humour dose, claims and guarantees.
4. **Test with three exercises:** pick the best of three versions of a real sentence; rewrite one of your own
   in your words; keep / drop / "depends on the brand" on ten real words. The answers *are* the first decisions.
5. **Write `v1`,** every line marked **V** (validated by the operator) · **D** (derived from a V) ·
   **P** (proposed). The operator ratifies; `P` lines stay `P` until he does.

### Rules of the frame
- **Attributes come in pairs: "A, but not B".** The pair draws the boundary a single adjective cannot.
- **Bilingual repos** state the voice per language. French is judged on its own terms (idiom, typography,
  *tu*/*vous*), never through a literal reading of English; EN and FR carry the same meaning and register,
  not the same word order.
- **Claims are owned.** The file names who owns prices, guarantees and legal text (a person or a grid);
  Lise refers them, never rewrites them.
- **A test may forbid a word, never demand a sentence.** No pattern requires a disclaimer ("we do not…") —
  that would reintroduce the defensive tone the voice may be trying to leave.

### Default checks (opt in, amend, or replace in `_common.md`)
Three tests proven in the 2026-10 tone study of three voices, for any voice that wants to be *reassuring
rather than defensive*. A voice opts in with a `Checks:` line in its header (`default three`,
`replaced by {…}`, or `none`); with no such line Lise applies none and says so.
1. **Reader test** — does the sentence teach the reader something useful? If it only covers the writer, it goes.
2. **Positive test** — strip every negation: is a promise left? If not, rewrite in the positive.
3. **Rule test** — does it state an internal rule (quota, condition, precaution)? It belongs in the quote,
   the scoping call or the conversation — not on the shop window. *Exception:* a safety, health or legal
   notice the claim owner requires stays where it is required.

## 3. Review — what Lise returns

**Inputs:** the text · the channel · the voice (deduced from the path and **said**, else she reviews for
both candidate voices) · the voice file, `_common.md`, the last 20 rows of `LOG.md` · a pattern report if one ran.

**Output (fixed):**
```
Verdict: OK | REVIEW | BLOCKING — n points   ·   Voice: {voice} v{n}   ·   Channel: {channel}
| # | Where | Before | After | Rule or procedure | Severity |
Referrals: facts → gordon · price / guarantee / legal → {owner named in the voice file} · client name / personal data → kasper · a choice of voice → the operator
Coaching: one sentence — the single rule most worth remembering for this author
Log: LOG.md row {id} appended    ·    Pass due: yes|no ({n} rows, {d} days since the last pass)
```
- **Every point has an *After*.** A point without a rewrite is not a point.
- **Cite the rule** by section and, where it has one, its id (`D-2`, `P1`). **A point rests on at least one V
  or D rule or a pattern**; a point resting only on **P** lines is `review` at most and says so.
- **Severity:** `blocking` = a `blocking` pattern is hit, or a V / D rule that is a prohibition or a hard
  requirement (a ban, a "never", a naming rule, a stated limit) is broken. `review` = a register or style
  judgement, a `P` line, anything else.
- **Verdict:** `OK` = no point · `REVIEW` = at least one point, none blocking · `BLOCKING` = at least one
  blocking point. Lise is not a gate (§ 6): `BLOCKING` means *hold this text until the author fixes it or the
  operator rules* — the coordinator holds it; nothing mechanical does.
- **EN/FR parity** — a missing twin, a meaning gap — is a referral to `gordon` (through `brand-voice-check`
  where the repo has that skill), not a point. Lise judges the tone of each language on its own terms.
- **The After is in the language of the row,** inside the voice asked for (a warm voice's rewrite never
  borrows the sobriety of a sober one, nor the reverse), and respects the voice's sentence ceiling.
- **Invent nothing:** no client name, no figure, no testimonial, no capability the product cannot back. A figure
  with no source is flagged, never replaced by another.
- **Lise never edits the reviewed file.** She writes only under `docs/project/brand/tone/`.
- **Cost discipline:** one text per call (up to 10 short strings of one voice and channel count as one),
  the voice file in context, ≤ 10 tool calls, opus. Mechanical checks
  belong to a script; she counts pattern hits with `Grep` on the text under review — **never on the whole
  repo** (a guard that ran on old text once turned a trunk red).
- **Two rounds on one text,** then the operator decides — the same cap as every review loop.

## 4. The loop — a voice is used, challenged, enriched, ratified

Every Lise run leaves one row in `LOG.md`; real use produces the rest. The log is the only memory the
loop has, so a row is written or the event did not happen.

### Event types (one row each: `id · date · type · voice · channel · ref · note · by`)

| Type | Written when | `note` holds |
|:--|:--|:--|
| `review` | Lise reviewed a text | verdict, rule ids hit, text reference (path:key — never client text) |
| `challenge` | an author or the operator disputes a rule or a rewrite | the reason, in their words; outcome `upheld` · `overruled` · `open` |
| `enrich` | something new worked in real use: a phrasing, a word, a situation formula, a pattern | the item and where it came from; the operator's approval if any |
| `drift` | Lise sees the voice slip: two channels diverging, a *tu*/*vous* mix, examples no longer matching live copy | what, on which sample (path list, count) |
| `proposal` | Lise proposes an amendment to a voice file | the exact before / after of the line, evidence ids, effect on existing text |
| `decision` | the operator answers a proposal | accept · reject · defer, and the date |
| `pass` | an evolution pass ran | rows processed, proposals made |

**Who writes what.** Lise writes `review`, `drift`, `proposal`, `decision` and `pass`. The rest comes from
real use and is appended the moment it happens — by Lise when she is handed it, or by the coordinator: a
rewrite the author refuses, with their reason, or an operator ruling → `challenge`; a phrasing that worked
and was approved → `enrich`. Rows are never edited, so a challenge's outcome is a **new** `challenge` row
whose `ref` is the first row's id.

### The triggers (defaults; a voice file may override them in its header)

| # | Signal | Lise proposes |
|:--|:--|:--|
| T1 | the same rule `challenged` ≥ 2 times on different texts, or `overruled` once by the operator | amend the rule, or add a named exception |
| T2 | the same pattern hit ≥ 3 times across ≥ 2 reviewed texts | harden it: a pattern, a lexicon entry, a situation formula — or a note for the author's brief |
| T3 | a pattern, or a **P** / **D** line, with no hit in the last 15 `review` rows (never a **V** decision) | **retire** it (marked retired, dated, with the reason — never deleted) |
| T4 | an `enrich` row approved by the operator | add it as an exemplar (status **V**) or a lexicon entry |
| T5 | ≥ 2 `drift` rows on the same voice and channel | clarify the rule, or split the channel |
| T6 | two voices of the repo give opposite rules for a shared channel | reconcile in `_common.md` |

### The pass
A pass is **due** at ≥ 10 rows since the last `pass` row (every row after it counts, the review's own
included), or ≥ 30 days and ≥ 1 row — Lise states
`Pass due: yes|no` at the end of **every** report; that line is the reminder, and the coordinator relays it.
1. Read `LOG.md` since the last `pass` row, plus the last 15 `review` rows for T3 (≤ 15 tool calls for the whole pass).
2. Apply the triggers. **Five proposals at most** — the operator's attention is the scarce resource.
3. For a new or changed pattern (ripgrep syntax — see the template), test it with `Grep` on the *current* strings and quote the baseline hit count
   in the proposal; a pattern that would flag live text is introduced as `review`, not `blocking`.
4. Write one `proposal` row each and hand the coordinator a quiz brief: per proposal, *accept · reject · defer*
   with one line on its effect. The coordinator asks it as one `AskUserQuestion` (≤ 4 per batch).
5. On the answers — and only then — Lise writes the `decision` rows and applies what was accepted: voice file
   `Version` +1, a dated row in its *Decisions* table (status **V**), the line itself changed. Nothing else moves.
6. Write the `pass` row.

### Guard rails
- **She proposes; the operator ratifies.** No rule, word, pattern or exemplar changes on Lise's evidence alone.
- **No evidence, no proposal:** each cites ≥ 2 log ids (T4: the approval, 1). A proposal with a missing id is void.
- **A validated (V) decision is the operator's.** A `challenge` against one is logged and surfaced; Lise never
  applies it. A decision such as "this word stays" cannot be undone by accumulated friction.
- **Severity only goes down by the operator's hand.** Lise may propose raising a `review` to `blocking`.
- **No client text in the log.** Anonymised excerpts of ≤ 15 words, or a path and a key. Names and personal
  data go to `kasper` for consent, `iris` for anonymisation.
- **The log stays small.** Rows are never edited or deleted; the one exception is the move: past 200 rows,
  rows older than the last two `pass` rows move verbatim to `LOG-archive.md` — the pattern of the version history.

## 5. Putting a voice into a repo (install)
1. Copy `templates/TONE-VOICE-TEMPLATE.md` to `docs/project/brand/tone/{voice}.md` and `TONE-LOG-TEMPLATE.md`
   to `LOG.md`. Copy each file once per voice; one `LOG.md` per repo.
2. Frame the voice (§ 2). If a charter already exists elsewhere, it is the evidence for step 1, not a shortcut
   past the quiz.
3. Add one line to `SOUL.md` § Voice: *Voices: `docs/project/brand/tone/`.*
4. From then on, text a customer, prospect or the public will read passes through `lise` before it lands
   (`CLAUDE.md` → "Agent Cohort"). `gordon` writes the copy; `lise` reads it.

## 6. What this does not do
- It is not a fact-checker, a legal reviewer or a visual reviewer (`nova` owns the page; Lise reads the strings).
- It is not a gate. A pattern script and a `/land` step are a separate release; until then the loop is judgement
  plus `Grep`.
- It does not cover the oral register (stage, workshops) unless a voice file adds a block for it.
- It never fabricates: no mock reference, no invented figure, no stand-in client — `SOUL.md` non-negotiable 1.
