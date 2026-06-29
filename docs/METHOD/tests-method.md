# Testing Strategy

**Owner:** Sage (with Lucia for method-level)  
**Version:** 308.a  
**Purpose:** Test types, strategies, tools, fixtures

---

## Testing Philosophy

**Tests are documentation.**

Good tests show:
- What the feature does
- What edge cases exist
- What assumptions we make

**Not all code needs tests.** Prioritize:
1. Business logic (calculations, transformations)
2. Critical paths (auth, payment, data persistence)
3. Complex UI interactions (forms, multi-step flows)

---

## Test Strategy

**Default approach (all tasks):**
- **Unit tests:** Critical logic, utilities, business rules
- **Integration tests:** Firebase operations that are complex (transactions, batches, multi-doc writes)
- **Smoke tests:** Manual, after every sprint task
- **E2E tests:** Required — one Playwright spec per CUJ (see §4 below)

**Add when justified by risk:**
- **Component tests:** Reusable or interactive components (forms, modals, complex UI)
- **Architectural tests:** When enforcing layer boundaries matters

---

## Test Pyramid

```
        /\
       /E2E\        ← Few (slowest, most brittle)
      /------\
     /Component\    ← Some (medium speed)
    /----------\
   / Integration \  ← More (external services)
  /--------------\
 /     Unit       \ ← Most (fast, reliable)
/------------------\
```

**Target distribution:**
- 60% unit
- 25% integration
- 10% component
- 5% E2E

---

## Test Types

### 1. Unit Tests

**What:** Pure functions, utilities, business logic

**Tools:** Vitest (web), Jest (mobile)

**Example:**
```typescript
// src/lib/formatCurrency.test.ts
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats CAD currency', () => {
    expect(formatCurrency(1234.56, 'CAD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'CAD')).toBe('$0.00');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-100, 'CAD')).toBe('-$100.00');
  });
});
```

**When to write:** If the logic is complex, non-obvious, or handles money/auth/data permanence — always test it. Skip trivial getters/setters.

---

### 2. Integration Tests

**What:** External services (Firebase, APIs)

**Tools:** Vitest + Firebase Emulator (web), Jest + Emulator (mobile)

**Example:**
```typescript
// src/lib/invoices.test.ts
import { saveInvoice, getInvoice } from './invoices';
import { useFirebaseEmulator } from '@/tests/setup';

describe('Invoice operations', () => {
  useFirebaseEmulator(); // Start emulator before tests

  it('saves and retrieves invoice', async () => {
    const invoice = { amount: 1000, clientId: 'client-123' };
    const id = await saveInvoice(invoice);
    const retrieved = await getInvoice(id);
    
    expect(retrieved).toMatchObject(invoice);
  });

  it('throws error if invoice not found', async () => {
    await expect(getInvoice('invalid-id')).rejects.toThrow('Invoice not found');
  });
});
```

**When to write:** If the Firebase operation uses transactions, batches, or security-sensitive reads/writes.

---

### 3. Component Tests

**What:** React components, user interactions

**Tools:** Vitest + React Testing Library (web), Jest + React Native Testing Library (mobile)

**Example:**
```typescript
// src/components/SettingsForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsForm } from './SettingsForm';

describe('SettingsForm', () => {
  it('updates user name', async () => {
    const onSave = vi.fn();
    render(<SettingsForm onSave={onSave} />);

    const input = screen.getByLabelText('Name');
    fireEvent.change(input, { target: { value: 'Alice' } });
    
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({ name: 'Alice' });
    });
  });

  it('shows validation error if name empty', async () => {
    render(<SettingsForm onSave={vi.fn()} />);

    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
  });
});
```

**When to write:** When the component is reusable or involves complex user interactions (forms, multi-step flows, modals).

---

### 4. E2E Tests

**What:** Full user journeys (login → action → verify)

**Tools:** Playwright (web), Detox (mobile)

**Example:**
```typescript
// tests/e2e/invoice-flow.spec.ts
import { test, expect } from '@playwright/test';

test('create and view invoice', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button:has-text("Sign in")');

  // Create invoice
  await page.click('a:has-text("New Invoice")');
  await page.fill('[name="clientName"]', 'Acme Corp');
  await page.fill('[name="amount"]', '1000');
  await page.click('button:has-text("Save")');

  // Verify
  await expect(page.locator('text=Invoice created')).toBeVisible();
  await expect(page.locator('text=Acme Corp')).toBeVisible();
  await expect(page.locator('text=$1,000.00')).toBeVisible();
});
```

