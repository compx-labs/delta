import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TransactionSigner } from 'algosdk'
import { motion } from 'framer-motion'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { StepIndicator } from '../components/StepIndicator'
import { RadioGroup } from '../components/RadioGroup'
import { AnimButton } from '../components/AnimButton'
import { AssetSearchComboBox, type Asset } from '../components/AssetSearchComboBox'
import { NumericInput } from '../components/NumericInput'
import { DatePicker } from '../components/DatePicker'
import { ReviewRow } from '../components/ReviewRow'
import { PreflightChecklist } from '../components/PreflightChecklist'
import { readParams, writeParams, validateStep, type WizardParams } from '../utils/wizardParams'
import { getAssets } from '../services/assetService'
import { createPool as createPoolMetadata, updatePool } from '../services/poolApiService'
import { useNetwork, type Network } from '../context/networkContext'
import { usePools } from '../context/poolsContext'
import { fetchAccountBalances } from '../services/balanceService'
import { 
  createPool as createPoolContract, 
  initPoolApr, 
  fundRewardsAndActivate,
  registerPool
} from '../contracts/staking/user'
import { MASTER_REPO_APP_ID } from '../constants/constants'
import { useToast } from '../context/toastContext'
import { getPoolById, getAllPools, type Pool } from '../services/poolApiService'

const STEPS = ['Type', 'Assets', 'Rewards', 'Metadata', 'Review']

