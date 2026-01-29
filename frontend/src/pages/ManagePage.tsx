import { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { ManagePoolsTable } from '../components/ManagePoolsTable'
import { Dropdown } from '../components/Dropdown'
import { StatusDot } from '../components/StatusDot'
import { AnimButton } from '../components/AnimButton'
import { WalletContext } from '../context/wallet'
import { usePools } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { useToast } from '../context/toastContext'
import { useExplorer } from '../context/explorerContext'
import { AddressDisplay } from '../components/AddressDisplay'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import { setContractActive, setContractInactive, removeRewards, fundMoreRewards } from '../contracts/staking/user'
import { calculateExpectedEndDate } from '../services/manageService'
import { updatePool } from '../services/poolApiService'
import type { ManagePoolListItem, ManagePoolDetail } from '../types/pool'
import type { StakingPoolState } from '../context/poolsContext'
import { getPoolsCreatedBy, getManagePoolDetail } from '../services/manageService'

export function ManagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const poolId = searchParams.get('poolId')
  const { activeAccount, activeWallet, transactionSigner } = useWallet()
  const { setDisplayWalletConnectModal } = useContext(WalletContext)
  const { poolStates, registeredAppIds, refetchPools } = usePools()
  const { networkConfig } = useNetwork()
  const { openToast, openMultiStepToast, updateStep, completeMultiStep, failMultiStep } = useToast()
  const { getExplorerUrl } = useExplorer()
  
  const [pools, setPools] = useState<ManagePoolListItem[]>([])
  const [poolDetail, setPoolDetail] = useState<ManagePoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
  })

  // Collect all unique asset IDs from pools
  const assetIds = useMemo(() => {
    const ids = new Set<string>()
    poolStates.forEach((state) => {
      if (state.stakedAssetId) ids.add(state.stakedAssetId.toString())
      if (state.rewardAssetId) ids.add(state.rewardAssetId.toString())
    })
    return Array.from(ids)
  }, [poolStates])

  // Fetch asset information for all assets used in pools
  const { 
    data: assetInfoMap = new Map(),
  } = useQuery({
    queryKey: ['assetInfo', networkConfig.id, assetIds.join(',')],
    queryFn: () => fetchMultipleAssetInfo(assetIds, networkConfig),
    enabled: assetIds.length > 0 && !!networkConfig.indexerServer,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Create stable string keys for Maps to detect actual data changes
  const poolStatesKey = useMemo(() => {
    return Array.from(poolStates.keys()).sort().join(',')
  }, [poolStates])
  
  const assetInfoMapKey = useMemo(() => {
    return Array.from(assetInfoMap.keys()).sort().join(',')
  }, [assetInfoMap])
  
  const registeredAppIdsKey = useMemo(() => {
    return registeredAppIds ? registeredAppIds.map(id => id.toString()).sort().join(',') : ''
  }, [registeredAppIds])

  // Track previous values to detect meaningful changes
  const prevDepsRef = useRef({ 
    poolStatesKey: '', 
    assetInfoKey: '', 
    registeredKey: '', 
    poolId: '', 
    address: '',
    hasData: false
  })

  useEffect(() => {
    async function fetchData() {
      if (!activeAccount?.address) {
        setLoading(false)
        setPools([])
        setPoolDetail(null)
        prevDepsRef.current.hasData = false
        return
      }

      const currentDeps = {
        poolStatesKey,
        assetInfoKey: assetInfoMapKey,
        registeredKey: registeredAppIdsKey,
        poolId: poolId || '',
        address: activeAccount.address,
      }

      // Only show loading spinner on initial load or when switching views (poolId changes)
      const isInitialLoad = !prevDepsRef.current.hasData
      const isViewSwitch = prevDepsRef.current.poolId !== currentDeps.poolId
      const isAccountSwitch = prevDepsRef.current.address !== currentDeps.address
      
      // Only show loading for initial load, view switch, or account switch
      // Don't show loading when just updating data (poolStates/assetInfo changes)
      if (isInitialLoad || isViewSwitch || isAccountSwitch) {
        setLoading(true)
      }

      try {
        if (poolId) {
          // Fetch pool detail
          const detail = await getManagePoolDetail(poolId, poolStates, assetInfoMap, registeredAppIds)
          setPoolDetail(detail)
        } else {
          // Fetch pools list with pool states and asset info
          // Only show pools that are registered in the registry contract
          const data = await getPoolsCreatedBy(activeAccount.address, poolStates, assetInfoMap, registeredAppIds)
          setPools(data)
        }
        prevDepsRef.current.hasData = true
      } catch (error) {
        console.error('Failed to fetch pool data:', error)
      } finally {
        setLoading(false)
        prevDepsRef.current = { ...currentDeps, hasData: true }
      }
    }

    fetchData()
  }, [activeAccount?.address, poolId, poolStatesKey, assetInfoMapKey, registeredAppIdsKey])

  const handleFilterChange = (key: 'status' | 'type' | 'search', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleBackToManage = () => {
    setSearchParams({})
    setPoolDetail(null)
  }

  const handleConnectWallet = () => {
    setDisplayWalletConnectModal(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toISOString().split('T')[0]
  }

  const formatRewards = (rewards: Array<{ symbol: string; amount: number }>) => {
    if (rewards.length === 0) return '--'
    return rewards.map(r => `${r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.symbol}`).join(', ')
  }


  // Pool detail view
  if (poolId) {
    if (loading) {
      return (
        <div className="min-h-screen bg-near-black text-off-white">
          <AppNav />
          <div className="container mx-auto px-4 py-16">
            <div className="text-center text-mid-grey">Loading...</div>
          </div>
          <Footer />
        </div>
      )
    }

    if (!poolDetail) {
      return (
        <div className="min-h-screen bg-near-black text-off-white">
          <AppNav />
          <div className="container mx-auto px-4 py-16">
            <button
              onClick={handleBackToManage}
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to manage
            </button>
            <h1 className="text-3xl font-medium text-off-white mb-4">Manage pool</h1>
            <p className="text-mid-grey">Pool not found.</p>
          </div>
          <Footer />
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />

        <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
          {/* Back Link */}
          <motion.button
            onClick={handleBackToManage}
            className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            ← Back to manage
          </motion.button>

          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-3xl font-medium text-off-white mb-2">Manage pool</h1>
            <p className="text-mid-grey">{poolDetail.displayName}</p>
          </motion.div>

          {/* Summary Panel */}
          <motion.div
            className="border-2 border-mid-grey/30 p-6 mb-8 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Pool ID</label>
                <div className="text-sm text-off-white">
                  {poolDetail.app_id ? (
                    <a
                      href={getExplorerUrl('application', poolDetail.app_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber hover:text-amber/80 hover:underline inline-flex items-center gap-1"
                    >
                      {poolDetail.app_id}
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    '--'
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Type</label>
                <div className="text-sm text-off-white">
                  {poolDetail.type === 'single' ? 'Single' : 'LP'}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Status</label>
                <div className="flex items-center gap-2">
                  <StatusDot status={poolDetail.status} />
                  <span className="text-sm text-off-white capitalize">{poolDetail.status}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Stakers</label>
                <div className="text-sm text-off-white">
                  {poolDetail.stakers.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">APR</label>
                <div className={`text-sm ${
                  poolDetail.status === 'active' && poolDetail.apr !== null ? 'text-amber font-medium' : 'text-off-white'
                }`}>
                  {poolDetail.apr !== null ? `${poolDetail.apr.toFixed(2)}%` : '--'}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Remaining rewards</label>
                <div className="text-sm text-off-white">
                  {formatRewards(poolDetail.rewardsRemaining)}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Schedule start</label>
                <div className="text-sm text-off-white">
                  {formatDate(poolDetail.schedule.startTime)}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Estimated end date</label>
                <div className="text-sm text-off-white">
                  {poolDetail.app_id && poolStates.get(poolDetail.app_id.toString()) 
                    ? formatDate(calculateExpectedEndDate(
                        poolStates.get(poolDetail.app_id.toString())!,
                        assetInfoMap.get(poolDetail.rewardAssets[0]?.id)?.decimals || 6
                      ))
                    : '--'}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Creator</label>
                <div className="text-sm text-off-white">
                  {poolDetail.creator ? (
                    <span className="text-amber">
                      <AddressDisplay 
                        address={poolDetail.creator}
                        showExplorerLink={true}
                      />
                    </span>
                  ) : (
                    '--'
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Metadata Update Section */}
          <PoolMetadataEditor
            poolDetail={poolDetail}
            onSuccess={async () => {
              // Refetch pool detail to get updated metadata
              if (poolId) {
                const detail = await getManagePoolDetail(poolId, poolStates, assetInfoMap)
                if (detail) {
                  setPoolDetail(detail)
                }
              }
              refetchPools()
            }}
          />

          {/* Admin Actions */}
          {poolDetail.app_id && (
            <PoolAdminActions
              poolDetail={poolDetail}
              poolState={poolStates.get(poolDetail.app_id.toString())}
              assetInfoMap={assetInfoMap}
              networkConfig={networkConfig}
              activeAccount={activeAccount}
              activeWallet={activeWallet}
              transactionSigner={transactionSigner}
              onSuccess={() => {
                refetchPools()
                openToast('Pool updated successfully', 'success')
              }}
            />
          )}
        </div>

        <Footer />
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-3xl font-medium text-off-white mb-2">Manage</h1>
            <p className="text-mid-grey">Pools created by you</p>
          </div>
          
        </motion.div>

        {/* Not Connected State */}
        {!activeAccount && (
          <motion.div
            className="py-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-medium text-off-white mb-2">Connect wallet</h2>
            <p className="text-mid-grey mb-6">Connect a wallet to view pools you created.</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors"
            >
              Connect
            </button>
          </motion.div>
        )}

        {/* Connected but no pools */}
        {activeAccount && !loading && pools.length === 0 && (
          <motion.div
            className="py-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl font-medium text-off-white mb-2">No pools found</h2>
            <p className="text-mid-grey">Pools you create will appear here.</p>
          </motion.div>
        )}

        {/* Filters and Table */}
        {activeAccount && pools.length > 0 && (
          <>
            {/* Filters */}
            <motion.div
              className="flex flex-col md:flex-row gap-4 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Dropdown
                label="Status"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              />
              <Dropdown
                label="Type"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'single', label: 'Single' },
                  { value: 'lp', label: 'LP' },
                ]}
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
              />
              <div className="flex-1">
                <label className="sr-only">Search</label>
                <input
                  type="text"
                  placeholder="Search by pool or asset"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>
            </motion.div>

            {/* Pools Table */}
            {loading ? (
              <motion.div
                className="py-16 text-center text-mid-grey"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Loading...
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <ManagePoolsTable
                  pools={pools}
                  filters={filters}
                />
              </motion.div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

// Pool Admin Actions Component
interface PoolAdminActionsProps {
  poolDetail: ManagePoolDetail
  poolState: StakingPoolState | undefined
  assetInfoMap: Map<string, { symbol: string; decimals?: number }>
  networkConfig: any
  activeAccount: any
  activeWallet: any
  transactionSigner: any
  onSuccess: () => void
}

function PoolAdminActions({
  poolDetail,
  poolState,
  assetInfoMap,
  activeAccount,
  activeWallet,
  transactionSigner,
  onSuccess,
}: PoolAdminActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [addRewardsAmount, setAddRewardsAmount] = useState('')
  const { openToast } = useToast()

  if (!poolDetail.app_id || !activeAccount?.address || !activeWallet || !transactionSigner) {
    return null
  }

  const isActive = poolState?.contractState === BigInt(1)
  const rewardAssetInfo = assetInfoMap.get(poolDetail.rewardAssets[0]?.id)
  const rewardAssetDecimals = rewardAssetInfo?.decimals || 6

  const handleToggleActive = async () => {
    if (!activeAccount?.address || !transactionSigner) {
      openToast('Please connect your wallet', 'error')
      return
    }

    setIsProcessing(true)
    try {
      if (isActive) {
        await setContractInactive({
          address: activeAccount.address,
          signer: transactionSigner,
          appId: poolDetail.app_id!,
        })
        openToast('Pool deactivated successfully', 'success')
      } else {
        await setContractActive({
          address: activeAccount.address,
          signer: transactionSigner,
          appId: poolDetail.app_id!,
        })
        openToast('Pool activated successfully', 'success')
      }
      onSuccess()
    } catch (error) {
      console.error('Failed to toggle pool status:', error)
      openToast(error instanceof Error ? error.message : 'Failed to update pool status', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveRewards = async () => {
    if (!activeAccount?.address || !transactionSigner) {
      openToast('Please connect your wallet', 'error')
      return
    }

    if (isActive) {
      openToast('Pool must be inactive to remove rewards', 'error')
      return
    }

    setIsProcessing(true)
    try {
      await removeRewards({
        address: activeAccount.address,
        signer: transactionSigner,
        appId: poolDetail.app_id!,
      })
      openToast('Rewards removed successfully', 'success')
      onSuccess()
    } catch (error) {
      console.error('Failed to remove rewards:', error)
      openToast(error instanceof Error ? error.message : 'Failed to remove rewards', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddMoreRewards = async () => {
    if (!activeAccount?.address || !transactionSigner) {
      openToast('Please connect your wallet', 'error')
      return
    }

    const amount = parseFloat(addRewardsAmount)
    if (isNaN(amount) || amount <= 0) {
      openToast('Please enter a valid reward amount', 'error')
      return
    }

    setIsProcessing(true)
    try {
      await fundMoreRewards({
        address: activeAccount.address,
        signer: transactionSigner,
        appId: poolDetail.app_id!,
        rewardAssetId: parseInt(poolDetail.rewardAssets[0]?.id || '0', 10),
        rewardAmount: amount,
        rewardAssetDecimals,
      })
      openToast('Rewards added successfully', 'success')
      setAddRewardsAmount('')
      onSuccess()
    } catch (error) {
      console.error('Failed to add rewards:', error)
      openToast(error instanceof Error ? error.message : 'Failed to add rewards', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <motion.div
      className="border-2 border-mid-grey/30 p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <h2 className="text-lg font-medium text-off-white mb-4">Admin Actions</h2>

      {/* Active/Inactive Toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm text-off-white font-medium">Pool Status</label>
            <p className="text-xs text-mid-grey mt-1">
              {isActive ? 'Pool is currently active' : 'Pool is currently inactive'}
            </p>
          </div>
          <button
            onClick={handleToggleActive}
            disabled={isProcessing}
            className={`px-6 py-2 border-2 font-medium transition-colors ${
              isActive
                ? 'border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10'
                : 'border-amber text-amber hover:bg-amber/10'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? 'Processing...' : isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Remove Rewards */}
      {!isActive && (
        <div className="space-y-3 border-t-2 border-mid-grey/20 pt-4">
          <div>
            <label className="text-sm text-off-white font-medium">Remove Rewards</label>
            <p className="text-xs text-mid-grey mt-1">
              Remove unclaimed rewards from the pool. Only available when pool is inactive.
            </p>
          </div>
          <button
            onClick={handleRemoveRewards}
            disabled={isProcessing}
            className="px-6 py-2 border-2 border-red-500/50 text-red-400 font-medium hover:border-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Remove Rewards'}
          </button>
        </div>
      )}

      {/* Add More Rewards */}
      <div className="space-y-3 border-t-2 border-mid-grey/20 pt-4">
        <div>
          <label className="text-sm text-off-white font-medium mb-2 block">
            Add More Rewards
          </label>
          <p className="text-xs text-mid-grey mb-3">
            Add additional rewards to extend the pool duration. This will increase the estimated end time.
          </p>
          <div className="flex gap-3">
            <input
              type="number"
              step="any"
              min="0"
              value={addRewardsAmount}
              onChange={(e) => setAddRewardsAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
              disabled={isProcessing}
            />
            <span className="px-3 py-2 border-2 border-mid-grey/30 text-mid-grey text-sm flex items-center">
              {rewardAssetInfo?.symbol || 'TOKEN'}
            </span>
            <AnimButton
              text={isProcessing ? 'Processing...' : 'Add Rewards'}
              onClick={handleAddMoreRewards}
              disabled={isProcessing || !addRewardsAmount}
              className="bg-amber border-amber text-off-white hover:bg-amber/90 hover:border-amber/90"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Pool Metadata Editor Component
interface PoolMetadataEditorProps {
  poolDetail: ManagePoolDetail
  onSuccess: () => void
}

function PoolMetadataEditor({ poolDetail, onSuccess }: PoolMetadataEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: poolDetail.name || poolDetail.displayName || '',
    website_url: poolDetail.website_url || '',
    description: poolDetail.description || '',
    tags: poolDetail.tags || [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { openToast } = useToast()

  const tagOptions = ['Stablecoin', 'Liquidity', 'Governance', 'Infrastructure', 'NFT', 'Other']

  const handleSave = async () => {
    // Validate
    const newErrors: Record<string, string> = {}
    
    if (!formData.name || formData.name.length < 2 || formData.name.length > 48) {
      newErrors.name = 'Pool name must be 2-48 characters'
    }
    
    if (formData.website_url && formData.website_url.length > 0) {
      try {
        new URL(formData.website_url)
      } catch {
        newErrors.website_url = 'Enter a valid URL'
      }
    }
    
    if (formData.description && formData.description.length > 140) {
      newErrors.description = 'Description cannot exceed 140 characters'
    }
    
    if (formData.tags.length > 3) {
      newErrors.tags = 'Select up to 3 tags'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    setErrors({})

    try {
      await updatePool(poolDetail.id, {
        name: formData.name,
        website_url: formData.website_url || undefined,
        description: formData.description || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      })
      setIsEditing(false)
      onSuccess()
    } catch (error) {
      console.error('Failed to update metadata:', error)
      openToast(error instanceof Error ? error.message : 'Failed to update metadata', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: poolDetail.name || poolDetail.displayName || '',
      website_url: poolDetail.website_url || '',
      description: poolDetail.description || '',
      tags: poolDetail.tags || [],
    })
    setErrors({})
    setIsEditing(false)
  }

  const handleTagToggle = (tag: string) => {
    const newTags = formData.tags.includes(tag)
      ? formData.tags.filter(t => t !== tag)
      : formData.tags.length < 3
      ? [...formData.tags, tag]
      : formData.tags
    
    setFormData(prev => ({ ...prev, tags: newTags }))
  }

  return (
    <motion.div
      className="border-2 border-mid-grey/30 p-6 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-off-white">Metadata</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border-2 border-mid-grey/30 text-off-white hover:border-mid-grey transition-colors text-sm"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-mid-grey mb-2">
              Pool Name <span className="text-mid-grey">(required)</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter pool name"
              maxLength={48}
              className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
              disabled={isSaving}
            />
            {errors.name && <div className="mt-1 text-xs text-red-400">{errors.name}</div>}
          </div>

          <div>
            <label className="block text-sm text-mid-grey mb-2">Website URL</label>
            <input
              type="url"
              value={formData.website_url}
              onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
              disabled={isSaving}
            />
            {errors.website_url && <div className="mt-1 text-xs text-red-400">{errors.website_url}</div>}
          </div>

          <div>
            <label className="block text-sm text-mid-grey mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description (max 140 characters)"
              maxLength={140}
              rows={3}
              className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber resize-none"
              disabled={isSaving}
            />
            <div className="mt-1 text-xs text-mid-grey text-right">
              {formData.description.length}/140
            </div>
            {errors.description && <div className="mt-1 text-xs text-red-400">{errors.description}</div>}
          </div>

          <div>
            <label className="block text-sm text-mid-grey mb-3">Tags (select up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const isSelected = formData.tags.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    disabled={isSaving}
                    className={`px-3 py-1 border-2 text-sm transition-colors ${
                      isSelected
                        ? 'border-amber bg-amber/10 text-amber'
                        : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>
            {errors.tags && <div className="mt-1 text-xs text-red-400">{errors.tags}</div>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2 border-2 border-mid-grey/30 text-off-white hover:border-mid-grey transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <AnimButton
              text={isSaving ? 'Saving...' : 'Save Changes'}
              onClick={handleSave}
              disabled={isSaving}
              className="bg-amber border-amber text-off-white hover:bg-amber/90 hover:border-amber/90"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-mid-grey mb-1 block">Pool Name</label>
            <div className="text-sm text-off-white">{poolDetail.name || poolDetail.displayName || '--'}</div>
          </div>
          {poolDetail.website_url && (
            <div>
              <label className="text-xs text-mid-grey mb-1 block">Website</label>
              <div className="text-sm text-off-white">
                <a
                  href={poolDetail.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber hover:text-amber/80 hover:underline inline-flex items-center gap-1"
                >
                  {poolDetail.website_url}
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          )}
          {poolDetail.description && (
            <div>
              <label className="text-xs text-mid-grey mb-1 block">Description</label>
              <div className="text-sm text-off-white">{poolDetail.description}</div>
            </div>
          )}
          {poolDetail.tags && poolDetail.tags.length > 0 && (
            <div>
              <label className="text-xs text-mid-grey mb-1 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {poolDetail.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 border-2 border-mid-grey/30 text-mid-grey text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

