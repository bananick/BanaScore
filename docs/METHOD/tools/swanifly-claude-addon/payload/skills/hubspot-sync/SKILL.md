---
name: hubspot-sync
description: >-
  Pull live HubSpot CRM data into Firestore — contacts, deals, companies, activities,
  campaigns. Use when the user says "sync hubspot", "get real CRM data", "remove mock
  data from sales", "wire the dashboard to hubspot", or wants sales/RevOps views on
  real data. Never uses mock fallbacks; supports segment/campaign filters.
---

# hubspot-sync

Keeps the sales / RevOps / CRM surfaces on **live HubSpot data**, persisted to Firestore. This skill exists to kill mock data in the commercial views (`SOUL.md` non-negotiable #1).

## Source: HubSpot MCP

Use the connected HubSpot MCP tools (load via ToolSearch — e.g. `query_crm_data`, `search_crm_objects`, `get_crm_objects`, `get_properties`, `get_campaign_analytics`, `get_campaign_contacts_by_type`). Pull:
- **Contacts**, **companies**, **deals** (pipeline stages, amounts, owners), **activities** (emails, calls, meetings, tasks).
- **Campaign** + landing-page analytics for attribution.

## Sink: Firestore (per data rules)

- Write through `src/lib/firebase/` only — no raw Firestore access elsewhere.
- **Zod-validate every write**: `schema.parse(data)` before `setDoc()`.
- Tenant-scoped paths: `teams/{teamId}/...`.
- Update `docs/project/SCHEMA.md` if collections/fields change.

## Segments / campaigns

Support filtering prospection lists, deals, and analytics by **segment/market/campaign** — e.g. `buralistes`, `banamag`, `CSE`, team-building — so the dashboards let the user follow each campaign (contacted lists, mailing sequences, deal follow-up).

## Hard rules

- **No mock data, no demo fallback.** If HubSpot is unreachable or a field is missing, surface an explicit empty/error state — never substitute placeholder values.
- Where any mock/sample CRM data still exists in the app, **remove it** as part of the sync.
- Don't print credentials or full PII dumps in summaries; report counts and a small sample.

## Output

Report what was synced (object types + counts), where it landed (collections), any schema changes, and any records that failed validation (with reasons). Then suggest running `/ship-check` to confirm no mock paths remain.
