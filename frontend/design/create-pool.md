You are implementing the Delta (delta.compx.io) Create Pool flow as a multi-step wizard, similar in concept to Waypoint (multi-step), but NOT its styling.

Key constraints:
- Delta is neutral, monochrome-first, infrastructure-grade.
- No marketing language, hype, emojis, gradients, illustrations, charts, or flashy animations.
- Monospace only (Space Mono or JetBrains Mono).
- Accent color is signal only (pick the current Delta accent token in the repo, do not hardcode); use it only for primary CTAs, active step indicator, focus ring, and “active” states.
- Avoid em dashes. Use hyphens.
- Total rewards are FIXED. End condition determines emission rate, not total rewards.
- Use query params for wizard state, because it fits existing infra.

Routing:
- The create flow lives at /create
- Wizard state must be driven by query params:
  - /create?step=1
  - /create?step=2&...
- Back/forward browser navigation must work correctly.
- Direct navigation to a step URL should restore state from query params.
- If required fields for a step are missing, keep the user on the current step and show neutral validation messages.

Deliverables:
1) Create page layout with:
   - Title: "Create pool"
   - Muted subtext: "Configure a permissionless incentive pool"
   - Stepper component at top showing steps and current step
   - Form content panel
   - Footer actions: Back (secondary), Continue (primary), and on final step Confirm and sign

2) Implement wizard steps and URL state:
   Steps should be 5 total:
   1) Type
   2) Assets
   3) Rewards
   4) Metadata (optional fields live here)
   5) Review

   Query params:
   - step: "1" | "2" | "3" | "4" | "5"
   - type: "single" | "lp"
   - stakeAssetId: string
   - rewardAssetId: string
   - totalRewards: string (store as string to avoid float issues)
   - endMode: "endDate" | "targetApr"
   - endDate: string (ISO date, date-only ok)
   - targetApr: string (percentage, e.g. "12.5")
   - assumedTvlUsd: string (needed for targetApr mode)
   - startMode: "now" | "scheduled" (optional, default "now")
   - startDate: string (ISO date-time or date, if scheduled)
   - poolName: string
   - createdBy: string
   - websiteUrl: string (optional)
   - description: string (optional, max 140 chars)
   - tags: string (optional, comma-separated or single string; keep simple)

   Implement helper functions:
   - readParams(): object
   - writeParams(partial): updates URLSearchParams without full reload if framework supports
   - setStep(n), nextStep(), prevStep()
   - validateStep(step, params): returns { ok, errors[] }

3) Data requirements (assets combobox):
   - Implement an AssetSearchComboBox component for selecting stake/reward assets.
   - Must allow searching by:
     - Symbol
     - Name
     - Asset ID
   - For now, use a placeholder data source:
     - getAssets(query) -> returns list
   - Structure code so it can be swapped with real backend/indexer later.
   - Each asset item should include:
     - id (string)
     - symbol (string)
     - name (string, optional)
     - decimals (number, optional)
     - isLpToken (boolean, optional, if detectable)
   - Show selected asset as compact pill with symbol + id.
   - If user selects LP type, warn (neutral) if chosen stakeAsset does not look like an LP token (if isLpToken is available).

4) Step content (details):

Step 1 - Type
- Radio cards or simple radio list:
  - "Single-asset pool"
  - "LP pool"
- Store in type param.
- Continue enabled only when type is set.

Step 2 - Assets
- Stake asset combobox (stakeAssetId)
- Reward asset combobox (rewardAssetId)
- Validation:
  - Both required
  - If stakeAssetId == rewardAssetId: allow, but show a neutral warning: "Stake and reward assets are the same."
- If type == "lp", and selected stake asset isLpToken == false, show warning: "Selected stake asset does not appear to be an LP token."

Step 3 - Rewards
Inputs:
- Total rewards (required) numeric input stored as string:
  - Must be > 0
  - Display token symbol next to input (from rewardAsset)
- Start time (optional):
  - Toggle: Start now (default) vs Schedule start
  - If scheduled: date/time picker -> startDate
- End condition (required):
  - Radio:
    - "Fixed end date"
    - "Target APR"
  - endMode param

