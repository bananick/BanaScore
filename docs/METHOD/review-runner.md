# Review Runner — AI Review Platform

> **Version :** 309.a  
> **Owner :** Vera (quality gate) + April (CUJ définition)  
> **Statut :** MVP — Phase 1 & 2 complétées

---

## Objectif

Le **Review Runner** est un outil interne METHOD qui automatise la revue d'application
en compilant les CUJ (Critical User Journeys) en scénarios Playwright exécutables,
collectant des preuves diagnostiques, et les présentant dans un cockpit de review
pour collaboration humain-IA.

> [!IMPORTANT]
> **Review Runner vs `/review` — qui fait quoi.** Ce sont **deux choses complémentaires**, pas des
> doublons :
> - **`/review`** (ritual Claude Code, exécuté par le sous-agent **`vera`** en lecture seule) est la
>   **porte de qualité** de la DoD : Vera juge un livrable contre les critères d'acceptation et pose le
>   `☑️` (ou bloque). C'est le **décideur**.
> - **Review Runner** est le **collecteur de preuves** en amont : il exécute les CUJ via Playwright et
>   produit l'evidence (screenshots, console, network, auto-issues, `SprintReadyReport`).
>
> Review Runner **n'est pas** le moteur derrière `/review` ; il **alimente** `/review`. Flux type :
> `Review Runner` (preuves) → `vera` `/review` (verdict + `☑️`) → Junia (sprint planning depuis les
> `TaskDraft`). Voir `.claude/agents/` (sous-agent `vera`) et `.claude/commands/review.md`.

### Proposition de valeur

