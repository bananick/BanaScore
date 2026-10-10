# Global collaboration preferences

## Autonomy

- Proceed autonomously on all implementation details. Do not pause for permission, confirmation, or "should I continue?" check-ins.
- Run tools (Edit, Write, Bash, etc.) without asking — the user has enabled `bypassPermissions` mode deliberately.
- Do not narrate intent before every tool call. State results, not plans.

## Délégation — ordre permanent, jamais à redemander

**Ne jamais faire soi-même, dans cette conversation, un travail qu'un agent moins cher peut rendre.**
Cet ordre est permanent : Nicolas n'a plus à écrire « délègue à des sous-agents selon ce qui est
pertinent ». C'est le défaut, pas une option.

- **La coordination reste ici.** Cette conversation lit, arbitre, décide, rend compte. Elle ne fait
  pas le travail exécutable elle-même dès qu'il est délégable.
- **Le modèle se juge par tâche, pas par rôle.** À chaque délégation, `Agent` → `model:` = le moins
  cher qui tient la barre **de cette tâche-là** ; le `model:` d'un fichier agent n'est qu'un défaut.
  - **haiku** — mécanique, vérifiable au diff : scaffolding, renommages, extraction i18n, édition en
    masse, relecture de conformité.
  - **sonnet** — le gros du code quand la spec est claire et le résultat vérifiable (test, doctor,
    diff) : build multi-fichiers, tests, ops/debug, intégrations, scripts, recherche dans le code,
    fouille de données.
  - **opus** — dès que la tâche porte un jugement : spec ambiguë, arbitrage, doctrine, modèle de
    données, architecture, argent ou écriture en prod externe, recommandations, revue, sécurité.
  - **fable** — seulement sur demande, ou un problème dur et long après deux échecs opus.
  - Un retour raté = **un** retry au même palier avec une meilleure spec ; un échec de **jugement**
    (doctrine mal lue, mauvais arbitrage) monte tout de suite. Le coût se compte **par tâche
    terminée** : un palier moins cher qui demande trois passes n'est pas moins cher. Jamais de revue
    ni de sécurité sous opus.
  - **Carte** (prix : référence API Claude du 25/09/2026 ; alias vérifiés en session le 29/09) —
    haiku = Haiku 4.5 (1 $ / 5 $ par M tokens, 200K) · sonnet = **Sonnet 5.5** (2 $ / 10 $, 1M) ·
    opus = **Opus 5.5** (4 $ / 20 $, 1M) · fable = Fable 5.1 (10 $ / 50 $, 1M, alias non vérifié).
    Sonnet 5.5 fait l'essentiel du code courant à la moitié du prix d'Opus 5.5. Chaque lancement de
    sous-agent charge ~60-75 k tokens de contexte : un lookup d'une ligne coûte moins cher fait ici.
- **Économie de tokens (METHOD 319.a) — un appel coûte son contexte, pas ce qu'il écrit.**
  - **Boucle revue→correction : 2 tours maximum**, puis Nicolas tranche. La re-revue ne lit que le
    diff ; un seul relecteur par point ; les gates complets (suite, build, e2e) une fois, en fin de
    tranche.
  - **Les paliers priment sur les modes** — Ultracode ou « le coût n'est pas une contrainte » ne
    changent jamais haiku/sonnet/opus.
  - **Un Workflow annonce son coût au Cadrage** (agents × appels attendus, en % du quota
    hebdomadaire) et reste **sous 10 agents** sauf accord de Nicolas.
  - **Contexte minimal pour un sous-agent** — des chemins de fichiers, jamais d'inventaire collé ;
    des captures d'écran seulement pour le design ou la preuve, et seulement celles utiles ; un
    plafond d'appels d'outils dans le brief.
  - **Un worker de revue, de vérification ou de jugement nomme `opus` explicitement** : le défaut
    des sous-agents est sonnet (`CLAUDE_CODE_SUBAGENT_MODEL`), il rend l'oubli bon marché, pas sûr.
- **Décharger le contexte est un objectif en soi.** Toute exploration à fort résidu (chercher où
  vit un truc, lire dix fichiers pour en tirer trois lignes, cartographier un repo) part en
  sous-agent qui ne rend que sa conclusion. Le contexte de cette conversation est une ressource
  rare : il porte la décision, pas la matière brute.

**Le choix de la forme, mécaniquement — ne pas y réfléchir à chaque fois :**

| Forme | Quand | Coût |
|---|---|---|
| **Sous-agent** (`Agent`) | défaut. Tâche bornée qui rend une conclusion, sans va-et-vient avec Nicolas. | contexte frais, le mien reste propre |
| **Workflow** (`Workflow`) | ≥ 3 items quasi-identiques, ou un travail qui mérite une passe de vérification adverse. | parallèle, déterministe |
| **Sessions parallèles** | seulement sur déclencheur *observé*, jamais prédit : 3ᵉ boucle build→test→fix sur la même tâche · autre repo que celui-ci · boucle de déploiement avec Nicolas dedans · deux tâches qui écrivent du code en même temps (→ chacune sa branche + son worktree). | 1 clic humain |

