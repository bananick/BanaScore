# Bananote — Plan d'analyse

## Vue d'ensemble

**Bananote** est une application d'événement interactif : l'admin crée un événement, des équipes et des activités, attribue des points *par classement* (1…N) par activité, et génère des **codes QR** par équipe pour l'inscription. Les participants rejoignent une équipe via le QR, puis **votent jusqu'à 3 fois** pour d'autres équipes. Le **classement global** additionne la **somme des points d'activités** et le **nombre de votes reçus**.

**Stack :** React 19, Vite 8, React Router 7, Express 5, SQLite (`better-sqlite3`), TypeScript, axios, lucide-react, qrcode.react. Le dev proxy `/api` pointe vers `http://localhost:3001`.

---

## Plan des fonctionnalités implémentées

| Zone | Rôle | Implémentation |
|------|------|----------------|
| **Accueil** (`/`) | Lister les événements | `GET /api/events` → liens vers `/event/:id` + lien admin |
| **Admin** (`/admin`) | Créer / lister des événements | `POST /api/events` (nom seul côté UI), liste avec lien vers le détail |
| **Gestion d'événement** (`/admin/event/:id`) | Équipes, activités, notation | `POST` teams/activities, sélection d'une activité, **points uniques 1…nombre d'équipes** (un rang ne peut être pris qu'une fois), reset d'un score ; **QR** par équipe → `/register/:token` |
| **Inscription** (`/register/:token`) | Rejoindre l'équipe du QR | `POST /api/participants/register` avec pseudo + `deviceId` (localStorage) ; id participant stocké par événement |
| **Participation** (`/event/:id`) | Votes + liens classements | Jusqu'à **3 votes** pour d'autres équipes (pas la sienne) ; rafraîchissement des données côté client |
| **Classements** (`/event/:id/ranking/...`) | Global / votes / par activité | `GET` ranking + **polling 5 s** ; affichage du top avec points |
| **API** | Règles métier + persistance | Schéma SQLite : `events`, `teams`, `activities`, `activity_scores`, `participants` (`UNIQUE(event_id, device_id)`), `votes` (`UNIQUE(participant_id, voted_team_id)`) |

---

## Bilan des forces

- **Boucle produit complète** : admin → QR → participant → votes → classements.
- **Règles de vote** cohérentes côté serveur (max 3 votes, pas pour sa propre équipe, pas de doublon par équipe ciblée).
- **Inscription** : reprise d'un participant existant sur le même appareil / le même événement (contrainte `device_id` + `event_id`).
- **Scoring type « Eurovision / rang »** : l'UI empêche d'attribuer le même rang à deux équipes sur une activité.
- **Interface** : thème sombre, cartes, grille de scores, rafraîchissement périodique des pages de classement.

---

## Pistes d'amélioration

### Produit & UX

- **Sécurité admin** : `/admin` est public ; ajouter au minimum un secret (token d'URL, mot de passe) et viser **HTTPS** en production.
- **Champs BDD** : `date` et `location` existent sur `events` mais l'admin n'enregistre que le **nom** — à exposer en UI ou à retirer du schéma.
- **Cycle de vie** : pas de **fermeture** d'événement, de **suppression** ou d'**archivage** ; pas d'**édition** des noms (événement, équipe, activité).
- **Temps réel** : sur la page événement, les scores / votes ne se mettent pas à jour seuls (contrairement à la page ranking) — **rafraîchissement auto** ou **SSE / WebSocket** possibles.
- **Accessibilité & messages** : nombreux `alert()` — remplacer par toasts ; **i18n** (interface en anglais, besoin en français) ; `lang` de `index.html` à aligner.
- **Mobile** : vérifier les grilles (votes 2 colonnes) sur petits écrans.

### Technique

- **Structure** : `App.tsx` monolithique — extraire composants et hooks (`useEvent`, `useRanking`, etc.) pour tests et maintenance.
- **Types** : remplacer les `any[]` par des types alignés sur l'API.
- **Serveur** : mélange `require` / `import` — homogénéiser le module system pour build et outillage.
- **`admin_points`** sur `teams` : **non utilisé** — l'exploiter (bonus manuel) ou le retirer.
- **API** : validation (longueur pseudo, noms) ; réponses d'erreur **JSON** structurées plutôt que chaînes brutes.
- **Déploiement** : documenter (README), sauvegarde `bananote.db`, **CORS** restreint en prod.
- **Tests** : ajouter des tests d'intégration sur règles de vote et de scoring.

---

## Résumé

Bananote est un **MVP cohérent** pour un atelier ou une soirée (votes + activités + QR). Les leviers principaux : **sécuriser l'admin**, **aligner produit / schéma** (champs inutilisés, date & lieu) et améliorer le **temps réel** / la **maintenabilité** du code (découpage, types, erreurs).
