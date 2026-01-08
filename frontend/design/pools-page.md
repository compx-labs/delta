You are implementing Delta (delta.compx.io) Pools and Pool Detail pages.

High-level goals:
- Delta is neutral, monochrome-first, infrastructure-grade.
- Do not add marketing copy, hype language, gradients, illustrations, charts, or animations.
- Use monospace only (Space Mono or JetBrains Mono).
- Accent color (jade) #6E8F7D is signal only: primary CTA, active states, APR when active.
- Avoid em dashes. Use plain hyphens.

Routing constraint:
- Pool detail must be opened via query params, not dynamic routes.
- Use /pools?poolId=<id>
- Keep /pools as the single page for listing and details (details as a right-side panel or modal on desktop, full page on mobile is acceptable but still driven by query params).
- Changing pool selection updates the URL query params.
- Direct navigation to /pools?poolId=... must load the correct pool.

Deliverables:
1) Implement a Pools page at /pools with:
   - Header: "Pools" + muted subtext "Permissionless reward distribution"
   - Primary CTA: "Create pool" links to /create (or placeholder route if not implemented)
   - Filters row (minimal): Type (All, Single, LP), Status (Active, Inactive), Search (by asset/pool id)
   - Default sort: Active first, then alphabetical by pool display name
   - Table layout (not cards), responsive to mobile
   - Each row clickable and sets poolId query param

2) Implement a Pool Detail view driven by query params:
   - Reads poolId from URL search params
   - Fetches pool detail data using poolId
   - Renders:
     - Title: pool display name
     - Type label: "Single-asset pool" or "LP pool"
     - Status indicator: Active/Inactive with dot (jade for active, grey for inactive)
     - Key stats grid (no charts):
       - APR (jade only if active)
       - Total staked (TVL)
       - Reward asset(s)
       - Rewards remaining
       - End date (if present)
     - Action panel:
       - Amount input
       - Stake / Unstake button
       - Claim rewards button (enabled only if claimable > 0)
     - Pool parameters (read-only):
       - Pool ID (copy)
       - Deposit asset (copy)
       - Reward asset(s) (copy)
       - Reward schedule (start/end)
       - Creator address (copy)
       - Contract/app id (copy)
   - Must handle loading, missing poolId, invalid poolId with neutral empty states

3) Query param behavior:
   - Selecting a pool row sets ?poolId=<id> with shallow navigation (no full reload if framework supports it)
   - Back/forward navigation switches selected pool correctly
   - Clearing pool selection removes poolId param and closes the detail panel
   - On mobile, it is okay to navigate to the same /pools page but render detail view as the main content when poolId exists

Data assumptions:
- Implement with a placeholder fetch layer that can be swapped later.
- Create a small client function:
  - getPools(filters) -> returns array of pools
  - getPoolDetail(poolId) -> returns pool detail object
- For now, mock these with in-file data or a simple local JSON response, but structure the code to plug in a real endpoint.

Data model (use these fields, adjust minimally):
PoolListItem:
- id: string
- displayName: string (e.g. "xUSD / ALGO" or "COMPX")
- type: "single" | "lp"
- depositAsset: { symbol: string, id?: string }
- rewardAssets: Array<{ symbol: string, id?: string }>
- apr: number | null
- tvlUsd: number | null
- status: "active" | "inactive"

PoolDetail:
- id: string
- displayName: string
- type: "single" | "lp"
- status: "active" | "inactive"
- apr: number | null
- tvlUsd: number | null
- user:
  - stakedAmount: number
  - claimableRewards: Array<{ symbol: string, amount: number }>
- depositAsset: { symbol: string, id?: string, decimals?: number }
- rewardAssets: Array<{ symbol: string, id?: string, decimals?: number }>
- rewardsRemaining: Array<{ symbol: string, amount: number }>
- schedule:
  - startTime: string | null (ISO)
  - endTime: string | null (ISO)
- creator: string
- contractRef: { appId?: string, address?: string }

UX + copy rules:
- Always call them "Pools"
- Do not use "farm", "yield", "boost", "earn"
- Use neutral terms:
  - "Rewards"
  - "Active"
  - "Inactive"
  - "Stake"
  - "Unstake"
  - "Claim"
- Empty states must be calm and text-only:
  - No pools: "No pools available. Pools will appear here once incentive programs are created."
  - No pool selected: "Select a pool to view details."
  - Invalid poolId: "Pool not found."

UI style requirements:
- Monochrome base:
  - near-black #0B0D10 background
  - off-white #F5F6F7 primary text
  - slate #5E646B secondary text
  - mid grey #A3A7AD borders/dividers
- Jade #6E8F7D only for:
  - primary CTA
  - active dot
  - active APR
  - focused input ring (optional, subtle)
- Use subtle 1px borders, no heavy shadows.
- Use spacing and typography for hierarchy.
- Minimal icons. If used, keep them abstract and tiny.

Implementation details:
- Build reusable components:
  - <Section title ...>
  - <StatItem label value>
  - <StatusDot status>
  - <PoolsTable pools onSelectPool>
  - <PoolDetailPanel poolId onClose>
  - <CopyField label value>
- Use URLSearchParams helpers:
  - getPoolId()
  - setPoolId(id)
  - clearPoolId()
- Ensure accessibility:
  - buttons have labels
  - inputs have labels
  - focus states visible (jade ring ok)

Finish criteria:
- /pools renders list + filters + neutral copy
- clicking a row updates URL and shows details
- direct navigation to /pools?poolId=... works
- back/forward works
- visuals match Delta constraints

Do not invent extra pages, product features, or marketing sections.
Implement only what is described.