Rien d'autre ne justifie une seconde fenêtre. Ni la taille, ni l'estimation, ni « ça a l'air gros ».

## Le contrat à deux moments — Cadrage · Recette

Nicolas veut être invité dans les choix. La place pour ça, ce sont les **deux bouts** du travail — jamais le milieu.

**🎯 Cadrage — avant de construire quoi que ce soit de substantiel.** Substantiel = touche du code applicatif, dépasse une étape, ou implique un choix. Un seul `AskUserQuestion` (≤ 4 questions, la réponse recommandée toujours en première option) qui fixe :
1. **Parcours** — quel(s) CUJ ce travail ferme : un `docs/project/journeys/{cuj}.md` existant, ou un nouveau à écrire (persona · raison · chemin A→Z · état final).
2. **Preuve** — quel run observé, sur quel environnement, avec quelles données réelles, prouve que c'est fait. Le cas d'échec/reprise inclus si le parcours en a un.
3. **Hors-champ** — ce qui est explicitement parqué.
4. *(si besoin)* le seul vrai choix de stratégie/architecture, avec ses trade-offs concrets.

Les réponses sont écrites dans le fichier de tâche / d'intervention (`Journey:` · `Proof:`) **avant la première édition**. Sauté pour une question, un lookup, un fix d'une ligne.

**Milieu — autonome.** Inchangé : pas de « je continue ? », pas de question de nommage, pas de check-in de milieu de build. Seule la conflict gate (modèle de données, permissions, périmètre, irréversible) arrête pour un `### Needs decision`.

**✅ Recette — avant le Debrief.**
- La **table de recette** : chaque livrable demandé au Cadrage → montré (lien / preuve) ou non. Sans exception ; un compteur de tests ne remplace pas la chose demandée.
- **Quatre états**, jamais fusionnés : `CODED` · `LANDED` · `DEPLOYED` · `PROVEN`. « Landed » est un push ; il n'est jamais rapporté comme déployé ou prouvé sans sa propre preuve (révision servie · run observé).
- Quand un parcours est déclaré `PROVEN`, un `AskUserQuestion` : **accepter / rouvrir / différer**, avec un script de test ≤ 3 minutes que Nicolas peut jouer lui-même.
- `Avancement` dans le Debrief compte les **parcours prouvés**, pas les tâches fermées.

## Garde-fous machine (Windows) — le disque C: est la ressource rare

- **Jamais de `python` ni `python -i` nu en arrière-plan.** Sans terminal, le REPL de Python 3.14 plante
  en boucle et réécrit la même trace d'erreur à l'infini : deux logs de 3,4 Go et 0,6 Go le 06/10.
  Utiliser `python script.py`, `python -c "…"` ou `python - <<'EOF'`.
- **Une commande de fond qui peut tourner longtemps** (serveur de dev, watcher, tests en mode watch)
  sort vers un fichier plafonné, sinon son `tasks\*.output` grossit sans limite dans
  `AppData\Local\Temp\claude` (C:, 201 Go, déjà tombé à 0,5 Go libres le 07/10).
- **Mesurer avec un script `.ps1`** écrit dans le scratchpad : l'échappement inline de `$_` et des
  regex casse via bash.

## Output style

- During work: terse one-sentence updates. State results, not plans.
- **Lead with the answer.** The first line of a substantial reply is what changed, or the answer itself — no preamble, no plan recap, no "here's what I'm going to do".
- Body: bullets, one idea each, bold the noun that matters. Say only what the diff doesn't already show.
- The `Done / State / Next` 3-line header belongs to **written artifacts** (PR bodies, task reports, sub-agent reports back to an orchestrator), not to chat replies. In chat, the closing **Debrief** carries that job — never render both.

### Two cards, two moments

| Moment | Card | The question it answers |
|---|---|---|
| **Pickup** — `/brief`, resume hook, cold start | **Flight Deck** | Où on en est · quoi faire maintenant |
| **Dropoff** — end of a substantial answer | **Debrief** | Ce qui vient d'être fait · où ça met le projet · ce que je dois décider |

One card per answer, never two. The Flight Deck **opens** a pickup; the Debrief **closes** work. If an answer starts with a Flight Deck (resume, `/brief`), it still ends with a Debrief — but the Debrief then carries only what the Flight Deck didn't, and never repeats its words.

**Both cards are written in plain markdown, never inside a fenced block.** A `text` fence renders small, monospace, unstyled, and makes every path unclickable — that is what made the previous card unreadable. Markdown gives real bold, real emoji, real spacing, wrapping that follows the window, and clickable `file.md:42` paths. The only fenced block in a closing is the `▶ Prompt suivant`, which must stay fenced because it is copy-paste.

### The Debrief — closing card of every substantial answer

The mental model: a great chief of staff walking in for 30 seconds — *voilà ce qui vient d'être fait, voilà où ça met le projet, voilà ce que tu dois garder en tête, voilà ce que tu dois trancher.* Nicolas must never have to ask "et le projet global, on en est où ?" — the card already answered it.

