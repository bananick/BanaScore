# Code Rules

**Owner:** Kasper (Security) + Brian (Web Dev)  
**Version:** 308.a  
**Purpose:** Actionable rules to keep code smart, light, secure, and powerful

---

## Philosophy

Every rule here has one job: **prevent the bugs, bloat, and vulnerabilities that slow teams down.** Rules are enforced by tooling where possible (ESLint, TypeScript) and by Vera's Review Gate where not.

**Escape hatch:** Any rule can be overridden with an explicit annotation:

```typescript
// @rule-override: {rule-name} — {reason}
```

Vera checks all overrides during Review Gate.

---

## 🧠 1. SMART — Type Intelligence

| Rule | Rationale |
|------|-----------|
| No `any` — use `unknown` + type guards | `any` disables the compiler; bugs slip through silently |
| No `as` assertions outside test files | `as` lies to the compiler; use `satisfies` or narrow with guards |
| Prefer `satisfies` over `as` for narrowing | Catches mismatches at compile time, `as` hides them |
| Zod schemas = single source of truth | One schema validates runtime AND provides static types |
| Co-locate types with Zod schemas in `src/lib/schemas/` | Types and validation live together; no drift |
| No barrel exports (`index.ts` re-exports) | Breaks tree-shaking, creates hidden dependency graphs |

### Zod Pattern (required for all Firestore writes)

```typescript
// src/lib/schemas/invoice.ts
import { z } from 'zod';

export const invoiceSchema = z.object({
  clientName: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['draft', 'sent', 'paid']),
  createdAt: z.date(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

// Usage — ALWAYS validate before write
await setDoc(ref, invoiceSchema.parse(data));
```

---

## 🪶 2. LIGHT — Bundle & Complexity

| Rule | Rationale |
|------|-----------|
| Max **200 lines per file** (soft) | Long files = hard to navigate, test, review |
| Max **40 lines per function** (soft) | Long functions = multiple responsibilities |
| Use `import type {}` for type-only imports | Stripped at compile time; zero bundle cost |
| No `moment.js` — use `date-fns` | moment = 300KB; date-fns = tree-shakeable |
| Dynamic imports for heavy components | `next/dynamic` or `React.lazy` keeps initial bundle small |
| Max **3 levels** of JSX nesting | Deeper = extract a named component |
| Named exports for non-page files | Better tree-shaking + IDE navigation than default exports |

### Dynamic Import Pattern

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

---

## 🔒 3. SECURE — Defense in Depth

> **Full standard:** `docs/definition/security/PROJECT SECURITY.md` (v1.1)

| Rule | Rationale |
|------|-----------|
| Never `setDoc(ref, rawObject)` | Always `schema.parse(data)` first — prevents malformed writes |
| Server components are default | `'use client'` only when interactivity is needed |
| API routes validate `Authorization` header | Every request must verify identity |
| **`enforceApiGuard()` on every POST/PUT/DELETE** | Rate limiting, origin check, payload validation — prevents abuse |
| No `eval()` | Code injection vector |
| No `dangerouslySetInnerHTML` without sanitization | XSS vector |
| No `execSync()` / `exec()` with string interpolation | **Use `execFileSync` with argument arrays** — prevents command injection |
| `NEXT_PUBLIC_*` = Firebase config only | Everything else is server-only; never expose secrets |
| **`VITE_*` = Firebase config only** | Same rule for Vite apps; `VITE_` vars are bundled in client JS |
| **Never use Vite `define` to inject API keys** | `define` inlines values as string literals in the production bundle |
| No `allow read/write: if true` in prod Firestore rules | MVP-only pattern; harden before launch |
| **Default-deny catch-all in Firestore rules** | `match /{document=**} { allow read, write: if false; }` as first rule |
| Rate limiting on Cloud Functions | App Check required for production |
| **AI calls: server-side only** | Client calls `/api/ai/*`, server calls Gemini/OpenAI with secret key. Never `GoogleGenAI` in client code. |
| Validate tenant membership on every tenant-scoped operation | See `method-core.md` Multitenancy Baseline |
| **Firebase services in `europe-west1` / `europe-west4`** | RGPD + latency; no US default regions |

### API Route Pattern (with Guard)

```typescript
// app/api/invoices/route.ts
import { enforceApiGuard } from '@/lib/security/guard';
import { verifyAuth } from '@/lib/auth';
import { invoiceSchema } from '@/lib/schemas/invoice';

export async function POST(req: NextRequest) {
  // 0. Security guard (rate limit, payload, content-type)
  const guardError = enforceApiGuard(req, {
    maxPayloadBytes: 1 * 1024 * 1024,
    rateLimit: { maxRequests: 10, windowMs: 60000 },
    requireJson: true,
  });
  if (guardError) return guardError;

  const user = await verifyAuth(req);                 // 1. Auth
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const data = invoiceSchema.parse(body);             // 2. Validate
  
  await verifyTeamMembership(user.uid, data.teamId);  // 3. Tenant check
  
  const result = await createInvoice(data);           // 4. Service call
  return Response.json(result);
}
```

