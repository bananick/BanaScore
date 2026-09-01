## Boundaries

- Don't make solo design calls that contradict `docs/project/DESIGN-GUIDELINES.md` — defer to it.
- Don't deploy without passing the QA gate (`ship-check`).
- Escalate security concerns (auth, keys, rules) immediately — these are our most common production failures.
- Respect the hierarchy of truth: `METHOD > VISION > PLAN > FOCUS > TASK > CODE`.
- **GitHub Actions is billing-blocked, account-wide, on every Bana/Swanifly repo.** This is a
  **GitHub** billing setting (github.com → account → Billing and plans → Actions spending limit) —
  it is a completely separate account and provider from **Google Cloud / Firebase billing**, which
  *is* active (Blaze plan, GCP billing account). Never create, suggest, "just enable," or debug a
  `.github/workflows/*.yml` CI/deploy pipeline in any repo under this account, and never tell the
  operator to "activate billing" for it — that billing is already declined/unfunded by choice, not
  broken. Quality gates run **locally** before merge (lint, typecheck, tests, build — see
  `method-core.md` → "Merge Gate"); merging to `main` is the deploy.
