# Déploiement BanaScore sur Firebase

L'app tourne en **100 % Firebase** : Hosting (le site) + Cloud Functions 2ᵉ gén
(l'API Express) + Firestore (les données). Chaque animateur se connecte depuis
son propre téléphone sur l'URL du site — c'est responsive.

```
Navigateur ──▶ Firebase Hosting ──(réécriture /api/**)──▶ Function "api" ──▶ Firestore
   (site statique : dist/)                                  (Express + Admin SDK)
```

Projet : **banascore** (numéro 993127094161). Plan **Blaze** requis (déjà actif).

---

## Une seule fois : préparer le projet

1. **Se connecter** (ouvre le navigateur) :
   ```powershell
   firebase login
   ```

2. **Définir les secrets** (mot de passe admin + clé de session). À taper une fois ;
   ils sont stockés dans Secret Manager, jamais dans le code :
   ```powershell
   firebase functions:secrets:set ADMIN_PASSWORD
   firebase functions:secrets:set SESSION_SECRET
   ```
   - `ADMIN_PASSWORD` : le mot de passe de la page admin.
   - `SESSION_SECRET` : une longue chaîne aléatoire (ex. coller le résultat de
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
     Tant qu'il ne change pas, les sessions admin/animateurs restent valides.

---

## À chaque mise en ligne

Depuis `D:\Vincent\Apps\BanaScore-firebase` :

```powershell
npm run build              # construit le site (dist/) — SSE désactivé en hébergé
firebase deploy --only firestore:rules,functions,hosting
```

Le `predeploy` des functions installe leurs dépendances et les compile
automatiquement. À la première exécution, Firebase proposera d'activer les API
nécessaires (Cloud Functions, Cloud Build, Artifact Registry, Eventarc,
Secret Manager) — accepter.

À la fin, l'URL publique s'affiche :
`https://banascore.web.app` (et `https://banascore.firebaseapp.com`).

---

## Notes

- **Live updates** : en hébergé, l'app se rafraîchit par *polling* (pas de SSE
  persistant sur serverless). C'est transparent pour les utilisateurs.
- **Premier mot de passe admin** : tant qu'aucun mot de passe n'a été changé
  dans l'app, c'est la valeur du secret `ADMIN_PASSWORD` qui fait foi. Après un
  changement via l'app, c'est le hash stocké en base (Firestore) qui prime.
- **Région** : la function est en `europe-west1`. Garder la base Firestore dans
  la même région (ou `eur3`) pour limiter la latence.
- **Tester en local** (sans déployer) toute la chaîne :
  ```powershell
  npm run build
  firebase emulators:start --only firestore,functions,hosting
  ```
  puis ouvrir http://localhost:5000.
- **Tests de la couche données** sur l'émulateur :
  ```powershell
  npm run test:emulator
  ```