**When to write:** **Required.** One Playwright spec per CUJ, written when the CUJ is first implemented. The spec IS the acceptance criteria — a passing spec proves the journey works, a failing spec blocks the merge.

**Rule:** A CUJ cannot pass its Exit Gate (see `sprints-method.md`) without a passing Playwright spec.

**Spec naming:** `tests/e2e/{NN}-{cuj-name}.spec.ts` (e.g., `01-auth-flow.spec.ts`, `02-quote-creation.spec.ts`)

**CI integration:** E2E specs run in GitHub Actions on every push. See `templates/CI-TEMPLATE.yml` for setup.

**Setup guide:** See `templates/PLAYWRIGHT-SETUP.md` for initial Playwright configuration.

---

### 5. Architectural Tests

**What:** Enforce boundaries, hexagonal architecture

**Tools:** Custom test utilities

**Example:**
```typescript
// tests/architectural/boundaries.test.ts
import { getAllFiles } from './test-utils';

describe('Architectural boundaries', () => {
  it('domain layer does not import from infrastructure', () => {
    const domainFiles = getAllFiles('src/domain');
    
    domainFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('from "@/lib/firebase"');
      expect(content).not.toContain('from "@/lib/api"');
    });
  });

  it('UI components do not import domain directly', () => {
    const componentFiles = getAllFiles('src/components');
    
    componentFiles.forEach(file => {
      const content = readFileSync(file, 'utf-8');
      expect(content).not.toContain('from "@/domain"');
    });
  });
});
```

---

## Test Fixtures & Builders

**Problem:** Creating test data is repetitive

**Solution:** Builders pattern

**Example:**
```typescript
// tests/builders/invoice.ts
import { Invoice } from '@/types';

export function buildInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-123',
    clientId: 'client-456',
    clientName: 'Acme Corp',
    amount: 1000,
    currency: 'CAD',
    status: 'draft',
    createdAt: new Date('2025-11-15'),
    ...overrides,
  };
}

// Usage in tests:
const invoice = buildInvoice({ amount: 2000, status: 'paid' });
```

