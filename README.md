# 🍌 BanaScore

Application d'événement interactif : un **admin** crée un événement, des équipes et
des activités, distribue des points par classement et génère un **QR code** par
équipe. Les **participants** rejoignent leur équipe via le QR puis votent (jusqu'à
3 fois) pour d'autres équipes. Un **classement live** combine points d'activités,
votes reçus et bonus admin.

## Stack

- **Frontend** : React 19, Vite 8, React Router 7, axios, `lucide-react`, `qrcode.react`
- **Backend** : Express 5, SQLite (`better-sqlite3`), TypeScript
- **Dev** : `concurrently` lance le serveur (port 3001) et Vite ; le proxy `/api` pointe vers le serveur.

## Structure

```
server/
  index.ts        Wiring Express + routes (fines, déléguées au store)
  store.ts        Logique métier (règles de vote/scoring, classements)
  db.ts           Schéma SQLite + migrations + ouverture de la base
  auth.ts         Auth admin (login + middleware requireAdmin)
  validation.ts   Validation des entrées
  errors.ts       AppError + réponses JSON structurées
  types.ts        Types des lignes SQLite
  store.test.ts   Tests d'intégration (node --test)
src/
  api.ts          Client API typé (injecte le token admin)
  types.ts        DTOs partagés
  i18n.ts         Chaînes d'interface (français, centralisées)
  toast.tsx       Système de notifications (remplace alert())
  hooks.ts        usePolling (rafraîchissement auto)
  pages/          Une page par écran (Home, Admin*, Register, EventView, Ranking)
  App.tsx         Routeur + providers
```

## Lancer un événement (multi-tablette)

Toutes les tablettes/téléphones se connectent à **un seul serveur** (ton PC) sur
le **même Wi-Fi** ; les données se synchronisent en temps réel (SSE) avec un
repli en polling. Il n'y a pas de connexion directe entre tablettes.

**Le plus simple (Windows, sans terminal)** : double-cliquer sur
**`Lancer-BanaScore.bat`**. Il installe les composants au premier lancement,
démarre le serveur et **ouvre automatiquement la page QR** (`/access`).

Sinon, en ligne de commande :

```bash
npm start
```

Cette commande build l'app (si besoin), démarre le serveur sur le réseau local,
affiche l'adresse à ouvrir sur les tablettes (ex. `http://192.168.1.62:3001`) et
ouvre la page **`/access`** : un **grand QR** + 3 étapes d'installation que les
animateurs suivent sur chaque tablette (scanner → « Installer l'application » →
entrer le code animateur).

> Astuce : la page **Affiche** d'un événement (admin → 🖨️) génère **un QR par
> activité** ; chaque tablette scanne le QR de son activité pour arriver
> directement sur l'écran de notation.

- Notation : 1 tablette par activité → `…/score/<id de la session>` → code animateur.
- Verrouillage : passer une session en **« Fermé »** bloque la notation des
  animateurs (l'admin peut toujours corriger).
- Une bannière **« Connexion perdue »** s'affiche si le Wi-Fi coupe.

> Pour un accès hors Wi-Fi local (ex. 4G) ou avec HTTPS, héberger sur un service
> type Render/Railway/VPS et définir `ADMIN_PASSWORD`, `SESSION_SECRET`,
> `CORS_ORIGIN`. Le serveur sert déjà le frontend compilé (`dist/`).

## Démarrage (développement)

```bash
npm install
npm run dev      # serveur (3001) + client Vite (5173)
```

Ouvrir http://localhost:5173. L'espace admin est sur `/admin` (mot de passe requis).

## Fonctionnalités

- **Notation par équipe** : points par rang et par activité, bonus admin, votes des participants.
- **Notation avancée** : **coefficient par activité** (pondère le score global), **nombre de votes configurable** par événement, **égalités (ex æquo)** dans les classements, **libellé de bonus** (raison affichée dans le rapport).
- **Tableau de bord live** (admin) : compteurs en temps réel (équipes, inscrits, votes, activités notées) avec auto-refresh.
- **Branding par événement** : couleur de marque + logo (URL) repris dans le **rapport** et le **mode projection**.
- **QR « rejoindre l'événement »** (`/join/:eventId`) : un seul QR, choix de l'équipe à l'arrivée — en plus des QR par équipe.
- **Affiche QR imprimable** (`/admin/event/:id/posters`) : feuille A4 avec tous les QR (équipes + événement) à poser sur les tables.
- **Anti-doublon** : noms d'équipes et d'activités uniques par événement (insensible à la casse).
- **Duplication d'événement** (bouton 📋 dans l'admin) : réutilise la structure (équipes + activités, nouveaux QR) sans copier les scores ni les votes — idéal comme modèle récurrent. La config (atelier, coefficient, code animateur, branding) est aussi copiée.
- **Ateliers** : regrouper des activités sous un même atelier ; **classement par atelier** (top 3) dans une vue dédiée, la projection et le rapport.
- **Notation tablette** (`/score/:eventId`) : écran focalisé par activité, autorisé par un **code animateur** par événement (sans le mot de passe admin).
- **Générer des sessions** : créer S1…Sn d'un coup depuis un modèle.
- **Temps réel (SSE)** : mises à jour quasi instantanées ; **bannière hors-ligne** sur perte de réseau.
- **Rapport client / export** (`/admin/event/:id/report`) : podium + tableau détaillé par équipe, **export CSV** (séparateur `;`, compatible Excel FR, BOM UTF-8) et **impression / PDF** via la fonction d'impression du navigateur.
- **Mode projection** (`/event/:id/board`) : tableau de classement plein écran, barres de progression, auto-refresh (5 s), bouton plein écran — pour vidéoprojecteur / TV.
- **PWA installable** : installable sur tablette/téléphone (icône sur l'écran d'accueil, plein écran). L'installation nécessite le **build de production** (service worker actif uniquement en prod) :

  ```bash
  npm run build && npm run preview
  ```
  Puis, depuis Chrome (mobile ou desktop) : menu → « Installer l'application ».

