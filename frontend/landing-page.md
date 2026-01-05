Absolutely. Here’s a **Claude-ready UI implementation brief** for the Delta landing page (`delta.compx.io`) using the content we wrote, with clear sections, components, and rules. This is structured so Claude can implement without inventing extra marketing.

---

## Delta Landing Page UI Brief (Claude Implementation)

### Page goal

A neutral, infrastructure-grade landing page for **Delta**.
It should communicate what Delta is, what it does, and provide direct navigation into the app.

### Tone and constraints

* Neutral, factual copy only
* Monochrome-first UI
* Jade accent only for active/primary states
* No gradients, no decorative illustration, no hype language
* Minimal motion (basic hover/focus only)
* Monospace typography (Space Mono / JetBrains Mono)

---

## Layout structure

### 0) Top Nav (sticky optional)

**Left:** `delta` wordmark (lowercase)
**Right:** links (simple text buttons):

* Pools
* Create
* Docs
* App (primary CTA, jade)

Rules:

* No heavy nav background
* Light border line or subtle shadow allowed, but minimal
* Active route indicator can use jade

---

### 1) Hero Section (above the fold)

**Heading (H1):**
`Delta`

**Subheading (H2 or muted lead):**
`The neutral incentives network.`

**Body copy (2–3 lines max):**
Delta is the canonical place to create and participate in staking and farming programs on Algorand.
Permissionless, predictable, and designed to run quietly in the background of the ecosystem.

**Primary CTA (jade):**
`View pools` → `/pools`

**Secondary CTA (ghost/text):**
`Create a pool` → `/create`

**Optional small links below CTAs:**
`Documentation` → `/docs`

Hero design notes:

* Center-left aligned on desktop, stacked on mobile
* No hero image required
* Background: near-black
* Use whitespace and typography, not decoration

---

### 2) Stats Strip (quiet, optional but useful)

This should feel like “system readouts”, not marketing.

**If live data exists:** render real numbers.
**If not:** render placeholders but keep them subdued (or hide section).

Suggested stats (4 items, responsive grid):

* Active pools
* Total value staked
* Rewards distributed (30d)
* Average APR (active pools)

Formatting:

* Label (small, slate grey)
* Value (larger, off-white)
* If a stat is unavailable, show `--` not `0`

No charts. No sparklines. No bright colors except jade for “network active” indicator.

Optional indicator:

* `Network: Active` (jade dot + text) if `active pools > 0`
* Otherwise `Network: Idle` (grey)

---

### 3) What Delta Does (3-column cards or simple list)

Section title:
`What Delta does`

Intro sentence:
Delta provides shared infrastructure for distributing rewards across many participants, pools, and assets.

Three minimal cards (no icons required, or use tiny abstract squares):

1. **Permissionless pools**
   Create staking or farming pools without approval.

2. **Transparent rewards**
   Fixed schedules, visible rates, predictable distribution.

3. **Non-custodial participation**
   Stake, earn, and exit according to pool rules.

Card style:

* Flat cards or bordered panels
* No gradients
* Jade only on hover border or small emphasis, not backgrounds

---

### 4) What Delta Is Not (strict, trust-building)

Section title:
`What Delta is not`

Bullet list:

* A marketing platform
* A yield optimizer
* A governance surface
* A gamified rewards app

Small note below:
There are no tiers, campaigns, or featured pools. Delta treats all pools equally.

Style:

* Simple text block
* Keep it short and direct

---

### 5) Designed for Longevity (single paragraph + bullets)

Section title:
`Designed for longevity`

Copy:
Delta is built for programs that run for months, not days.

Bullets:

* Predictable behaviour
* Clear reward schedules
* Stable incentives
* Minimal surface area

---

### 6) Permissionless by Default (implementation detail copy)

Section title:
`Permissionless by default`

Bullets:

* Open to any ASA
* Pool creation requires no approval
* Fully on-chain and non-custodial
* Discovery and ordering are neutral

Optional small footnote:
If a pool exists, it is visible.

---

### 7) Economic Alignment (xUSD + FLUX)

Section title:
`Economic alignment`

Two stacked panels (or 2-column on desktop):

**Panel A: xUSD**

* Title: `xUSD`
* Copy:
  xUSD is the primary unit of account for incentives. It reduces reward volatility and improves comparability between pools.

**Panel B: FLUX**

* Title: `FLUX`
* Copy:
  FLUX represents long-term alignment. It may be used for parameter changes and system-level decisions. FLUX is not required to participate.

Rules:

* Do not present FLUX as a paywall
* Keep wording neutral
* No badges, no tier marketing

---

### 8) How Delta Fits In (ecosystem links)

Section title:
`How Delta fits in`

Copy:
Delta is part of a layered financial system. It works alongside:

List with simple links (text only):

* NovaDEX (liquidity)
* Orbital (lending)
* Turbine (strategy routing)
* Canix (discovery)
* Waypoint (payments)

Note:
Delta does not compete with these products. It enables them.

Implementation:

* These can link to their subdomains if available
* Use subtle underline on hover

---

### 9) Interface Philosophy (reinforces design restraint)

Section title:
`Interface philosophy`

Two small columns:

**You should see**

* Active pools
* Reward rates
* Pool status

**You should not see**

* Promotions
* Animated metrics
* Artificial urgency

Final line:
If nothing is active, the interface remains quiet.

---

### 10) Footer

Left:
`delta.compx.io`

Right links:

* Docs
* App
* Core
* Status (optional)

Small text:
Delta exists to distribute rewards neutrally and predictably.

No social icons required.

---

## Component rules (important)

* Monospace everywhere (Space Mono or JetBrains Mono)
* Use consistent spacing scale, avoid clutter
* No background textures
* No decorative illustrations
* Jade (`#6E8F7D`) only for:

  * Primary CTA
  * Active pool indicators
  * “Network active” state
* Default page should look almost monochrome

---

## Data integration requirements (optional)

If you can fetch stats:

* Use a simple endpoint from Delta backend/indexer
* Cache responses
* Display `--` when loading or unavailable
* Do not animate numbers

---

## Deliverables Claude should implement

* `LandingPage.tsx` with the full layout above
* Reusable components:

  * `StatItem`
  * `Section`
  * `Panel`
* Responsive grid behaviour for:

  * Stats strip
  * “What Delta does” cards
  * Economic alignment panels

---
