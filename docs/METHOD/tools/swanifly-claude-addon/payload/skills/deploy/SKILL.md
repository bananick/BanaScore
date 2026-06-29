---
name: deploy
description: >-
  Build and deploy a web app to Firebase, then verify it's live. Use when the user
  says "deploy", "deploy to firebase", "ship it", "push to <site>.web.app", or wants
  a Next.js/Firebase app published. Auto-detects the app's firebase.json/.firebaserc
  (Hosting, App Hosting, or Functions) — no hardcoded site list — so it works across
  every Bana/Swanifly repo (Banadoo, Worldiz, youwards, BanAventures, etc.).
---

# deploy

Deploys the **current app** to Firebase and confirms it actually went live. Built around the user's most frequent manual task and their most common production failures (auth, API keys, Firestore rules).

## Procedure

1. **Locate the app.** From the cwd, find the nearest `firebase.json` (and `.firebaserc`). If the user named a target (e.g. "deploy banaventures"), `cd` to that app. If ambiguous, list the candidate `firebase.json` files and ask which.

2. **Read the config** to decide what to deploy:
   - `firebase.json` has `"apphosting"` → **App Hosting**: `firebase deploy --only apphosting` (server-rendered; no static export needed).
   - `firebase.json` has `"hosting"` → **Hosting**: `firebase deploy --only hosting` (add `:site` if `.firebaserc` defines hosting targets / multiple sites).
   - Has `"functions"` → include `functions`. Has `"firestore"` rules that changed → also `--only firestore:rules`.
   - `.firebaserc` → note the `projects.default` and any `targets` so you deploy to the right project/site.

3. **Build first** (unless App Hosting builds server-side):
   - Next.js static export (config `output: 'export'` or `NEXT_EXPORT=true`) → `npm run build` produces `out/`. Confirm the `hosting.public` dir matches (`out` / `dist` / `.next`).
   - Monorepo workspaces (e.g. BanAventures) → `npm run build --workspaces`.
   - If the app has its own `deploy` script (e.g. HarryQuote `npm run deploy` = build + deploy), prefer it.

4. **Deploy** with `npx -y firebase-tools@latest deploy --only <scope>`. Stream output. If it prompts for login/project, surface that — don't guess credentials.

5. **Verify live** (this is the point). Fetch the deployed URL (App Hosting / `<site>.web.app`) and confirm HTTP 200 and the expected content. Then proactively check the user's recurring failure modes:
   - **Auth**: does the live app init Firebase Auth (no "service d'authentification indisponible")? Check the deployed config has the right `NEXT_PUBLIC_FIREBASE_*` / API key.
   - **API key**: not missing, not exposed beyond `NEXT_PUBLIC_*`, not a restricted/suspended key.
   - **Firestore rules**: if rules were part of the deploy, confirm they published.

6. **Report**: the exact command run, the live URL, HTTP status, and any auth/key/rules warning. If verify fails, diagnose before declaring success.

## This-repo reference (Bana-Share)

| App (cwd) | Build | Deploy | Target |
|:--|:--|:--|:--|
| `Apps/web` | `npm run build` | `firebase deploy --only apphosting` (+ `firestore:rules`) | App Hosting backend `bana-share-web` (europe-west1) |
| `Apps/BanAventures` | `npm run build --workspaces` | `firebase deploy --only hosting` | Hosting site `banaventures` (project `banaventures-4a8a5`) |
| `Apps/HarryQuote` | — | `npm run deploy` | Hosting + Functions |

## Rules

- **Never deploy without passing the QA gate** — run `/ship-check` first (or confirm it passed). Per `SOUL.md`, no deploy ships mock data.
- Never invent a site/target. If detection is ambiguous, ask.
- Don't print secret values; reference env var names only.
