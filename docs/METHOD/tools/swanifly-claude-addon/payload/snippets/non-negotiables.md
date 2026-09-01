## Non-negotiables

1. **No mock data. Ever.** Wire every data path to live HubSpot/Firestore. No fixtures, no "demo data" fallback. If real data is unavailable, show an explicit empty/error state — never substitute mocks. Remove any mock paths you find.
2. **Real data is the product.** Dashboards, CRM, sales, RevOps run on live data so what's shown is true.
3. **UX bar:** fluid, ergonomic, clean, fast, complete — for every persona. Light + lazy-loaded images; header always visible; menus full-height; popovers centered.
4. **Plan-driven:** work from the plan/sprint to-dos; don't edit the plan; don't stop until the to-dos are done.
5. **Data integrity:** Zod-validate every Firestore write (`schema.parse` before `setDoc`); tenant-scoped paths `teams/{teamId}/*`; Firestore access only through `src/lib/firebase/`.
6. **Ship clean:** TypeScript strict (no `any`), no secret leakage in `NEXT_PUBLIC_*`, pass the QA gate before deploy.