Fixed end date mode:
- Date picker for endDate (required)
- Compute and display read-only:
  - "Emission rate" (rewards per day) = totalRewards / durationDays
  - Also show rewards per hour (optional) in smaller text
- Validate:
  - endDate must be after startDate (or after now if startMode=now)
  - minimum duration: 1 day (configurable constant)
  - maximum duration: 2 years (configurable constant)

Target APR mode:
- Input: targetApr (required)
- Input: assumedTvlUsd (required)
- Show derived values read-only (computed):
  - Estimated emission rate per year = (targetApr/100) * assumedTvlUsd / rewardAssetPriceUsd (if price available)
  - If you do not have prices, use a simplified model:
    - Interpret assumedTvlUsd and rewards in USD terms ONLY if reward asset is xUSD or USDC
    - Otherwise, show "Requires price feed" and do not compute USD-based rate
  - Compute an implied end date if possible:
    - If reward asset is a USD stable (xUSD/USDC): implied days = totalRewardsUsd / (targetApr/100 * assumedTvlUsd) * 365
- Very important UX note:
  - Show neutral disclaimer: "APR varies with total staked. Target APR is calculated using the assumed TVL."
Validation:
- targetApr > 0 and reasonable upper bound (config, e.g. 1000)
- assumedTvlUsd > 0

General note in Step 3:
- Total rewards are fixed. End mode determines emission schedule only.

Step 4 - Metadata (optional but recommended)
Required:
- poolName (required, 2-48 chars)
Optional:
- createdBy (0-48 chars)
- websiteUrl (must be valid URL format if provided)
- description (0-140 chars)
- tags (optional)
  - implement as a simple select or free text, but keep neutral
  - If select: allow 1-3 tags max from a fixed list:
    - "Stablecoin"
    - "Liquidity"
    - "Governance"
    - "Infrastructure"
    - "NFT"
    - "Other"
Do not add promotional fields like "featured" or "priority".

Step 5 - Review
Render a summary panel containing:
- Type
- Stake asset (symbol + id)
- Reward asset (symbol + id)
- Total rewards
- Start: now or scheduled (date/time)
- End mode:
  - Fixed end date + computed emission rate, or
  - Target APR + assumed TVL + derived schedule (if computable) + disclaimer
- Pool name
- Created by (if provided)
- Website / description / tags (if provided)

Preflight checklist (read-only, with status):
- Wallet connected (yes/no)
- Opt-in required for stake asset (unknown/yes/no depending on your infra)
- Opt-in required for reward asset (unknown/yes/no)
- Sufficient balance of reward asset to fund total rewards (unknown/yes/no)
- Note: If checks cannot be performed yet, display "Not checked" rather than guessing.

Confirm CTA:
- "Confirm and sign"
- On click, call a placeholder function createPool(params) that returns a list of transactions to sign (mock it if needed):
  - createPool(params) -> { txns: [], summary: {} }
- Show a neutral signing modal/panel:
  - "Review and sign transactions"
  - List count of txns
  - No celebratory animations

5) UI rules:
- Use tables/lists/panels, not marketing cards.
- Keep spacing generous, borders subtle (1px).
- Use monochrome defaults; accent only where necessary.
- Minimal icons.
- Ensure accessible labels and focus states.

6) Components to implement:
- <CreatePoolWizardPage />
- <StepIndicator steps currentStep />
- <AssetSearchComboBox value onChange assetsProvider />
- <NumericInput value onChange suffix />
- <DatePicker /> and optional <DateTimePicker />
- <RadioGroup />
- <ReviewRow label value />
- <PreflightChecklist items />
- URL param helpers in a small utility file

7) Empty and error states:
- Calm, text-only messages.
Examples:
- "Select a stake asset."
- "End date must be after the start date."
- "Enter an assumed TVL to calculate target APR schedule."
No exclamation marks.

Finish criteria:
- Wizard works end-to-end with query param persistence
- Back/forward navigation works across steps and selections
- Review step accurately reflects state
- Validation prevents invalid pool creation
- Styling matches Delta neutrality constraints

Do not implement unrelated pages or features.
Do not invent tokenomics or promotional elements.
Only build what is specified above.