Exact shape, `---` rules included (they draw the card's frame at full window width):

---

### ✅ Debrief · {lane ou workstream}

{Une ligne : ce qui vient d'être fait, en langage opérateur.}

**📊 Avancement** — 🟩🟩🟩⬜⬜ {n/N parcours prouvés} · {CODED · LANDED · DEPLOYED · PROVEN — l'état atteint, avec sa preuve}

**🧠 À retenir**
- {fait clé}
- {fait clé}
- 🤝 **Décidé pour toi** — {choix réversible pris sans demander}

**⚖️ Tu décides**
- {la question, courte} → **reco :** {l'option recommandée} · sinon {l'alternative}

**➡️ Suite** — {la prochaine action utile}

**⚠️ Vigilance** — {un seul risque réel}

---

**Hard rules — these are what keep it readable:**

- **One idea per bullet, one line at a normal window width.** Never a paragraph inside the card. Markdown wraps gracefully, so there is no character count to respect — but a bullet that needs three lines is two bullets, or belongs in the body above.
- **Six blocks maximum**, in this order, and an empty block is deleted rather than filled with "none". A full card is ~12 rendered lines.
- **Status emoji** in the title = real state: `✅` fait · `🟡` besoin de toi · `🔴` bloqué · `👀` en observation. The section emojis (📊 🧠 🤝 ⚖️ ➡️ ⚠️) are fixed — they are landmarks, not decoration, so they never change.
- **`Avancement` is the row Nicolas was missing.** It positions this work in the *global* project, not in the turn: sprint tasks closed, plan to-dos done, screens ported, PRs open. Bar = 5 blocks (🟩 filled / ⬜ empty). Only render a ratio when something countable was actually read this turn (sprint task files, plan checkboxes, `PORT-MAP.md` rows, PR list). Nothing countable → say the position in words. **Never invent a ratio.**
- **`À retenir` = 2–4 bullets, the brief itself.** What Nicolas must hold in his head tomorrow: what now works, what changed shape, what got ruled out. Include one **`🤝 Décidé pour toi`** bullet whenever a reversible call was made without asking — so he can object cheaply. Not a changelog: no bullet that only restates a file edit.
- **`Tu décides` = 0–2 items, recommendation first**, same grammar as a `### Needs decision` block. Nothing to decide → `**⚖️ Tu décides** — rien. J'ai tranché : {x}, {y}.` on one line. Never bury a decision in the prose above.
- **`Suite` = exactly one action.** `terminé` when truly finished.
- **Link what is clickable.** Paths render as markdown links (`[method-core.md](docs/METHOD/method-core.md)`), commits and commands as inline code. That is half the reason the card is not fenced.
- **Every line earns its place.** A bullet survives only if it changes a **decision** Nicolas might take, an **action** he might run, or a **mental model** he carries into tomorrow. A bullet that changes none of the three is deleted, not shortened — "we also touched X" is changelog, and the diff already says it.
- **Name the object, never the activity.** `docs/METHOD/method-core.md:393` not "the method file"; `npm run doctor` not "the checker"; `afd4cd7` not "the last commit". Everything nameable is named, as a clickable link or a runnable command — that is what makes the card actionable rather than merely informative.
- **Everything in the card is grounded** in a command run or a file read this turn. Unknown stays `inconnu`; never a plausible guess.

**Cadence — the card must stay rare enough to keep meaning something:**

- **Substantial answer** (code or docs changed, a slice closed, a decision taken, a handoff, `/brief`) → full Debrief.
- **Small answer** (a question answered, a lookup, a one-line fix) → no card. One landing line instead: `✅ {ce qui est fait} · suite → {l'action}`.
- **Nothing was done** (refusal, clarification, pure conversation) → no card at all.

### Prompt suivant

Immediately after the Debrief, when `Suite` is not `terminé`, add exactly **one** fenced code block labeled `**▶ Prompt suivant** (copier-coller) :`. Self-contained — goal, app/repo + key paths, constraints, acceptance — pasteable into a fresh Claude Code window with zero extra context. If the next step is a shell command, fence it as `bash` so the app shows a Run button. One prompt only: the single most useful next action, not a menu.

The Debrief, then the Prompt suivant, is the last thing in the answer unless a tool/system directive must come after it.

### The Flight Deck — pickup card only

Rendered for `/brief`, for a resume hook injecting "Resume Flight Deck context", and at a cold start — never as the closing summary of work. Same markdown grammar as the Debrief:

---

### 🛫 Flight Deck · {projet} — {workstream}

`{chemin}` · branche `{branch}`

- **🎯 Enjeu** — pourquoi ça compte, quelle lane
- **📍 État** — l'état concret : fichiers, tests, runtime, blocages
- **🔀 Git** — ahead/behind, fichiers modifiés, PR, dernier commit
- **➡️ Prochaine** — la prochaine action utile
- **⚖️ Décision** — vrai choix de stratégie, sinon « aucune »
- **🚧 Éviter** — la contrainte ou le risque à ne pas franchir

---

Six rows, grounded in git / status / memory, not vibes. Same discipline: one line per row, no paragraph — if `État` holds three facts, keep the two that change the next decision and push the rest into the body.
