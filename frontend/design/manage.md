You are implementing a new top-level page in Delta (delta.compx.io) called Manage, used for creators to manage pools they created.

Global constraints (must follow):
- Delta is neutral, monochrome-first, infrastructure-grade.
- Monospace typography only (Space Mono or JetBrains Mono).
- No hype language, gradients, illustrations, charts, or heavy motion.
- Accent color is signal only (use the repo’s accent token, do not hardcode).
- Avoid em dashes. Use hyphens.
- Calm copy. No exclamation marks.

Navigation:
- Add "Manage" as a top-level nav item alongside Pools, Create, Docs, App.
- Manage should be easy to discover from the main nav.
- Route: /manage

Behavior summary:
- /manage displays only pools created by the connected user.
- Pools appear in a table/list with key admin-facing info.
- Clicking a row on desktop navigates to a dedicated management page using query params:
  - /manage?poolId=<id>
- On mobile:
  - rows can expand, and a "Manage pool" button appears inside the expanded area
  - Clicking "Manage pool" navigates to /manage?poolId=<id>
- For now, /manage?poolId=<id> can render a placeholder management page with minimal content. We will spec full management later.

Deliverables:
1) /manage page with:
   - Header: "Manage"
   - Muted subtext: "Pools you created"
   - If wallet not connected: neutral empty state with CTA to connect
   - If connected but no pools: neutral empty state
   - Table (desktop) and expandable rows (mobile)
   - Query param navigation to pool management placeholder

2) Placeholder management view:
   - If URL has poolId:
     - Show title: "Manage pool"
     - Show pool displayName and poolId
     - Show a small read-only summary panel (same fields as list row)
     - Include a "Back to manage" link that clears poolId and returns to list view
   - No other functionality yet

Query param rules:
- /manage is the list
- /manage?poolId=... is the management placeholder
- Back/forward navigation must work
- Clearing poolId returns to list

Data integration:
- Implement a placeholder data provider with test data included in code.
- Structure code so it can be swapped to real backend later.

Implement these placeholder API functions:
- getConnectedWallet() -> { isConnected: boolean, address?: string }
- getPoolsCreatedBy(address: string) -> ManagePoolListItem[]
- getManagePoolDetail(poolId: string) -> ManagePoolDetail | null

Test data requirements:
- Include at least 5 pools across single and LP types.
- Mix statuses: active and inactive.
- Include varied stakers count, remaining rewards, end dates.
- Include at least 1 pool with no end date (if your model supports it) or far future end date.
- Include at least 1 pool with APR null and show "--".
- Ensure 2 pools have the same reward asset (e.g. xUSD) to validate display.

Data model (use these fields):
ManagePoolListItem:
- id: string
- displayName: string
- type: "single" | "lp"
- status: "active" | "inactive"
- stakers: number
- apr: number | null
- apy: number | null (optional, can be derived or null)
- rewardsRemaining: Array<{ symbol: string, amount: number }>
- endDate: string | null (ISO date or null)
- createdAt: string (ISO)
- stakeAsset: { symbol: string, id: string }
- rewardAssets: Array<{ symbol: string, id: string }>

ManagePoolDetail:
- same as list item plus:
- creator: string
- contractRef: { appId?: string, address?: string }
- schedule: { startTime: string | null, endTime: string | null }

UI layout and components:

A) Manage list view (/manage with no poolId)

Header row:
- Left:
  - H1: "Manage"
  - Subtext: "Pools you created"
- Right (optional):
  - Small text: "Connected: <short address>" if connected
  - Do not add extra actions yet

Filters (minimal, optional but useful):
- Status: All / Active / Inactive
- Type: All / Single / LP
- Search: "Search by pool or asset"
Default sort:
- Active first
- Then newest (createdAt desc)

Table (desktop):
Columns:
- Pool (displayName + small subtext type)
- Status (dot + label)
- Stakers
- APR
- Remaining rewards
- End date
Row behavior:
- Whole row clickable
- Hover state subtle
- On click: navigate to /manage?poolId=<id>

Formatting rules:
- Status dot uses accent token only when active; otherwise grey.
- APR:
  - if null show "--"
  - if active show accent color, otherwise normal text
- Remaining rewards:
  - show first reward as "123.45 xUSD" and if multiple show "+1" in muted text
- End date:
  - if null show "--"
  - otherwise show YYYY-MM-DD

Mobile layout:
- Use a stacked row with disclosure/expand control
- Collapsed shows:
  - Pool name
  - Status
  - APR
- Expanded shows:
  - Stakers
  - Remaining rewards
  - End date
  - "Manage pool" button (primary, accent)
Clicking "Manage pool" navigates to /manage?poolId=<id>

Empty states:
1) Not connected:
Title: "Connect wallet"
Body: "Connect a wallet to view pools you created."
Button: "Connect" (primary)
2) Connected but none:
Title: "No pools found"
Body: "Pools you create will appear here."

B) Management placeholder view (/manage?poolId=...)

Top:
- Link: "Back to manage" (clears poolId)
- Title: "Manage pool"
- Subtext: pool displayName

Summary panel (read-only):
- Pool ID (copy)
- Type
- Status
- Stakers
- APR
- Remaining rewards
- Schedule start and end
- Contract reference (copy)
- Creator (copy)

Below summary:
- Placeholder text:
  "Pool management controls will be implemented next."
Keep it neutral.

Implementation notes:
- Reuse existing components from Pools page where possible (StatItem, StatusDot, CopyField, Section).
- Use URLSearchParams helpers similar to /pools:
  - getManagePoolId()
  - setManagePoolId(id)
  - clearManagePoolId()

Accessibility:
- Table rows should be focusable and activatable via keyboard.
- Buttons and inputs have labels.
- Focus ring can use accent token.

Finish criteria:
- Manage is present in main nav
- /manage shows list for connected creator
- Clicking row sets ?poolId and renders management placeholder
- Mobile expand + button works
- Back/forward navigation works
- Test data renders correctly
- Styling matches Delta neutrality constraints

Do not implement real admin actions yet. Only UI and navigation scaffolding.
