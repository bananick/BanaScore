---
name: ads-ops
description: >-
  Set up, audit, and optimize Google Ads campaigns and their funnels. Use when the
  user mentions "google ads", "campaign settings", "negative keywords", "lead magnet",
  "conversion funnel", "ads performance", or growth/acquisition analysis. Ties campaigns
  to the CRM segments and landing pages.
---

# ads-ops

Growth-marketing ops for the Bana/Swanifly funnels. Covers campaign setup, audits, and analysis — tied back to CRM segments and landing pages.

## What it does

**Campaign setup / audit**
- Structure campaigns by **segment/market** (e.g. buralistes, banamag, CSE, team-building).
- Settings review: locations, schedules, bidding, budgets, conversion tracking, audiences.
- **Negative keywords** — build/maintain negative lists (the user does this often, e.g. CSE); flag waste.
- Lead-magnet / offer alignment with the matching landing page.

**Performance analysis**
- Pull/define the metrics that matter: CTR, CPC, conv. rate, CPA, ROAS by campaign + segment.
- Trace the funnel: ad → landing page → lead → CRM deal. Find the weakest step and recommend the fix.
- Tie results to CRM data via `/hubspot-sync` so spend maps to pipeline, not just clicks.

**Scripts**
- When useful, draft Google Ads scripts (automated rules, reporting, n-gram/negative mining).

## Working rules

- Real data only (`SOUL.md`) — base recommendations on actual account/CRM numbers, never invented figures.
- Output in the user's language (EN/FR).
- Be concrete: exact keyword lists, exact setting changes, exact budget moves — not generic advice.
- Coordinate with `/landing-page` (destination) and `/hubspot-sync` (attribution).

## Note

This skill plans, audits, and drafts. **Do not change live budgets, bids, or campaign status on the user's behalf** — present the changes and let the user apply them in Google Ads.
