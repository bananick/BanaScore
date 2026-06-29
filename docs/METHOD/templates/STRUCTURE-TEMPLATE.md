# [App Name] — Application Structure
**Version:** 1.0  
**Last Updated:** YYYY-MM-DD  
**Owner:** Junia

---

## Legend
- 🟢 **Operational** — Implemented and complete
- 🟡 **In Progress** — Partial implementation or refactoring
- 🔴 **Expected** — Planned, not yet implemented

---

## Global Architecture
- **Framework:** [e.g., Next.js 15.x with App Router]
- **Backend:** [e.g., Firebase (Auth, Firestore, Storage)]
- **Deployment:** [e.g., Static Export to Firebase Hosting]
- **Multitenancy:** [Default: multi-tenant Teams] — tenant noun: team, tenant routes: `/t/{teamId}/...`, tenant data: `teams/{teamId}/...`

---

## Pages (Routes)

### `/route` (Route Title)
Brief description of the route's purpose.

- 🟢 **Feature Name**: What it does
- 🟡 **Partial Feature**: What exists, what's missing
- 🔴 **Planned Feature**: Expected functionality

---

## Key Components & Utilities
- 🟢 **ComponentName.tsx**: Description and purpose
- 🔴 **PlannedUtility**: Future purpose

---

## 🗺️ Roadmap — Features to Develop
Summary of all 🔴 items requiring implementation:

| Priority | Feature | Section |
|----------|---------|---------|
| 🔴 | Feature Name | Route / Component |

---

## Data Model

**Full schema registry:** See `project/SCHEMA.md` (use `templates/SCHEMA-TEMPLATE.md`)

**Quick reference:**

| Collection | Tenant-Scoped? | Description |
|-----------|----------------|-------------|
| `users/{uid}` | ❌ | User profiles |
| `teams/{teamId}` | Root | Tenant entity |
| `teams/{teamId}/members/{uid}` | ✅ | Membership |

