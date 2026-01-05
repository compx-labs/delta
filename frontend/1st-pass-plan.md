Absolutely — here are **clean, copy-paste-ready design notes for Delta**, written exactly the way you’d want them when doing a first UI pass.

This is **not branding fluff**. It’s a set of *constraints* you can actually design against.

---

# Delta — UI & Design Notes

## Core Design Philosophy

Delta is **infrastructure**, not a product pitch.

It should feel:

* Neutral
* Calm
* Predictable
* Trustworthy
* Inevitable

If Delta looks exciting, it’s wrong.

If Delta looks empty when nothing is active, it’s right.

---

## Visual Tone

Delta should feel like:

* A system that already exists
* Something you depend on, not explore
* Quiet confidence

Avoid:

* Gradients
* Decorative backgrounds
* Motion-heavy UI
* Gamification cues
* Trend-driven styles

---

## Colour System

### Base Palette (dominant)

Use these for ~90% of the UI:

* Near-black: `#0B0D10`
* Off-white: `#F5F6F7`
* Slate grey: `#5E646B`
* Mid grey: `#A3A7AD`

Most screens should read as **monochrome**.

If a screenshot looks colourful, reduce colour.

---

### Accent Colour (locked)

* Jade grey: `#6E8F7D`

This is **signal colour**, not decoration.

---

### Accent Usage Rules

Jade is used **only** for:

* Active pools
* Primary CTA (Create Pool, Stake)
* Current APR / reward indicators
* “Network active” states

Jade is **never** used for:

* Backgrounds
* Large surfaces
* Decorative elements
* Disabled states
* Charts by default

If nothing is active, Delta should appear almost colourless.

---

## Typography

* Monospace only

  * Space Mono or JetBrains Mono
* No display fonts
* No stylistic weights beyond regular / medium

Text should feel like:

* System labels
* Instrument panels
* Readouts

Avoid:

* Marketing language
* Emojis
* Playful phrasing

---

## Layout Principles

* Flat hierarchy
* Few panels
* Clear separation via spacing, not borders
* No visual noise

Prefer:

* Tables
* Lists
* Simple cards with minimal chrome

Avoid:

* Deep nesting
* Accordion-heavy layouts
* Excessive icons

---

## Information Density

Delta is allowed to look sparse.

Empty states are acceptable and intentional.

Example:

> “No active pools”

That’s fine. Do not fill space for comfort.

---

## Interaction & Motion

* Minimal transitions
* No animated numbers
* No pulsing indicators

State changes should be:

* Immediate
* Subtle
* Clear

If motion draws attention to itself, remove it.

---

## Iconography

* Abstract
* Flat
* Line or solid, but consistent
* Small

Avoid:

* Metaphorical icons (coins, farms, plants)
* Illustrative graphics

---

## Language & Copy

Tone:

* Neutral
* Factual
* Calm

Examples:

* “Active pool”
* “Rewards per block”
* “Pool inactive”
* “Stake amount”

Avoid:

* “Earn”
* “Boost”
* “Farm”
* “Maximise”
* Anything hype-coded

---

## Relationship to CompX

Delta should:

* Share wallet connection
* Share account context
* Share FLUX integration

But:

* No CompX colour palette
* No CompX logo dominance
* No “powered by CompX” banners

CompX presence is implicit, not explicit.

---

## Navigation

* Extremely simple
* Likely:

  * Pools
  * Create
  * Activity
  * Docs

No dashboards. No overviews. No “home hero”.

---

## Success Criteria (UI)

Delta UI is successful if:

* It feels boring in a good way
* Users trust it immediately
* Screenshots age well in 2–3 years
* It looks like infrastructure, not a product launch

---