**Benefits:**
- DRY (don't repeat yourself)
- Easy to update (change builder, all tests update)
- Clear overrides (only specify what's different)

---

## Mocking

### Mock External Services

**Firebase (use emulator):**
```typescript
// tests/setup.ts
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectAuthEmulator } from 'firebase/auth';

export function useFirebaseEmulator() {
  beforeAll(() => {
    connectFirestoreEmulator(firestore, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
  });
}
```

**APIs (use MSW):**
```typescript
// tests/mocks/api.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  rest.get('/api/clients', (req, res, ctx) => {
    return res(ctx.json([
      { id: '1', name: 'Acme Corp' },
      { id: '2', name: 'Wayne Enterprises' },
    ]));
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Test Organization

```
tests/
  unit/                  # Unit tests (can also be co-located with src/)
    formatCurrency.test.ts
  integration/           # Integration tests
    firebase/
      invoices.test.ts
      clients.test.ts
  component/             # Component tests
    SettingsForm.test.tsx
  e2e/                   # E2E tests
    invoice-flow.spec.ts
    auth-flow.spec.ts
  architectural/         # Architectural tests
    boundaries.test.ts
  builders/              # Test data builders
    invoice.ts
    client.ts
  mocks/                 # Mock data, MSW handlers
    api.ts
  setup.ts               # Global test setup
```

---

## Running Tests

### Unit + Integration
```bash
npm test                # Run all
npm test -- invoices    # Run specific test
npm run test:coverage   # Coverage report
npm run test:watch      # Watch mode
```

### E2E
```bash
npm run test:e2e        # Headless
npm run test:e2e:ui     # With UI (Playwright UI mode)
```

### All
```bash
npm run test:all        # Unit + Integration + E2E
```

---

## Coverage

### View Coverage
```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Goals
- **Statements:** >80%
- **Branches:** >75%
- **Functions:** >80%
- **Lines:** >80%

**Exceptions:** Don't force 100% on:
- UI boilerplate (`<div>` wrappers)
- Error handling (rare edge cases)
- Dead code (deprecate and remove instead)

---

## Smoke Tests (Manual)

**After each sprint task:**

1. **Start app:**
   ```bash
   npm run dev
   ```

2. **Test critical path:**
   - Login (or visit public page)
   - Navigate to feature
   - Perform action (save, update, delete)
   - Verify result (data persisted, UI updated)

3. **Check logs:**
   - Browser console (no errors)
   - Network tab (no failed requests)
   - Firebase logs (no errors)

4. **Document:**
   - Append to sprint task file:
     ```markdown
     ## Smoke Test
     - ✅ Started app on port 3000
     - ✅ Tested settings page: update name → saved successfully
     - ✅ No console errors
     - ✅ Firestore updated correctly
     ```

---

## Visual Snapshot Testing (Claude Code + Playwright)

**What:** Screenshot-based visual validation of the app UI at sprint end. Captured by Claude
Code driving **Playwright** (headless or headed), or via an MCP browser tool. Serves as:
- Visual proof that the sprint's UI changes render correctly
- Regression baseline for future sprints
- Lightweight alternative to full visual regression suites

**When:** Sprint consolidation (step 7 of Junia's Consolidation ritual in `sprints-method.md`)

**How:**
1. Start the app locally (`npm run dev`) or use the staging URL
2. Claude Code runs a short Playwright script that navigates the critical paths modified in the sprint
3. One screenshot per major screen/state (e.g., empty state, filled state, error state)
4. Save to `docs/sprints/{sprint}/screenshots/`
5. Name: `{sprint}-{feature}-{state}.png` (e.g., `015-notifications-enabled.png`)
6. Append screenshot paths to `{sprint}-z ☑️ Vera - sprint review.md`

**Example Playwright snippet (run by Claude Code at consolidation):**
```ts
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:3000/settings/notifications');
await p.screenshot({ path: 'docs/sprints/015/screenshots/015-notifications-enabled.png' });
await b.close();
```

**What to capture (minimum per sprint):**
- [ ] Each screen/feature introduced or modified
- [ ] At least one empty state (if applicable)
- [ ] At least one filled/active state
- [ ] Dark mode variant (if dark mode was touched)

**Gotchas:**
- App must be running before the Playwright script navigates to it
- Auth-gated screens: ensure a test user is logged in, or use a non-gated route first
- Screenshots are stored in `docs/` (not `src/`), committed alongside sprint artifacts

---

## Test-Driven Development (Optional)

**Process:**
1. Write failing test (red)
2. Write minimal code to pass (green)
3. Refactor (clean)

**Example:**
```typescript
// 1. Red: Test first
test('formatCurrency formats CAD', () => {
  expect(formatCurrency(1000, 'CAD')).toBe('$1,000.00');
}); // FAILS (function doesn't exist)

// 2. Green: Minimal implementation
export function formatCurrency(amount: number, currency: string): string {
  return `$${amount.toFixed(2)}`;
} // PASSES (but incomplete)

// 3. Refactor: Add comma separator
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount);
} // PASSES (complete)
```

**When to use:**
- Complex logic (calculations, algorithms)
- Bug fixes (write test that reproduces bug, then fix)

---

## Gotchas

**Q: Tests are slow. How to speed up?**

A:
- Use `test.only` during development (focus on one test)
- Run unit tests first (fast feedback)
- Use watch mode (`npm run test:watch`)
- Parallelize E2E tests (Playwright runs in parallel by default)

---

**Q: Test passes locally, fails in CI.**

A:
- Check environment variables (CI may not have .env.local)
- Check Firebase emulator (CI needs to start emulator)
- Check timing (CI may be slower, add `waitFor`)

---

**Q: Should I test every function?**

A: Test critical logic; skip trivial getters/setters. If something breaks silently in production, it needed a test.

---

## Next Steps

1. **Per task:** Write unit tests for complex logic; smoke test every task
2. **Per CUJ:** Write Playwright E2E spec BEFORE or DURING CUJ implementation — not after
3. **Per sprint close:** All E2E specs pass in CI before Kill Gate
4. **Quarterly:** Review coverage, identify gaps, graduate smoke tests to E2E

---

**Owner:** Sage (execution), Lucia (method-level)  
**Last Updated:** 2026-06-01

