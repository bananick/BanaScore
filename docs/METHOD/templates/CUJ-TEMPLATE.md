# CUJ — <nom du parcours>

> Template pour `docs/journeys/{cuj}.md`.  
> **Owner :** April (définition) + Junia (suivi d'avancement)  
> **Créé le :** YYYY-MM-DD

---

## Persona

- **Qui :** <persona cible>
- **Contexte :** <situation dans laquelle ce parcours est déclenché>
- **JTBD :** <Job-To-Be-Done — ce que l'utilisateur veut accomplir fondamentalement>

---

## Precision Gate ✅

> Cette section doit être complétée et validée par l'opérateur humain **avant** que Junia planifie le premier sprint de ce CUJ.  
> April conduit la **CUJ Definition Session** pour la remplir.

### Chemin A → Z

| | Description précise |
|---|---|
| **A — Point de départ** | <État exact de l'utilisateur avant de commencer. Ce qu'il voit, ce qu'il a déjà fait, son contexte.> |
| **Z — Résultat final** | <État exact de l'utilisateur après avoir réussi. Ce qui a changé concrètement pour lui.> |
| **Critère de succès non-équivoque** | <Test manuel exact qui prouve que Z est atteint. Un testeur qui lit ça doit savoir sans ambiguïté si c'est réussi ou non.> |

### Étapes du chemin (séquence obligatoire)

> Chaque étape = une action utilisateur ou une réponse système observable.

1. <action ou réponse>
2. <action ou réponse>
3. <action ou réponse>
4. ...

### Hors-champ (exclusions explicites)

> Ce qui est intentionnellement exclu de ce CUJ (pour éviter le scope creep).

- <Ce qui n'est PAS dans ce CUJ>
- <Ce qui est prévu dans un CUJ futur>

### Validation humaine

| Champ | Valeur |
|---|---|
| **Confirmé par** | <opérateur humain> |
| **Date** | YYYY-MM-DD |
| **Verdict** | ✅ Précis et non-ambigu / 🔄 À réviser |
| **Notes** | <remarques ou contraintes éventuelles> |

---

## Étapes de développement

> Junia décompose le chemin A→Z en sprints une fois le Precision Gate validé.

| Étape | Description | Sprint | Statut |
|-------|-------------|--------|--------|
| 1 | <description> | <###> | [ ] |
| 2 | <description> | <###> | [ ] |
| 3 | <description> | <###> | [ ] |

**Statuts :** `[ ]` Todo · `[/]` En cours · `[x]` Done · `[v]` Validé (CUJ Exit Gate) · `[!]` Problème

---

## CUJ Exit Gates

> Critères pour marquer une étape comme `[v]` validée.

1. **Fonctionnel :** Tous les critères d'acceptance de l'étape sont satisfaits
2. **Testé :** DoD satisfait (unit tests + smoke test)
3. **Documenté :** Étape marquée `[x]` dans ce fichier
4. **Utilisateur-validé :** Testé par un utilisateur réel (recommandé avant `[v]`)
5. **Performance :** Métriques cibles atteintes (si définies dans le Precision Gate)

---

## Automation Hooks (optionnel)

> Section utilisée par le **Review Runner** (`tools/review-runner/`) pour compiler ce CUJ
> en scénario exécutable. Chaque étape peut définir des hooks pour l'automatisation.
>
> **Remplir uniquement si le CUJ est candidat à la review automatisée.**

### Configuration

| Paramètre | Valeur |
|---|---|
| **Application URL** | `http://localhost:<PORT>` |
| **Application ID** | `<app-id>` |
| **Auth requise** | Oui / Non |
| **Pré-requis** | <données seed, état Firebase, etc.> |

### Hooks par étape

> Pour chaque étape du chemin A→Z, ajouter les hooks d'automatisation.
> Les actions et assertions seront compilées dans le scénario JSON par `review-runner compile`.

```
### Step N: <Nom de l'étape>
<!-- automation:
  route: "/path/to/page"
  waitForSelector: "#main-content"
  actions:
    - type: click
      selector: "#btn-create"
      description: "Click create button"
    - type: fill
      selector: "#input-name"
      value: "Test Project"
      description: "Fill project name"
  assertions:
    - type: visible
      selector: ".project-card"
      description: "Project card appears"
    - type: no-console-errors
      description: "No console errors"
  codeAreas:
    - src/pages/ProjectPage.tsx
    - src/services/projectService.ts
-->
```

**Types d'actions :** `click`, `fill`, `select`, `check`, `navigate`, `wait`, `screenshot`, `scroll`
**Types d'assertions :** `visible`, `text-contains`, `url-matches`, `element-exists`, `element-count`, `no-console-errors`

### Exécution

```bash
# Compiler le CUJ en scénario
cd tools/review-runner
npx tsx src/cli.ts compile "../../docs/journeys/<cuj>.md" --app-url http://localhost:3000

# Exécuter le scénario (app doit tourner)
npx tsx src/cli.ts run scenarios/<journey-id>.scenario.json --app-name "<AppName>"

# Ouvrir le cockpit de review
# → tools/review-cockpit/index.html (charger runs/<run-id>/review-run.json)
```

---

## Historique

| Date | Auteur | Changement |
|------|--------|------------|
| YYYY-MM-DD | April | Création — Precision Gate défini |
| YYYY-MM-DD | Junia | Étapes de développement planifiées |

---

**Owner :** April (Precision Gate) / Junia (suivi)  
**Version du template :** 306.c