export function CreatePoolWizardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { activeAccount, activeWallet, transactionSigner } = useWallet()
  const { networkConfig } = useNetwork()
  const { refetchMasterRepo, refetchPools } = usePools()
  const queryClient = useQueryClient()
  const { openMultiStepToast, updateStep, completeMultiStep, failMultiStep } = useToast()
  const [params, setParams] = useState<Partial<WizardParams>>(() => readParams(searchParams))
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [assets, setAssets] = useState<{ stake?: Asset; reward?: Asset }>({})
  const [isSigning, setIsSigning] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [resumePoolId, setResumePoolId] = useState<string | null>(null)
  const [resumePool, setResumePool] = useState<Pool | null>(null)

  const currentStep = parseInt(params.step || '1', 10)

  useEffect(() => {
    setParams(readParams(searchParams))
    const resumeId = searchParams.get('resume')
    if (resumeId) {
      setResumePoolId(resumeId)
      // Load pool data for resume
      getPoolById(resumeId).then(pool => {
        setResumePool(pool)
        // Pre-populate params from pool data
        setParams(prev => ({
          ...prev,
          stakeAssetId: pool.stake_token,
          rewardAssetId: pool.reward_token,
          totalRewards: pool.total_rewards.toString(),
          poolName: pool.name,
          websiteUrl: pool.website_url || undefined,
          description: pool.description || undefined,
          tags: pool.tags?.join(', ') || undefined,
        }))
      }).catch(err => {
        console.error('Failed to load pool for resume:', err)
        setCreateError('Failed to load pool data')
      })
    }
  }, [searchParams])

  useEffect(() => {
    // Load asset details when IDs are available
    if (params.stakeAssetId) {
      getAssets(params.stakeAssetId, networkConfig).then(results => {
        const asset = results.find(a => a.id === params.stakeAssetId)
        if (asset) setAssets(prev => ({ ...prev, stake: asset }))
      })
    }
    if (params.rewardAssetId) {
      getAssets(params.rewardAssetId, networkConfig).then(results => {
        const asset = results.find(a => a.id === params.rewardAssetId)
        if (asset) setAssets(prev => ({ ...prev, reward: asset }))
      })
    }
  }, [params.stakeAssetId, params.rewardAssetId, networkConfig])

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
    // Validate all required fields
    const validation = validateStep('5', params)
    if (!validation.ok) {
      const errors: Record<string, string> = {}
      validation.errors.forEach(err => {
        errors[err.field] = err.message
      })
      setValidationErrors(errors)
      return
    }

    if (!params.stakeAssetId || !params.rewardAssetId || !params.totalRewards || !params.poolName || !params.targetApr) {
      setCreateError('Missing required fields')
      return
    }

    if (!activeAccount?.address || !activeWallet || !transactionSigner) {
      setCreateError('Please connect your wallet')
      return
    }

    if (!MASTER_REPO_APP_ID) {
      setCreateError('Master repo app ID not configured')
      return
    }

    setIsSigning(true)
    setCreateError(null)

    // CRITICAL: Check for existing incomplete pool BEFORE creating a new one
    // This prevents duplicate pools and protects funds that may have already been sent
    let poolToUse: Pool | null = null
    
    // First, check if we already have a resume pool set
    if (resumePoolId && resumePool) {
      // Reload from database to ensure we have the latest state
      try {
        const latestPool = await getPoolById(resumePoolId)
        poolToUse = latestPool
        console.log('Using existing resume pool (reloaded):', poolToUse.id)
        setResumePool(latestPool) // Update state with latest data
      } catch (error) {
        console.error('Failed to reload resume pool, using cached:', error)
        poolToUse = resumePool // Fallback to cached data
      }
    } else {
      // Check database for any incomplete pools for this user
      // Match by user address and creation status
      try {
        const allPools = await getAllPools()
        const incompletePools = allPools.filter(
          (pool: Pool) =>
            pool.created_by === activeAccount.address &&
            pool.creation_status !== 'completed'
        )
        
        if (incompletePools.length > 0) {
          // Use the most recent incomplete pool
          const mostRecent = incompletePools.sort(
            (a: Pool, b: Pool) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          
          // Reload from database to ensure we have the latest state
          const latestPool = await getPoolById(mostRecent.id)
          poolToUse = latestPool
          console.log('Found existing incomplete pool, will resume:', poolToUse.id)
          
          // Update state and URL to reflect we're resuming
          setResumePoolId(poolToUse.id)
          setResumePool(latestPool)
          const newParams = new URLSearchParams(searchParams)
          newParams.set('resume', poolToUse.id)
          setSearchParams(newParams, { replace: true })
        }
      } catch (error) {
        console.error('Failed to check for existing pools:', error)
        // Continue with creation if check fails
      }
    }

    // Define the steps for multi-step toast
    const steps = [
      {
        id: 'create',
        name: 'Create Pool Application',
        description: 'Creating the pool smart contract application...',
      },
      {
        id: 'init',
        name: 'Initialize Pool',
        description: 'Initializing pool with APR configuration...',
      },
      {
        id: 'fund-activate',
        name: 'Fund Rewards & Activate',
        description: 'Funding rewards and activating pool...',
      },
      {
        id: 'register',
        name: 'Register Pool',
        description: 'Registering pool with master repo...',
      },
    ]

    // Open multi-step toast
    openMultiStepToast(poolToUse ? 'Resuming Pool Creation' : 'Creating Pool', steps)

    let createdPoolMetadata: { id: string; app_id?: number | null; creation_status?: string } | null = null

    try {
      const address = activeAccount.address
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const signer = transactionSigner as any as TransactionSigner

      // Parse tags from comma-separated string to array
      const tags = params.tags 
        ? params.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : undefined

      // Calculate APR in basis points (targetApr is a percentage)
      const aprBps = Math.floor(parseFloat(params.targetApr) * 100)

      // Calculate start time and duration
      const startTime = params.startMode === 'scheduled' && params.startDate
        ? Math.floor(new Date(params.startDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000)

      // For target APR mode, we need a duration - use a default of 1 year (365 days)
      // This can be adjusted based on your requirements
      const duration = 365 * 24 * 60 * 60 // 1 year in seconds

      // Get asset decimals
      const rewardAssetDecimals = assets.reward?.decimals || 6
      const rewardAmount = parseFloat(params.totalRewards)

      // Initial balance for the pool (minimum balance for app account)
      const initialBalance = 400_000 // 0.4 ALGO in microAlgos

      // Step 1: Create or resume pool metadata
      if (poolToUse) {
        // Resuming existing pool - use the pool we found
        createdPoolMetadata = poolToUse as { id: string; app_id?: number | null; creation_status?: string }
        await updatePool(createdPoolMetadata.id, {
          creation_status: 'creating',
        })
        console.log('Resuming pool creation:', createdPoolMetadata)
        
        // Update resumePool state to match
        setResumePoolId(poolToUse.id)
        setResumePool(poolToUse)
      } else {
        // Create new pool metadata only if no existing pool found
        const poolData = {
          stake_token: params.stakeAssetId,
          reward_token: params.rewardAssetId,
          total_rewards: rewardAmount,
          name: params.poolName,
          created_by: address, // Always use wallet address
          website_url: params.websiteUrl || undefined,
          description: params.description || undefined,
          tags: tags && tags.length > 0 ? tags : undefined,
        }
        const newPool = await createPoolMetadata(poolData)
        await updatePool(newPool.id, {
          creation_status: 'creating',
        })
        createdPoolMetadata = { ...newPool, creation_status: 'creating' }
        console.log('Pool metadata created:', createdPoolMetadata)
        
        // Save pool ID to URL params so we can resume if user navigates away
        const newParams = new URLSearchParams(searchParams)
        newParams.set('resume', newPool.id)
        setSearchParams(newParams, { replace: true })
        setResumePoolId(newPool.id)
        setResumePool(newPool)
        poolToUse = newPool
      }

      // Determine which steps need to be executed based on resume state
      let poolAppId: string
      
      if (poolToUse?.app_id && poolToUse?.step_create_completed) {
        // Resume: app already created, use existing app_id
        poolAppId = poolToUse.app_id.toString()
        console.log('Resuming with existing app ID:', poolAppId)
      } else {
        // Step 2: Transaction Group 1 - Create pool application
        console.log('Creating pool application...')
        updateStep('create')
        poolAppId = await createPoolContract({
          address,
          signer,
          masterRepoAppId: Number(MASTER_REPO_APP_ID),
          adminAddress: address,
        })
        console.log('Pool created with app ID:', poolAppId)

        // Update backend with app_id and mark step as completed
        const updatedPool = await updatePool(createdPoolMetadata.id, {
          app_id: parseInt(poolAppId, 10),
          step_create_completed: true,
        })
        // Update local state to reflect progress
        poolToUse = updatedPool
        setResumePool(updatedPool)
      }

      if (poolToUse?.step_init_completed) {
        // Resume: init already completed, skip
        console.log('Init step already completed, skipping...')
        updateStep('init')
      } else {
        // Step 3: Transaction Group 2 - Initialize pool
        console.log('Initializing pool...')
        updateStep('init')
        await initPoolApr({
          address,
          signer,
          appId: parseInt(poolAppId, 10),
          stakedAssetId: parseInt(params.stakeAssetId, 10),
          rewardAssetId: parseInt(params.rewardAssetId, 10),
          rewardAssetDecimals,
          rewardAmount,
          aprBps,
          startTime,
          duration,
          initialBalance,
        })
        console.log('Pool initialized')

        // Mark init step as completed
        const updatedPool = await updatePool(createdPoolMetadata.id, {
          step_init_completed: true,
        })
        // Update local state to reflect progress
        poolToUse = updatedPool
        setResumePool(updatedPool)
      }

      if (poolToUse?.step_fund_activate_register_completed) {
        // Resume: final step already completed, skip
        console.log('Fund/activate/register step already completed, skipping...')
        updateStep('fund-activate-register')
      } else {
        // Step 4: Transaction Group 3 - Fund rewards and activate pool
        console.log('Funding rewards and activating pool...')
        updateStep('fund-activate')
        await fundRewardsAndActivate({
          address,
          signer,
          poolAppId: parseInt(poolAppId, 10),
          rewardAssetId: parseInt(params.rewardAssetId, 10),
          rewardAmount,
          rewardAssetDecimals,
        })
        console.log('Pool funded and activated')

        // Step 5: Register pool with master repo
        console.log('Registering pool with master repo...')
        updateStep('register')
        await registerPool({
          address,
          signer,
          masterRepoAppId: Number(MASTER_REPO_APP_ID),
          poolAppId: parseInt(poolAppId, 10),
        })
        console.log('Pool registered')

        // Mark final step as completed and set status to completed
        const updatedPool = await updatePool(createdPoolMetadata.id, {
          step_fund_activate_register_completed: true,
          creation_status: 'completed',
        })
        // Update local state to reflect completion
        poolToUse = updatedPool
        setResumePool(updatedPool)

        // Refetch pools data to include the newly created pool
        console.log('Refetching pools data...')
        await Promise.all([
          refetchMasterRepo(),
          refetchPools(),
          queryClient.invalidateQueries({ queryKey: ['poolMetadata'] }),
        ])
        console.log('Pools data refreshed')
      }

      // Complete multi-step toast
      completeMultiStep('Pool created successfully!')

      // Navigate to pools page after a short delay to show success toast
      setTimeout(() => {
        navigate('/pools')
      }, 2000)
    } catch (error) {
      console.error('Failed to create pool:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create pool. Please try again.'
      
      // Update pool status to failed if we have a pool ID
      if (createdPoolMetadata?.id) {
        try {
          await updatePool(createdPoolMetadata.id, {
            creation_status: 'failed',
          })
        } catch (updateError) {
          console.error('Failed to update pool status:', updateError)
        }
      }
      
      setCreateError(errorMessage)
      failMultiStep(errorMessage)
    } finally {
      setIsSigning(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1Type params={params} updateParams={updateParams} errors={validationErrors} />
      case 2:
        return <Step2Assets params={params} updateParams={updateParams} errors={validationErrors} assets={assets} setAssets={setAssets} networkConfig={networkConfig} />
      case 3:
        return <Step3Rewards params={params} updateParams={updateParams} errors={validationErrors} rewardAsset={assets.reward} />
      case 4:
        return <Step4Metadata params={params} updateParams={updateParams} errors={validationErrors} />
      case 5:
        return <Step5Review params={params} assets={assets} networkConfig={networkConfig} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-medium text-off-white mb-2">Create pool</h1>
            <p className="text-mid-grey mb-8">Configure a permissionless incentive pool</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <StepIndicator steps={STEPS} currentStep={currentStep} />
          </motion.div>

          <motion.div
            className="border-2 border-mid-grey/30 p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {renderStepContent()}
            {createError && (
              <div className="mt-4 p-4 border-2 border-red-500/50 bg-red-500/10 text-red-400 text-sm">
                {createError}
              </div>
            )}
          </motion.div>

          {/* Footer Actions */}
          <motion.div
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-2 border-2 transition-colors ${
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
              <AnimButton
                text={isSigning ? 'Signing...' : 'Confirm and sign'}
                onClick={handleCreatePool}
                disabled={isSigning}
                variant="default"
              />
            )}
          </motion.div>
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
  networkConfig,
}: {
  params: Partial<WizardParams>
  updateParams: (updates: Partial<WizardParams>) => void
  errors: Record<string, string>
  assets: { stake?: Asset; reward?: Asset }
  setAssets: React.Dispatch<React.SetStateAction<{ stake?: Asset; reward?: Asset }>>
  networkConfig: Network
}) {
  const handleStakeAssetSelect = async (assetId: string) => {
    updateParams({ stakeAssetId: assetId })
    const results = await getAssets(assetId, networkConfig)
    const asset = results.find(a => a.id === assetId)
    if (asset) setAssets(prev => ({ ...prev, stake: asset }))
  }

  const handleRewardAssetSelect = async (assetId: string) => {
    updateParams({ rewardAssetId: assetId })
    const results = await getAssets(assetId, networkConfig)
    const asset = results.find(a => a.id === assetId)
    if (asset) setAssets(prev => ({ ...prev, reward: asset }))
  }

  // Create a network-aware asset provider function
  const assetProvider = async (query: string) => {
    return getAssets(query, networkConfig)
  }

  const showSameAssetWarning = params.stakeAssetId === params.rewardAssetId && params.stakeAssetId
  const showLpWarning = params.type === 'lp' && assets.stake && !assets.stake.isLpToken

  return (
    <div className="space-y-6">
      <AssetSearchComboBox
        value={params.stakeAssetId}
        onChange={handleStakeAssetSelect}
        assetsProvider={assetProvider}
        label="Stake Asset"
        placeholder="Search by symbol, name, or asset ID"
      />
      {errors.stakeAssetId && <div className="text-sm text-mid-grey">{errors.stakeAssetId}</div>}

      <AssetSearchComboBox
        value={params.rewardAssetId}
        onChange={handleRewardAssetSelect}
        assetsProvider={assetProvider}
        label="Reward Asset"
        placeholder="Search by symbol, name, or asset ID"
      />
      {errors.rewardAssetId && <div className="text-sm text-mid-grey">{errors.rewardAssetId}</div>}

      {showSameAssetWarning && (
        <div className="p-3 border-2 border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
          Stake and reward assets are the same.
        </div>
      )}

      {showLpWarning && (
        <div className="p-3 border-2 border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
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

  // Ensure endMode is always set to targetApr
  useEffect(() => {
    if (params.endMode !== 'targetApr') {
      updateParams({ endMode: 'targetApr' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.endMode])

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
              updateParams({ startMode: 'now', startDate: undefined })
            }}
            className={`px-4 py-2 border-2 transition-colors ${
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
            className={`px-4 py-2 border-2 transition-colors ${
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
        <NumericInput
          value={params.targetApr || ''}
          onChange={(value) => updateParams({ targetApr: value })}
          label="Target APR"
          suffix="%"
          placeholder="0.00"
        />
        {errors.targetApr && <div className="text-sm text-mid-grey">{errors.targetApr}</div>}

        <div className="mt-4 p-4 border-2 border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
          APR is fixed. Reward rates are updated dynamically based on TVL to maintain the target APR.
        </div>
      </div>

      <div className="p-4 border-2 border-mid-grey/30 bg-off-white/5 text-sm text-mid-grey">
        Total rewards are fixed. Reward rates adjust automatically to maintain the target APR.
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
          className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
        />
        {errors.poolName && <div className="mt-2 text-sm text-mid-grey">{errors.poolName}</div>}
      </div>


      <div>
        <label className="block text-sm text-mid-grey mb-2">Website URL</label>
        <input
          type="url"
          value={params.websiteUrl || ''}
          onChange={(e) => updateParams({ websiteUrl: e.target.value })}
          placeholder="https://example.com"
          className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
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
          className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber resize-none"
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
                className={`px-3 py-1 border-2 text-sm transition-colors ${
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
  networkConfig,
}: {
  params: Partial<WizardParams>
  assets: { stake?: Asset; reward?: Asset }
  networkConfig: Network
}) {
  const { activeAccount, activeWallet } = useWallet()

  const formatDate = (dateString?: string) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleString()
  }

  const formatNumber = (value?: string) => {
    if (!value) return '--'
    const num = Number(value)
    if (isNaN(num)) return value
    // Format with thousand separators, no decimal places for whole numbers
    return num.toLocaleString('en-US', { 
      maximumFractionDigits: num % 1 === 0 ? 0 : 20,
      useGrouping: true
    })
  }

  // Fetch account balances for checking opt-ins and balances
  const { data: accountBalances } = useQuery({
    queryKey: ['preflightBalances', activeAccount?.address, networkConfig.id],
    queryFn: () => fetchAccountBalances(activeAccount?.address || '', networkConfig),
    enabled: !!activeAccount?.address && !!networkConfig.indexerServer,
    staleTime: 10 * 1000, // Cache for 10 seconds
  })

  // Check opt-in status for stake asset
  const stakeAssetOptIn = useMemo(() => {
    if (!params.stakeAssetId || !accountBalances) return 'unknown'
    if (params.stakeAssetId === '0') return 'yes' // ALGO doesn't need opt-in
    const hasAsset = accountBalances.assets.some(a => a.assetId === params.stakeAssetId)
    return hasAsset ? 'yes' : 'no'
  }, [params.stakeAssetId, accountBalances])

  // Check opt-in status for reward asset
  const rewardAssetOptIn = useMemo(() => {
    if (!params.rewardAssetId || !accountBalances) return 'unknown'
    if (params.rewardAssetId === '0') return 'yes' // ALGO doesn't need opt-in
    const hasAsset = accountBalances.assets.some(a => a.assetId === params.rewardAssetId)
    return hasAsset ? 'yes' : 'no'
  }, [params.rewardAssetId, accountBalances])

  // Check if user has sufficient balance of reward asset
  const sufficientBalance = useMemo(() => {
    if (!params.rewardAssetId || !params.totalRewards || !accountBalances) return 'unknown'
    
    const totalRewards = parseFloat(params.totalRewards)
    if (isNaN(totalRewards)) return 'unknown'

    // ALGO balance check
    if (params.rewardAssetId === '0') {
      const algoBalance = parseFloat(accountBalances.algoBalance) / 1_000_000 // Convert from microAlgos
      return algoBalance >= totalRewards ? 'yes' : 'no'
    }

    // Asset balance check
    const rewardAsset = accountBalances.assets.find(a => a.assetId === params.rewardAssetId)
    if (!rewardAsset) return 'no'

    const rewardAssetBalance = parseFloat(rewardAsset.balance) / (10 ** rewardAsset.decimals)
    return rewardAssetBalance >= totalRewards ? 'yes' : 'no'
  }, [params.rewardAssetId, params.totalRewards, accountBalances])

  // Wallet connected check
  const walletConnected = useMemo(() => {
    return activeAccount && activeWallet ? 'yes' : 'no'
  }, [activeAccount, activeWallet])

  const preflightItems = [
    { label: 'Wallet connected', status: walletConnected as 'yes' | 'no' | 'unknown' },
    { label: 'Opt-in required for stake asset', status: stakeAssetOptIn as 'yes' | 'no' | 'unknown' },
    { label: 'Opt-in required for reward asset', status: rewardAssetOptIn as 'yes' | 'no' | 'unknown' },
    { label: 'Sufficient balance of reward asset', status: sufficientBalance as 'yes' | 'no' | 'unknown' },
  ]

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-lg font-medium text-off-white mb-6">Pool Configuration</h3>
        <div className="border-2 border-mid-grey/30 rounded-sm overflow-hidden">
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
            value={params.totalRewards ? `${formatNumber(params.totalRewards)} ${assets.reward?.symbol || ''}` : '--'}
          />
          <ReviewRow
            label="Start"
            value={
              params.startMode === 'scheduled' && params.startDate
                ? formatDate(params.startDate)
                : 'Now'
            }
          />
          <ReviewRow label="End Mode" value="Target APR" />
          <ReviewRow label="Target APR" value={params.targetApr ? `${params.targetApr}%` : '--'} />
          <ReviewRow
            label="Note"
            value="APR is fixed. Reward rates are updated dynamically based on TVL to maintain the target APR."
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-off-white mb-6">Metadata</h3>
        <div className="border-2 border-mid-grey/30 rounded-sm overflow-hidden">
          <ReviewRow label="Pool Name" value={params.poolName || '--'} />
          {params.websiteUrl && <ReviewRow label="Website" value={params.websiteUrl} />}
          {params.description && <ReviewRow label="Description" value={params.description} />}
          {params.tags && <ReviewRow label="Tags" value={params.tags} />}
        </div>
      </div>

      <PreflightChecklist items={preflightItems} />
    </div>
  )
}