## Variables d'environnement

| Variable          | Défaut                | Description |
|-------------------|-----------------------|-------------|
| `ADMIN_PASSWORD`  | `banana` (avec alerte)| Mot de passe de l'espace admin. **À définir en production.** |
| `SESSION_SECRET`  | aléatoire au démarrage | Secret de signature des tokens admin. Si non défini, les sessions sont invalidées à chaque redémarrage. |
| `PORT`            | `3001`                | Port du serveur API. |
| `BANASCORE_DB`    | `./banascore.db`      | Chemin du fichier SQLite. |
| `CORS_ORIGIN`     | (réflexion de l'origine) | Liste d'origines autorisées, séparées par des virgules (ex. `https://banascore.exemple.fr`). À restreindre en production. |

## Scripts

```bash
npm run dev        # dev (serveur + client)
npm run build      # typecheck + build de production (dist/)
npm run preview    # prévisualise le build
npm run server     # serveur seul
npm run typecheck  # vérification de types uniquement
npm test           # tests d'intégration des règles métier
```

## Tests

Les tests (`server/store.test.ts`) couvrent les règles métier sur une base
SQLite en mémoire : inscription idempotente par appareil, interdiction de voter
pour sa propre équipe, limite de 3 votes, votes en double, événement fermé,
unicité des rangs par activité, et calcul du classement global.

```bash
npm test
```

## Déploiement

### En local / un seul PC (événement)

Voir « Lancer un événement (multi-tablette) » plus haut : `npm start`.

### Production compilée (sans ts-node)

```bash
npm run build:all   # build frontend (dist/) + serveur compilé (dist-server/)
npm run serve       # node dist-server/index.js — sert l'app + l'API sur PORT
```

Le serveur sert le frontend compilé **et** l'API sur le même port → un seul
service à exposer. Définir au minimum `ADMIN_PASSWORD` et `SESSION_SECRET`,
restreindre `CORS_ORIGIN`, et servir derrière **HTTPS** (reverse proxy ou
plateforme managée).

### Docker

```bash
docker build -t banascore .
docker run -p 3001:3001 \
  -e ADMIN_PASSWORD=monsecret \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -v banascore-data:/data \
  banascore
```

La base SQLite est persistée dans le volume monté sur `/data`.

### Render.com

Le fichier `render.yaml` fournit un blueprint (New → Blueprint). Renseigner
`ADMIN_PASSWORD` dans le dashboard ; `SESSION_SECRET` est généré
automatiquement. ⚠️ Le **disque persistant** nécessite une offre payante ; sur
le plan gratuit, la base est réinitialisée à chaque redéploiement (pensez à
télécharger `banascore.db` pour conserver les résultats).

### Sauvegarde des données

Toutes les données sont dans le fichier SQLite (`BANASCORE_DB`, par défaut
`banascore.db`). La base utilise le mode WAL : sauvegarder aussi les fichiers
`-wal`/`-shm` s'ils existent, ou exécuter un checkpoint avant la copie :

```bash
sqlite3 banascore.db "PRAGMA wal_checkpoint(TRUNCATE);"
cp banascore.db sauvegardes/banascore-$(date +%F).db
```

Le fichier `.db` est ignoré par Git (voir `.gitignore`).

## Sécurité

- L'espace admin est protégé par mot de passe ; toutes les routes de mutation
  (création/édition/suppression, scoring) exigent le header `x-admin-token`.
- Les entrées sont validées côté serveur ; les erreurs sont renvoyées en JSON
  structuré `{ error: { code, message } }`.
- En production : définir `ADMIN_PASSWORD` et `SESSION_SECRET`, restreindre
  `CORS_ORIGIN`, servir en HTTPS.