| Sans Review Runner | Avec Review Runner |
|---|---|
| Review manuelle étape par étape | Exécution automatique du CUJ |
| Screenshots manuels | Capture systématique (screenshots, console, network) |
| Issues notées à la main | Auto-détection (erreurs console, 5xx, assertions) |
| Rapport rédigé manuellement | Génération automatique (Markdown + JSON) |
| Tickets créés après réunion | TaskDrafts créés pendant la review |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CUJ Markdown                         │
│                docs/journeys/*.md                       │
└──────────┬──────────────────────────────────────────────┘
           │ compile
           ▼
┌─────────────────────────────────────────────────────────┐
│                  Executable Scenario                    │
│              scenarios/*.scenario.json                  │
│      (steps, actions, assertions, code areas)           │
└──────────┬──────────────────────────────────────────────┘
           │ run (Playwright)
           ▼
┌─────────────────────────────────────────────────────────┐
│                     ReviewRun                           │
│              runs/<run-id>/review-run.json               │
│   (evidence: screenshots, console, network, timing)     │
│   (auto-issues: P0-P3, console-error, network-failure)  │
└──────────┬──────────────────────────┬───────────────────┘
           │ report                   │ cockpit
           ▼                          ▼
┌──────────────────────┐  ┌────────────────────────────────┐
│  Markdown + JSON     │  │   Review Cockpit (HTML)        │
│  review-*.md / .json │  │   3 panels: Steps | Evidence   │
│                      │  │   | Issues/Notes/AI/Tasks      │
└──────────────────────┘  └────────────────────────────────┘
```

---

## Schéma de données

### ReviewRun (document principal)

Le `ReviewRun` étend le `ProcessRun` de METHOD 309.a (`ai-infra-method.md` / `process-method.md`) avec des champs spécifiques à la review :

| Champ | Type | Description |
|---|---|---|
| `runId` | string | Identifiant unique du run |
| `journeyId` | string | Identifiant du CUJ |
| `applicationId` | string | Identifiant de l'application |
| `status` | enum | `pending ∣ running ∣ success ∣ failure ∣ partial` |
| `steps[]` | ReviewStepRun[] | Résultats par étape |
| `taskDrafts[]` | TaskDraft[] | Tickets générés pendant la review |
| `reviewStatus` | enum | `pending ∣ in-progress ∣ completed` |

### ReviewStepRun (par étape)

| Champ | Type | Description |
|---|---|---|
| `expected` | string | Ce qui devait se passer (issu du CUJ) |
| `actual` | string | Ce qui s'est réellement passé |
| `screenshotPath` | string | Chemin du screenshot |
| `consoleEntries[]` | ConsoleEntry[] | Log console capturé |
| `networkEntries[]` | NetworkEntry[] | Requêtes réseau |
| `autoIssues[]` | AutoIssue[] | Issues auto-détectées |
| `reviewerVerdict` | enum | `pass ∣ fail ∣ warning ∣ skip` (rempli dans cockpit) |
| `aiSummary` | string | Analyse AI (Phase 3) |

### AutoIssue (issue auto-détectée)

| Champ | Type | Description |
|---|---|---|
| `type` | enum | `console-error ∣ network-failure ∣ assertion-failed ∣ ...` |
| `severity` | enum | `P0 ∣ P1 ∣ P2 ∣ P3` |
| `confidence` | number | 0.0 – 1.0 |
| `evidence` | string | Lien vers le code source suspect |

---

## Utilisation

### Pré-requis

```bash
cd tools/review-runner
npm install
```

### 1. Compiler un CUJ

```bash
npx tsx src/cli.ts compile "../../Apps/HarryQuote/docs/journeys/quote-creation-cuj.md" \
  --app-id harryquoter3 \
  --app-url http://localhost:3502 \
  --output ./scenarios
```

Le compilateur :
- Parse le markdown CUJ (formats français et anglais supportés)
- Extrait les étapes, exit gates, et métadonnées persona
- Convertit les exit gates en assertions typées
- Produit un `*.scenario.json` validé par Zod

### 2. Exécuter un scénario

```bash
# L'application doit tourner localement
npx tsx src/cli.ts run scenarios/quote-creation-journey.scenario.json \
  --app-name HarryQuoter3 \
  --headed          # mode visible (optionnel)
  --browser chromium # ou firefox, webkit
  --timeout 30000   # timeout par étape en ms
```

Le runner :
- Lance un navigateur Playwright
- Navigue à chaque étape du scénario
- Capture screenshot (pleine page)
- Collecte console log, network traffic, timing
- Auto-détecte les erreurs (console errors, 5xx, CORS, etc.)
- Produit un `review-run.json` avec toute l'evidence

### 3. Ouvrir le Review Cockpit

Ouvrir `tools/review-cockpit/index.html` dans un navigateur et charger le fichier
`runs/<run-id>/review-run.json`.

Fonctionnalités cockpit :
- **Navigation** : clic sur les étapes ou `↑↓` / `j` `k`
- **Filtrage** : par statut (failed, warning, success, unreviewed)
- **Evidence** : expected vs actual, screenshot, console, network, timing
- **Verdict** : pass / fail / warning / skip par étape
- **Notes** : texte libre par étape
- **Task creation** : créer un TaskDraft depuis une issue
- **Export** : Markdown et JSON

---

## Intégration METHOD

### Avec les CUJ

Les CUJ existants (`docs/journeys/*.md`) sont directement compilables.
Pour une automatisation plus riche, ajouter les **Automation Hooks** définis
dans le template `CUJ-TEMPLATE.md` v306.c.

### Avec le sprint planning

Les rapports JSON (`SprintReadyReport`) contiennent :
- Liste de `TaskDraft` avec sévérité, type, et code areas
- Impact code (fichiers et composants touchés)
- Résultats step-by-step

Ces données alimentent directement le sprint planning de Junia.

### Avec process-method.md

Le `ReviewRun` est compatible avec le schéma `ProcessRun` de 309.a :
- `processId` et `processName` mappent vers les process registrés
- `triggeredBy` utilise les mêmes enum (user, agent, system, schedule)
- `steps[].operator` identifie l'exécutant (runner, human, agent, code)

---

## Structure des fichiers

```
tools/
├── review-runner/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── cli.ts                    # Point d'entrée CLI
│       ├── schema/
│       │   └── review-run.ts         # Schéma Zod (ReviewRun, Scenario)
│       ├── compiler/
│       │   └── cuj-compiler.ts       # CUJ markdown → JSON scenario
│       ├── runner/
│       │   └── playwright-runner.ts  # Execution + evidence collection
│       └── reporter/
│           └── report-generator.ts   # Markdown + JSON reports
│
└── review-cockpit/
    ├── index.html                    # 3-panel review UI
    ├── styles.css                    # Premium dark theme
    ├── app.js                        # Application logic
    └── demo-run.json                 # Données de démo
```

---

## Roadmap

> Mise à jour : 2026-06-16 (v309.a).

| Phase | Statut | Description |
|---|---|---|
| **1. Foundation** | ✅ Done | Schema, compiler, runner, reporter, CLI |
| **2. Cockpit** | ✅ Done | 3-panel web UI, file loading, verdicts, export |
| **3. AI Copilot** | 📋 Planned | Per-step AI analysis, hypothesis, suggested fix |
| **4. Integration** | 🔄 In Progress | CUJ template hooks, METHOD docs, branchement sur le sous-agent `vera` / `/review` |

---

**Défini par :** April  
**Implémenté par :** Claude Code  
**Review gate :** Vera (sous-agent `vera` via `/review`)  
**Version :** 309.a
