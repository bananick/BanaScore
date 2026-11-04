# TONE-VOICE-TEMPLATE — one file per voice

**Owner:** Lise  
**Version:** 336.c  
**Last Updated:** 2026-10-29  
**Purpose:** The skeleton of `docs/project/brand/tone/{voice}.md` — copy it, fill it by quiz, never ship it with the braces

> Copy to `docs/project/brand/tone/{voice}.md`. Method: `docs/METHOD/tone-method.md` → "§ 2. Framing a voice".
> Delete this note and every `{…}` hint. A block that does not apply is deleted, not left empty.
> Write the file in the language of the voice (a bilingual voice repeats *Address* and *Lexicon* per language).

---

# Voice — {name}

**Voice:** {id, lowercase — the file name}  
**Speaks for:** {a brand, a product, or a person who signs}  
**Extends:** hub `_family.md` {+ this repo's `_common.md`} · precedence channel > brand > signer > family  
**Home:** {this repo} · *Mirror of: {repo}@v{n}* (only if the home is elsewhere)  
**Version:** {0 while a draft, 1 once the operator ratifies} · **Last reconciled:** {YYYY-MM-DD}  
**Owners of claims:** prices → {person or grid} · guarantees → {…} · legal → {…}  
**Status legend:** **V** validated by the operator · **D** derived from a V · **P** proposed, to ratify  
**Checks:** {default three (reader · positive · rule) | replaced by … | none}  
**Loop thresholds:** defaults of `tone-method.md` § 4 {or list the overrides}

## Identity
{One sentence, a role image: "the … who …". Not a list of adjectives.}

## Attributes
{Four pairs, "A, but not B".}
- {…, but not …}

## Rhythm
- **Energy:** {…} · **Humour:** {dose, e.g. "one touch per page"} · **Exclamation:** {limit}
- **Sentence:** {target} words, {ceiling} at most
- **Proof:** {what backs a promise in this voice}

## Address
| Channel | Person | Tu / vous |
|:--|:--|:--|
| {site, catalogue, quote, mail, social, print, video…} | {I / we / third} | {…} |

{Who "we" is, whether "on" is allowed, and the one thing that is never mixed on a page.}

## Lexicon
- **Love:** {word — decision or reason}
- **Ban:** {word — reason} · **Kept by decision:** {word — D-n}

## Situations
{Only those that apply: announcing a price · saying no · a delay or error · a payment chase · a limit of scope ·
a client reference · health or regulated claims · a competitor. One stock formula each, braces to fill.}

## Signers
{Brand files only — delete in a person's file. One row per person who signs under this brand; the signer's
own file stays constant. `tone-method.md` § 1 → "The three layers".}
| Signer | What the brand mutes / allows | Status | Source |
|:--|:--|:--|:--|
| {voice id} | {e.g. "no humour in a public study; *nous* = the brand only in the declaration of interests"} | **P** | {D-n or log id} |

## Before → after
| Status | Before | After | Source |
|:--|:--|:--|:--|
| **V** | {real sentence} | {rewrite} | {D-n or log id} |

## Patterns
*A test may forbid a word, never demand a sentence. Patterns run in `Grep` (ripgrep syntax): no lookaround,
and `\b` is already Unicode-aware there, so accented words work. Escape `|` as `\|` inside this table.*
| # | Pattern | Regex or list | Severity (`blocking` · `review`) | Known exception |
|:--|:--|:--|:--|:--|
| P1 | {name} | {…} | {…} | {…} |

## Open points
- {question not yet ruled — who decides}

## Decisions
| Id | Date | Decision | Status | Source (log id or quiz) |
|:--|:--|:--|:--|:--|
| D-1 | {date} | {what was ruled} | **V** | {…} |