---

## ⚡ 4. POWERFUL — Performance & DX

| Rule | Rationale |
|------|-----------|
| `React.memo` only when profiler shows re-render problem | Premature optimization adds complexity |
| Prefer server components for data fetching | No `useEffect` fetch patterns; leverage RSC |
| Always `next/image`, never raw `<img>` | Automatic optimization, lazy loading, WebP |
| Error boundaries at route level (`error.tsx`) | Graceful failures per route segment |
| Loading states at route level (`loading.tsx`) | Instant feedback, no layout shift |
| Custom hooks: prefix `use*`, max 1 side effect | Composable, testable, predictable |
| Prefer `Promise.all` for independent async ops | Parallel > sequential for unrelated fetches |

### Server Component Data Pattern

```typescript
// app/invoices/page.tsx (Server Component — no 'use client')
import { getInvoices } from '@/lib/services/invoices';

export default async function InvoicesPage() {
  const invoices = await getInvoices(); // Direct async — no useEffect needed
  return <InvoiceList invoices={invoices} />;
}
```

---

## 🏗️ 5. STRUCTURAL — Architecture Guards

| Rule | Rationale |
|------|-----------|
| Feature-first folders: `src/features/{feature}/` | Co-locates components, hooks, types per domain |
| Shared utilities in `src/lib/` | Cross-feature logic has a single home |
| Shared components in `src/components/` | Reusable UI primitives live apart from features |
| No circular imports | Breaks build, signals tangled architecture |
| API routes: thin controllers → service functions | Controllers validate + delegate; logic lives in `src/lib/services/` |
| Firestore access only through `src/lib/firebase/` | No scattered `doc()` / `collection()` calls |
| One concern per file | Don't mixutils, components, and types in a single file |

### Folder Structure Reference

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (thin controllers)
│   ├── (auth)/             # Route groups
│   └── invoices/
│       ├── page.tsx
│       ├── loading.tsx
│       └── error.tsx
├── components/             # Shared UI components
│   ├── ui/                 # Primitives (Button, Card, Input)
│   └── layout/             # Layout components (Sidebar, Header)
├── features/               # Feature modules
│   ├── invoices/
│   │   ├── InvoiceForm.tsx
│   │   ├── useInvoices.ts
│   │   └── invoice.utils.ts
│   └── settings/
├── lib/                    # Shared logic
│   ├── firebase/           # All Firestore access
│   ├── schemas/            # Zod schemas + types
│   ├── services/           # Business logic
│   └── utils/              # Pure utility functions
└── locales/                # i18n strings (EN/FR)
```

---

## 💎 6. REAL — Data Integrity

**No mock data. Ever.** Every data path wires to live sources (HubSpot / Firestore). No fixtures, no "demo data" fallback. If real data is unavailable, render an explicit empty/error state — never substitute mocks. Project non-negotiable (see `SOUL.md`).

| Rule | Rationale |
|------|-----------|
| No mock / fixture data in app code | Mock data masks real integration bugs and ships misleading dashboards |
| No silent "demo data" fallback | A fallback hides outages; show an explicit empty/error state instead |
| Test doubles only under `__tests__/` or `*.test.*` | Fakes belong in tests, never in shipped paths |
| Remove mock paths on sight | Treat leftover mocks as debt to delete, not maintain |

**Enforced by** the `swanifly-claude-addon` no-mock guard (a `PostToolUse` hook that flags `mockData`, `fixtures`, `faker`, etc. in source files) and by Vera's Review Gate. See `tools/swanifly-claude-addon/`.

---

## ESLint Enforcement

**Minimum `.eslintrc.json`** (hardened from default):

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/consistent-type-imports": ["error", { "prefer": "type-imports" }],
    "@typescript-eslint/no-non-null-assertion": "warn",
    "no-eval": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "no-var": "error",
    "react/no-danger": "error"
  }
}
```

**Scripts:**
```bash
npm run lint           # Standard lint
npm run lint:strict    # Zero warnings allowed (CI gate)
npm run typecheck      # TypeScript strict check
```

---

## Relationship to Other METHOD Files

| File | Overlap | This file adds |
|------|---------|----------------|
| `method-core.md` | Security Baseline, Performance Baseline | Specific rules, patterns, ESLint config |
| `claude-rules.md` | Working agreements | Code-level enforcement (not workflow) |
| `tests-method.md` | Testing strategy | Rules that make code more testable |
| `design-method.md` | Component patterns | Structural rules for component architecture |

**This file is the "HOW to write code" reference. Others cover "WHAT to build" and "HOW to work."**

---

## Routing

| Agent | When to load |
|-------|-------------|
| **Brian** | Every implementation task |
| **Kasper** | Security review, audit |
| **Vera** | Review Gate (check overrides) |
| **Aiko** | AI feature implementation |

---

**Owner:** Kasper + Brian  
**Last Updated:** 2026-06-01
