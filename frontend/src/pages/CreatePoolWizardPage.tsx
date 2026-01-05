import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { StepIndicator } from '../components/StepIndicator'
import { RadioGroup } from '../components/RadioGroup'
import { AssetSearchComboBox, type Asset } from '../components/AssetSearchComboBox'
import { NumericInput } from '../components/NumericInput'
import { DatePicker } from '../components/DatePicker'
import { ReviewRow } from '../components/ReviewRow'
import { PreflightChecklist } from '../components/PreflightChecklist'
import { readParams, writeParams, validateStep, type WizardParams } from '../utils/wizardParams'
import { getAssets } from '../services/assetService'

const STEPS = ['Type', 'Assets', 'Rewards', 'Metadata', 'Review']

export function CreatePoolWizardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [params, setParams] = useState<Partial<WizardParams>>(() => readParams(searchParams))
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [assets, setAssets] = useState<{ stake?: Asset; reward?: Asset }>({})
  const [isSigning, setIsSigning] = useState(false)

  const currentStep = parseInt(params.step || '1', 10)

  useEffect(() => {
    setParams(readParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    // Load asset details when IDs are available
    if (params.stakeAssetId) {
      getAssets(params.stakeAssetId).then(results => {
        const asset = results.find(a => a.id === params.stakeAssetId)
        if (asset) setAssets(prev => ({ ...prev, stake: asset }))
      })
    }
    if (params.rewardAssetId) {
      getAssets(params.rewardAssetId).then(results => {
        const asset = results.find(a => a.id === params.rewardAssetId)
        if (asset) setAssets(prev => ({ ...prev, reward: asset }))
      })
    }
  }, [params.stakeAssetId, params.rewardAssetId])

  const updateParams = (updates: Partial<WizardParams>) => {
    const newParams = writeParams(searchParams, { ...params, ...updates })
    setSearchParams(newParams, { replace: true })
    setParams(prev => ({ ...prev, ...updates }))
  }

  const setStep = (step: number) => {
    updateParams({ step: String(step) })
  }

  const nextStep = () => {
    const validation = validateStep(String(currentStep), params)
    if (!validation.ok) {
      const errors: Record<string, string> = {}
      validation.errors.forEach(err => {
        errors[err.field] = err.message
      })
      setValidationErrors(errors)
      return
    }
    
    setValidationErrors({})
    if (currentStep < STEPS.length) {
      setStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setStep(currentStep - 1)
      setValidationErrors({})
    }
  }

  const handleCreatePool = async () => {
    setIsSigning(true)
    // Placeholder - replace with real implementation
    setTimeout(() => {
      setIsSigning(false)
      // Navigate to pools page or show success
      navigate('/pools')
    }, 2000)
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Type params={params} updateParams={updateParams} errors={validationErrors} />
      case 2:
        return <Step2Assets params={params} updateParams={updateParams} errors={validationErrors} assets={assets} setAssets={setAssets} />
      case 3:
        return <Step3Rewards params={params} updateParams={updateParams} errors={validationErrors} rewardAsset={assets.reward} />
      case 4:
        return <Step4Metadata params={params} updateParams={updateParams} errors={validationErrors} />
      case 5:
        return <Step5Review params={params} assets={assets} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-medium text-off-white mb-2">Create pool</h1>
          <p className="text-mid-grey mb-8">Configure a permissionless incentive pool</p>

          <StepIndicator steps={STEPS} currentStep={currentStep} />

          <div className="border border-mid-grey/30 p-8 mb-8">
            {renderStepContent()}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 border transition-colors ${
                currentStep === 1
                  ? 'border-mid-grey/30 text-mid-grey cursor-not-allowed'
                  : 'border-mid-grey/30 text-off-white hover:border-mid-grey'
              }`}
            >
              Back
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleCreatePool}
                disabled={isSigning}
                className="px-6 py-2 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors disabled:opacity-50"
              >
                {isSigning ? 'Signing...' : 'Confirm and sign'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

// Step 1: Type Selection
function Step1Type({
  params,
  updateParams,
  errors,
}: {
  params: Partial<WizardParams>
  updateParams: (updates: Partial<WizardParams>) => void
  errors: Record<string, string>
}) {
  return (
    <div>
      <RadioGroup
        options={[
          { value: 'single', label: 'Single-asset pool', description: 'Stake a single asset to earn rewards' },
          { value: 'lp', label: 'LP pool', description: 'Stake liquidity pool tokens to earn rewards' },
        ]}
        value={params.type}
        onChange={(value) => updateParams({ type: value as 'single' | 'lp' })}
        label="Pool Type"
      />
      {errors.type && <div className="mt-2 text-sm text-mid-grey">{errors.type}</div>}
    </div>
  )
}

// Step 2: Assets Selection
function Step2Assets({
  params,
  updateParams,
  errors,
  assets,
  setAssets,
}: {
  params: Partial<WizardParams>
  updateParams: (updates: Partial<WizardParams>) => void
  errors: Record<string, string>
  assets: { stake?: Asset; reward?: Asset }
  setAssets: React.Dispatch<React.SetStateAction<{ stake?: Asset; reward?: Asset }>>
}) {
  const handleStakeAssetSelect = async (assetId: string) => {
    updateParams({ stakeAssetId: assetId })
    const results = await getAssets(assetId)
    const asset = results.find(a => a.id === assetId)
    if (asset) setAssets(prev => ({ ...prev, stake: asset }))
  }

  const handleRewardAssetSelect = async (assetId: string) => {
    updateParams({ rewardAssetId: assetId })
    const results = await getAssets(assetId)
    const asset = results.find(a => a.id === assetId)
    if (asset) setAssets(prev => ({ ...prev, reward: asset }))
  }

  const showSameAssetWarning = params.stakeAssetId === params.rewardAssetId && params.stakeAssetId
  const showLpWarning = params.type === 'lp' && assets.stake && !assets.stake.isLpToken

  return (
    <div className="space-y-6">
      <AssetSearchComboBox
        value={params.stakeAssetId}
        onChange={handleStakeAssetSelect}
        assetsProvider={getAssets}
        label="Stake Asset"
        placeholder="Search by symbol, name, or asset ID"
      />
      {errors.stakeAssetId && <div className="text-sm text-mid-grey">{errors.stakeAssetId}</div>}

      <AssetSearchComboBox
        value={params.rewardAssetId}
        onChange={handleRewardAssetSelect}
        assetsProvider={getAssets}
        label="Reward Asset"
        placeholder="Search by symbol, name, or asset ID"
      />
      {errors.rewardAssetId && <div className="text-sm text-mid-grey">{errors.rewardAssetId}</div>}

      {showSameAssetWarning && (
        <div className="p-3 border border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
          Stake and reward assets are the same.
        </div>
      )}

      {showLpWarning && (
        <div className="p-3 border border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
          Selected stake asset does not appear to be an LP token.
        </div>
      )}
    </div>
  )
}

// Step 3: Rewards Configuration
function Step3Rewards({
  params,
  updateParams,
  errors,
  rewardAsset,
}: {
  params: Partial<WizardParams>
  updateParams: (updates: Partial<WizardParams>) => void
  errors: Record<string, string>
  rewardAsset?: Asset
}) {
  const startMode = params.startMode || 'now'

  const calculateEmissionRate = () => {
    if (!params.totalRewards || !params.endDate || !params.startDate && params.startMode !== 'now') return null
    
    const totalRewards = parseFloat(params.totalRewards)
    if (isNaN(totalRewards)) return null

    const endDate = new Date(params.endDate)
    const startDate = params.startMode === 'scheduled' && params.startDate
      ? new Date(params.startDate)
      : new Date()
    
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (durationDays <= 0) return null

    const perDay = totalRewards / durationDays
    const perHour = perDay / 24

    return { perDay, perHour }
  }

  const emissionRate = calculateEmissionRate()

  return (
    <div className="space-y-6">
      <NumericInput
        value={params.totalRewards || ''}
        onChange={(value) => updateParams({ totalRewards: value })}
        label="Total Rewards"
        suffix={rewardAsset?.symbol || ''}
        placeholder="0.00"
      />
      {errors.totalRewards && <div className="text-sm text-mid-grey">{errors.totalRewards}</div>}

      <div>
        <label className="block text-sm text-mid-grey mb-3">Start Time</label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => {
              setStartMode('now')
              updateParams({ startMode: 'now', startDate: undefined })
            }}
            className={`px-4 py-2 border transition-colors ${
              startMode === 'now'
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey'
            }`}
          >
            Start now
          </button>
          <button
            type="button"
            onClick={() => {
              updateParams({ startMode: 'scheduled' })
            }}
            className={`px-4 py-2 border transition-colors ${
              startMode === 'scheduled'
                ? 'border-amber bg-amber/10 text-amber'
                : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey'
            }`}
          >
            Schedule start
          </button>
        </div>
        {startMode === 'scheduled' && (
          <div className="mt-4">
            <DatePicker
              value={params.startDate}
              onChange={(value) => updateParams({ startDate: value, startMode: 'scheduled' })}
              label="Start Date"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
        )}
      </div>

      <div>
        <RadioGroup
          options={[
            { value: 'endDate', label: 'Fixed end date' },
            { value: 'targetApr', label: 'Target APR' },
          ]}
          value={params.endMode}
          onChange={(value) => updateParams({ endMode: value as 'endDate' | 'targetApr' })}
          label="End Condition"
        />
        {errors.endMode && <div className="mt-2 text-sm text-mid-grey">{errors.endMode}</div>}
      </div>

      {params.endMode === 'endDate' && (
        <div className="space-y-4">
          <DatePicker
            value={params.endDate}
            onChange={(value) => updateParams({ endDate: value })}
            label="End Date"
            min={
              params.startMode === 'scheduled' && params.startDate
                ? params.startDate
                : new Date().toISOString().split('T')[0]
            }
          />
          {errors.endDate && <div className="text-sm text-mid-grey">{errors.endDate}</div>}

          {emissionRate && (
            <div className="p-4 border border-mid-grey/30 bg-off-white/5">
              <div className="text-sm text-mid-grey mb-2">Emission Rate</div>
              <div className="text-sm text-off-white">
                {emissionRate.perDay.toFixed(4)} {rewardAsset?.symbol || ''} per day
              </div>
              <div className="text-xs text-mid-grey mt-1">
                {emissionRate.perHour.toFixed(6)} {rewardAsset?.symbol || ''} per hour
              </div>
            </div>
          )}
        </div>
      )}

      {params.endMode === 'targetApr' && (
        <div className="space-y-4">
          <NumericInput
            value={params.targetApr || ''}
            onChange={(value) => updateParams({ targetApr: value })}
            label="Target APR"
            suffix="%"
            placeholder="0.00"
          />
          {errors.targetApr && <div className="text-sm text-mid-grey">{errors.targetApr}</div>}

          <NumericInput
            value={params.assumedTvlUsd || ''}
            onChange={(value) => updateParams({ assumedTvlUsd: value })}
            label="Assumed TVL"
            suffix="USD"
            placeholder="0.00"
          />
          {errors.assumedTvlUsd && <div className="text-sm text-mid-grey">{errors.assumedTvlUsd}</div>}

          <div className="p-4 border border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
            APR varies with total staked. Target APR is calculated using the assumed TVL.
          </div>
        </div>
      )}

      <div className="p-4 border border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
        Total rewards are fixed. End mode determines emission schedule only.
      </div>
    </div>
  )
}

// Step 4: Metadata
function Step4Metadata({
  params,
  updateParams,
  errors,
}: {
  params: Partial<WizardParams>
  updateParams: (updates: Partial<WizardParams>) => void
  errors: Record<string, string>
}) {
  const tagOptions = ['Stablecoin', 'Liquidity', 'Governance', 'Infrastructure', 'NFT', 'Other']
  const selectedTags = params.tags ? params.tags.split(',').map(t => t.trim()) : []

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : selectedTags.length < 3
      ? [...selectedTags, tag]
      : selectedTags
    
    updateParams({ tags: newTags.length > 0 ? newTags.join(',') : undefined })
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-mid-grey mb-2">
          Pool Name <span className="text-mid-grey">(required)</span>
        </label>
        <input
          type="text"
          value={params.poolName || ''}
          onChange={(e) => updateParams({ poolName: e.target.value })}
          placeholder="Enter pool name"
          maxLength={48}
          className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
        />
        {errors.poolName && <div className="mt-2 text-sm text-mid-grey">{errors.poolName}</div>}
      </div>

      <div>
        <label className="block text-sm text-mid-grey mb-2">Created By</label>
        <input
          type="text"
          value={params.createdBy || ''}
          onChange={(e) => updateParams({ createdBy: e.target.value })}
          placeholder="Optional"
          maxLength={48}
          className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
        />
      </div>

      <div>
        <label className="block text-sm text-mid-grey mb-2">Website URL</label>
        <input
          type="url"
          value={params.websiteUrl || ''}
          onChange={(e) => updateParams({ websiteUrl: e.target.value })}
          placeholder="https://example.com"
          className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
        />
        {errors.websiteUrl && <div className="mt-2 text-sm text-mid-grey">{errors.websiteUrl}</div>}
      </div>

      <div>
        <label className="block text-sm text-mid-grey mb-2">Description</label>
        <textarea
          value={params.description || ''}
          onChange={(e) => updateParams({ description: e.target.value })}
          placeholder="Optional description (max 140 characters)"
          maxLength={140}
          rows={3}
          className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber resize-none"
        />
        <div className="mt-1 text-xs text-mid-grey text-right">
          {(params.description || '').length}/140
        </div>
        {errors.description && <div className="mt-2 text-sm text-mid-grey">{errors.description}</div>}
      </div>

      <div>
        <label className="block text-sm text-mid-grey mb-3">Tags (select up to 3)</label>
        <div className="flex flex-wrap gap-2">
          {tagOptions.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 border text-sm transition-colors ${
                  isSelected
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Step 5: Review
function Step5Review({
  params,
  assets,
}: {
  params: Partial<WizardParams>
  assets: { stake?: Asset; reward?: Asset }
}) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleString()
  }

  const calculateEmissionRate = () => {
    if (!params.totalRewards || !params.endDate) return null
    const totalRewards = parseFloat(params.totalRewards)
    if (isNaN(totalRewards)) return null
    const endDate = new Date(params.endDate)
    const startDate = params.startMode === 'scheduled' && params.startDate
      ? new Date(params.startDate)
      : new Date()
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    if (durationDays <= 0) return null
    return totalRewards / durationDays
  }

  const emissionRate = calculateEmissionRate()

  const preflightItems = [
    { label: 'Wallet connected', status: 'unknown' as const },
    { label: 'Opt-in required for stake asset', status: 'unknown' as const },
    { label: 'Opt-in required for reward asset', status: 'unknown' as const },
    { label: 'Sufficient balance of reward asset', status: 'unknown' as const },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-off-white mb-4">Pool Configuration</h3>
        <div className="border border-mid-grey/30">
          <ReviewRow label="Type" value={params.type === 'single' ? 'Single-asset pool' : 'LP pool'} />
          <ReviewRow
            label="Stake Asset"
            value={assets.stake ? `${assets.stake.symbol} (${assets.stake.id})` : '--'}
          />
          <ReviewRow
            label="Reward Asset"
            value={assets.reward ? `${assets.reward.symbol} (${assets.reward.id})` : '--'}
          />
          <ReviewRow
            label="Total Rewards"
            value={params.totalRewards ? `${params.totalRewards} ${assets.reward?.symbol || ''}` : '--'}
          />
          <ReviewRow
            label="Start"
            value={
              params.startMode === 'scheduled' && params.startDate
                ? formatDate(params.startDate)
                : 'Now'
            }
          />
          {params.endMode === 'endDate' && (
            <>
              <ReviewRow label="End Mode" value="Fixed end date" />
              <ReviewRow label="End Date" value={formatDate(params.endDate)} />
              {emissionRate && (
                <ReviewRow
                  label="Emission Rate"
                  value={`${emissionRate.toFixed(4)} ${assets.reward?.symbol || ''} per day`}
                />
              )}
            </>
          )}
          {params.endMode === 'targetApr' && (
            <>
              <ReviewRow label="End Mode" value="Target APR" />
              <ReviewRow label="Target APR" value={params.targetApr ? `${params.targetApr}%` : '--'} />
              <ReviewRow label="Assumed TVL" value={params.assumedTvlUsd ? `$${params.assumedTvlUsd}` : '--'} />
              <ReviewRow
                label="Note"
                value="APR varies with total staked. Target APR is calculated using the assumed TVL."
              />
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-off-white mb-4">Metadata</h3>
        <div className="border border-mid-grey/30">
          <ReviewRow label="Pool Name" value={params.poolName || '--'} />
          {params.createdBy && <ReviewRow label="Created By" value={params.createdBy} />}
          {params.websiteUrl && <ReviewRow label="Website" value={params.websiteUrl} />}
          {params.description && <ReviewRow label="Description" value={params.description} />}
          {params.tags && <ReviewRow label="Tags" value={params.tags} />}
        </div>
      </div>

      <PreflightChecklist items={preflightItems} />
    </div>
  )
}

