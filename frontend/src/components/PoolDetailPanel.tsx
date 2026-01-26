import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@txnlab/use-wallet-react'
import { usePools } from '../context/poolsContext'
import type { StakingPoolState } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { useWalletContext } from '../context/wallet'
import { useToast } from '../context/toastContext'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import { fetchUserStakingInfo, formatAmount } from '../utils/poolUtils'
import { stake, unstake, claimRewards } from '../contracts/staking/user'
import { StatusDot } from './StatusDot'
import { StatItem } from './StatItem'
import { CopyField } from './CopyField'
import type { PoolDetail } from '../types/pool'

interface PoolDetailPanelProps {
  poolId: string
  onClose: () => void
}

export function PoolDetailPanel({ poolId, onClose }: PoolDetailPanelProps) {
  const { activeAccount, transactionSigner } = useWallet()
  const { networkConfig } = useNetwork()
  const { poolStates, refetchPools } = usePools()
  const { assets: walletAssets, refetchBalances } = useWalletContext()
  const { openToast } = useToast()
  const queryClient = useQueryClient()
  const [stakeAmount, setStakeAmount] = useState('')
  const [isUnstake, setIsUnstake] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const network = networkConfig.id
  
  // Create signer from transactionSigner function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signer = useMemo<any>(() => {
    if (!activeAccount || !transactionSigner) return null
    return transactionSigner
  }, [activeAccount, transactionSigner])

  // Get pool state from context
  const poolState = useMemo(() => {
    return poolStates.get(poolId)
  }, [poolId, poolStates])

  // Fetch asset information
  const assetIds = useMemo(() => {
    if (!poolState) return []
    const ids: string[] = []
    if (poolState.stakedAssetId) ids.push(poolState.stakedAssetId.toString())
    if (poolState.rewardAssetId) ids.push(poolState.rewardAssetId.toString())
    return ids
  }, [poolState])

  const { data: assetInfoMap = new Map() } = useQuery({
    queryKey: ['assetInfo', network, assetIds.join(',')],
    queryFn: () => fetchMultipleAssetInfo(assetIds, networkConfig),
    enabled: assetIds.length > 0 && !!networkConfig.indexerServer,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch user staking info
  const { data: userStakingInfo, refetch: refetchUserInfo } = useQuery({
    queryKey: ['userStaking', network, poolId, activeAccount?.address],
    queryFn: async () => {
      if (!activeAccount?.address || !poolState) return null
      return fetchUserStakingInfo(
        network,
        BigInt(poolId),
        activeAccount.address,
        poolState.rewardPerToken
      )
    },
    enabled: !!activeAccount?.address && !!poolState,
    staleTime: 30 * 1000,
  })

  // Transform pool state to PoolDetail format
  const pool = useMemo<PoolDetail | null>(() => {
    if (!poolState) return null

    const stakedAssetInfo = poolState.stakedAssetId 
      ? assetInfoMap.get(poolState.stakedAssetId.toString())
      : null
    const rewardAssetInfo = poolState.rewardAssetId
      ? assetInfoMap.get(poolState.rewardAssetId.toString())
      : null

    if (!stakedAssetInfo || !rewardAssetInfo) return null

    const isLpToken = stakedAssetInfo.symbol?.toUpperCase().includes('LP') || false
    const poolType: 'single' | 'lp' = isLpToken ? 'lp' : 'single'
    const apr = poolState.aprBps ? Number(poolState.aprBps) / 100 : null

    const now = BigInt(Math.floor(Date.now() / 1000))
    const isActive = 
      poolState.contractState === BigInt(1) &&
      poolState.startTime && poolState.startTime <= now &&
      poolState.endTime && poolState.endTime > now

    const status: 'active' | 'inactive' = isActive ? 'active' : 'inactive'

    const stakedSymbol = stakedAssetInfo.symbol || `Asset ${poolState.stakedAssetId}`
    const rewardSymbol = rewardAssetInfo.symbol || `Asset ${poolState.rewardAssetId}`
    const displayName = isLpToken 
      ? stakedSymbol 
      : `${stakedSymbol} / ${rewardSymbol}`

    // Calculate user info
    const stakedAmount = userStakingInfo?.stakedAmount 
      ? Number(userStakingInfo.stakedAmount) / (10 ** (stakedAssetInfo.decimals || 6))
      : 0

    const claimableRewards = userStakingInfo?.claimableRewards
      ? Number(userStakingInfo.claimableRewards) / (10 ** (rewardAssetInfo.decimals || 6))
      : 0

    const rewardsRemaining = poolState.totalRewards && poolState.accruedRewards
      ? Number(poolState.totalRewards - poolState.accruedRewards) / (10 ** (rewardAssetInfo.decimals || 6))
      : 0

    return {
      id: poolId,
      displayName,
      type: poolType,
      status,
      apr,
      tvlUsd: poolState.totalStaked 
        ? Number(poolState.totalStaked) / (10 ** (stakedAssetInfo.decimals || 6))
        : null,
      user: {
        stakedAmount,
        claimableRewards: claimableRewards > 0 ? [{
          symbol: rewardSymbol,
          amount: claimableRewards,
        }] : [],
      },
      depositAsset: {
        symbol: stakedSymbol,
        id: poolState.stakedAssetId.toString(),
        decimals: stakedAssetInfo.decimals,
      },
      rewardAssets: [{
        symbol: rewardSymbol,
        id: poolState.rewardAssetId.toString(),
        decimals: rewardAssetInfo.decimals,
      }],
      rewardsRemaining: rewardsRemaining > 0 ? [{
        symbol: rewardSymbol,
        amount: rewardsRemaining,
      }] : [],
      schedule: {
        startTime: poolState.startTime 
          ? new Date(Number(poolState.startTime) * 1000).toISOString()
          : null,
        endTime: poolState.endTime
          ? new Date(Number(poolState.endTime) * 1000).toISOString()
          : null,
      },
      creator: poolState.adminAddress || '',
      contractRef: {
        appId: poolId,
      },
    }
  }, [poolState, poolId, assetInfoMap, userStakingInfo])

  // Get wallet balance
  const walletBalance = useMemo(() => {
    if (!pool || !walletAssets) return '0'
    const asset = walletAssets.find(a => a.assetId === pool.depositAsset.id)
    if (!asset) return '0'
    const balance = BigInt(asset.balance)
    const decimals = asset.decimals || 6
    return formatAmount(balance, decimals)
  }, [pool, walletAssets])

  const totalClaimable = pool?.user.claimableRewards.reduce((sum, r) => sum + r.amount, 0) || 0

  // Calculate values for display
  const stakeAmountNum = parseFloat(stakeAmount) || 0
  const currentStakedAmount = pool?.user.stakedAmount || 0
  const hasExistingStake = currentStakedAmount > 0
  
  // Calculate total stake (current + new)
  const totalStake = isUnstake 
    ? Math.max(0, currentStakedAmount - stakeAmountNum)
    : currentStakedAmount + stakeAmountNum

  // Calculate USD value (placeholder - implement price feed integration)
  const calculateUsdValue = (): number | null => {
    if (!pool?.tvlUsd || pool.tvlUsd === 0) {
      return null
    }
    return null // Placeholder - implement price feed integration
  }

  const stakeUsdValue = stakeAmountNum > 0 ? calculateUsdValue() : null

  // Network fees: 0.0225 ALGO for box creation, but refunded if user already has stake
  const BOX_CREATION_FEE_ALGO = 0.0225
  const showNetworkFeeInfo = !isUnstake && stakeAmountNum > 0

  // Helper function for optimistic updates
  const optimisticallyUpdateStake = (amount: number, isUnstake: boolean) => {
    if (!pool || !poolState || !userStakingInfo || !activeAccount?.address || !poolId) return null

    const stakedAssetDecimals = pool.depositAsset.decimals || 6
    const amountInSmallestUnit = BigInt(Math.floor(amount * 10 ** stakedAssetDecimals))
    
    // Store previous state for rollback
    const previousUserInfo = { ...userStakingInfo }
    const previousPoolState = { ...poolState }
    
    // Optimistically update user staking info
    const newStakedAmount = isUnstake
      ? (previousUserInfo.stakedAmount > amountInSmallestUnit 
          ? previousUserInfo.stakedAmount - amountInSmallestUnit 
          : BigInt(0))
      : previousUserInfo.stakedAmount + amountInSmallestUnit

    queryClient.setQueryData(
      ['userStaking', network, poolId, activeAccount.address],
      {
        ...previousUserInfo,
        stakedAmount: newStakedAmount,
      }
    )

    // Optimistically update pool state (totalStaked)
    const newTotalStaked = isUnstake
      ? (previousPoolState.totalStaked && previousPoolState.totalStaked > amountInSmallestUnit
          ? previousPoolState.totalStaked - amountInSmallestUnit
          : BigInt(0))
      : (previousPoolState.totalStaked || BigInt(0)) + amountInSmallestUnit

    // Get the query key for pools - construct from current poolStates keys
    const poolStateKeys = Array.from(poolStates.keys())
    const poolsQueryKey = ['pools', 'states', network, poolStateKeys.join(',')]
    
    queryClient.setQueryData(
      poolsQueryKey,
      (oldStates: Map<string, StakingPoolState> | undefined) => {
        if (!oldStates) return oldStates
        const newStates = new Map(oldStates)
        const currentState = newStates.get(poolId)
        if (currentState) {
          newStates.set(poolId, {
            ...currentState,
            totalStaked: newTotalStaked,
          })
        }
        return newStates
      }
    )

    return { previousUserInfo, previousPoolState }
  }

  // Handlers
  const handleStake = async () => {
    if (!pool || !activeAccount || !signer || !stakeAmount) return
    
    const amount = parseFloat(stakeAmount)
    if (amount <= 0) {
      openToast({
        type: 'error',
        message: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
      })
      return
    }

    setIsProcessing(true)
    openToast({
      type: 'loading',
      message: 'Staking assets...',
      description: `Staking ${stakeAmount} ${pool.depositAsset.symbol}`,
    })

    // Store previous state for rollback
    const previousState = optimisticallyUpdateStake(amount, false)
    
    try {
      await stake({
        address: activeAccount.address,
        signer,
        appId: Number(pool.id),
        stakedAssetId: Number(pool.depositAsset.id!),
        amount,
        stakedAssetDecimals: pool.depositAsset.decimals || 6,
      })

      // Immediately refetch all data to get accurate state
      await Promise.all([refetchPools(), refetchUserInfo(), refetchBalances()])
      setStakeAmount('')
      openToast({
        type: 'success',
        message: 'Stake successful',
        description: `Successfully staked ${amount} ${pool.depositAsset.symbol}`,
      })
    } catch (error) {
      console.error('Stake failed:', error)
      
      // Rollback optimistic update on error
      if (previousState && activeAccount?.address && poolId) {
        queryClient.setQueryData(
          ['userStaking', network, poolId, activeAccount.address],
          previousState.previousUserInfo
        )
        const poolStateKeys = Array.from(poolStates.keys())
        const poolsQueryKey = ['pools', 'states', network, poolStateKeys.join(',')]
        queryClient.setQueryData(
          poolsQueryKey,
          (oldStates: Map<string, StakingPoolState> | undefined) => {
            if (!oldStates) return oldStates
            const newStates = new Map(oldStates)
            if (previousState.previousPoolState) {
              newStates.set(poolId, previousState.previousPoolState)
            }
            return newStates
          }
        )
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      openToast({
        type: 'error',
        message: 'Stake failed',
        description: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnstake = async () => {
    if (!pool || !activeAccount || !signer || !stakeAmount) return
    
    const amount = parseFloat(stakeAmount)
    if (amount <= 0) {
      openToast({
        type: 'error',
        message: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
      })
      return
    }

    setIsProcessing(true)
    openToast({
      type: 'loading',
      message: 'Unstaking assets...',
      description: `Unstaking ${stakeAmount} ${pool.depositAsset.symbol}`,
    })

    // Store previous state for rollback
    const previousState = optimisticallyUpdateStake(amount, true)
    
    try {
      await unstake({
        address: activeAccount.address,
        signer,
        appId: Number(pool.id),
        amount,
        stakedAssetDecimals: pool.depositAsset.decimals || 6,
      })

      // Immediately refetch all data to get accurate state
      await Promise.all([refetchPools(), refetchUserInfo(), refetchBalances()])
      setStakeAmount('')
      openToast({
        type: 'success',
        message: 'Unstake successful',
        description: `Successfully unstaked ${amount} ${pool.depositAsset.symbol}`,
      })
    } catch (error) {
      console.error('Unstake failed:', error)
      
      // Rollback optimistic update on error
      if (previousState && activeAccount?.address && poolId) {
        queryClient.setQueryData(
          ['userStaking', network, poolId, activeAccount.address],
          previousState.previousUserInfo
        )
        const poolStateKeys = Array.from(poolStates.keys())
        const poolsQueryKey = ['pools', 'states', network, poolStateKeys.join(',')]
        queryClient.setQueryData(
          poolsQueryKey,
          (oldStates: Map<string, StakingPoolState> | undefined) => {
            if (!oldStates) return oldStates
            const newStates = new Map(oldStates)
            if (previousState.previousPoolState) {
              newStates.set(poolId, previousState.previousPoolState)
            }
            return newStates
          }
        )
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      openToast({
        type: 'error',
        message: 'Unstake failed',
        description: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClaim = async () => {
    if (!pool || !activeAccount || !signer) return
    
    setIsProcessing(true)
    openToast({
      type: 'loading',
      message: 'Claiming rewards...',
      description: 'Processing your reward claim',
    })

    // Store previous state for rollback
    const previousUserInfo = userStakingInfo
    const rewardAmounts = pool.user.claimableRewards
      .map(r => `${r.amount.toFixed(2)} ${r.symbol}`)
      .join(', ')

    // Optimistically update claimable rewards to 0
    if (previousUserInfo && activeAccount?.address && poolId) {
      queryClient.setQueryData(
        ['userStaking', network, poolId, activeAccount.address],
        {
          ...previousUserInfo,
          claimableRewards: BigInt(0),
        }
      )
    }
    
    try {
      await claimRewards({
        address: activeAccount.address,
        signer,
        appId: Number(pool.id),
      })

      // Immediately refetch all data to get accurate state
      await Promise.all([refetchPools(), refetchUserInfo(), refetchBalances()])
      
      openToast({
        type: 'success',
        message: 'Rewards claimed',
        description: `Successfully claimed ${rewardAmounts}`,
      })
    } catch (error) {
      console.error('Claim failed:', error)
      
      // Rollback optimistic update on error
      if (previousUserInfo && activeAccount?.address && poolId) {
        queryClient.setQueryData(
          ['userStaking', network, poolId, activeAccount.address],
          previousUserInfo
        )
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      openToast({
        type: 'error',
        message: 'Claim failed',
        description: errorMessage,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleDateString()
  }

  if (!poolState) {
    return (
      <div className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0">
        <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center text-mid-grey">Loading...</div>
        </div>
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0">
        <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-off-white">Pool Details</h2>
              <button
                onClick={onClose}
                className="text-mid-grey hover:text-off-white transition-colors"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="text-center text-mid-grey py-16">Pool not found or incomplete data.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-medium text-off-white mb-2">{pool.displayName}</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-mid-grey">
                  {pool.type === 'single' ? 'Single-asset pool' : 'LP pool'}
                </span>
                <div className="flex items-center gap-2">
                  <StatusDot status={pool.status} />
                  <span className="text-sm text-mid-grey capitalize">{pool.status}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-mid-grey hover:text-off-white transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-mid-grey/30">
            <div>
              <div className="text-xs text-mid-grey mb-1">APR</div>
              <div className={`text-xl font-medium ${
                pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-off-white'
              }`}>
                {pool.apr !== null ? `${pool.apr.toFixed(2)}%` : '--'}
              </div>
            </div>
            <StatItem
              label="Total Staked"
              value={pool.tvlUsd !== null && pool.tvlUsd > 0 ? `$${(pool.tvlUsd / 1000).toFixed(0)}K` : '--'}
              variant="dark"
            />
            <StatItem
              label="Reward Asset(s)"
              value={pool.rewardAssets.map(a => a.symbol).join(', ')}
              variant="dark"
            />
            <StatItem
              label="Rewards Remaining"
              value={pool.rewardsRemaining.map(r => `${r.amount.toLocaleString()} ${r.symbol}`).join(', ') || '--'}
              variant="dark"
            />
            {pool.schedule.endTime && (
              <StatItem
                label="End Date"
                value={formatDate(pool.schedule.endTime)}
                variant="dark"
              />
            )}
          </div>

          {/* Action Panel */}
          <div className="mb-8 pb-8 border-b border-mid-grey/30">
            <h3 className="text-lg font-medium text-off-white mb-4">Actions</h3>
            <div className="space-y-4">
              {/* Info Display */}
              <div className="space-y-2 pb-3 border-b border-mid-grey/20">
                <div className="flex justify-between text-sm">
                  <span className="text-mid-grey">APR</span>
                  <span className={`${pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-mid-grey'}`}>
                    {pool.apr !== null ? `+${pool.apr.toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-mid-grey">Wallet Balance</span>
                  <span className="text-off-white">{walletBalance} {pool.depositAsset.symbol}</span>
                </div>
                {pool.user.stakedAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-mid-grey">Current Staked</span>
                    <span className="text-off-white">{pool.user.stakedAmount.toLocaleString()} {pool.depositAsset.symbol}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-mid-grey mb-2">
                  Amount ({pool.depositAsset.symbol})
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-50"
                  />
                  <button
                    onClick={() => setStakeAmount(isUnstake ? pool.user.stakedAmount.toString() : walletBalance)}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-mid-grey/30 text-mid-grey hover:text-off-white transition-colors disabled:opacity-50"
                  >
                    MAX
                  </button>
                </div>
              </div>
              
              {/* Transaction Details - only show when amount is entered */}
              {stakeAmountNum > 0 && (
                <div className="border-t border-mid-grey/20 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-mid-grey">
                      {isUnstake ? 'Amount to Withdraw' : 'Stake to be Added'}
                    </span>
                    <span className="text-off-white font-medium">
                      {stakeAmountNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} {pool.depositAsset.symbol}
                    </span>
                  </div>
                  {stakeUsdValue !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-grey">USD Value</span>
                      <span className="text-off-white">
                        ${stakeUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {!isUnstake && (
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-grey">Total Stake</span>
                      <span className="text-off-white font-medium">
                        {totalStake.toLocaleString(undefined, { maximumFractionDigits: 6 })} {pool.depositAsset.symbol}
                      </span>
                    </div>
                  )}
                  {showNetworkFeeInfo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-grey">Network Fee</span>
                      <span className="text-off-white">
                        {hasExistingStake ? (
                          <span className="text-xs">
                            {BOX_CREATION_FEE_ALGO} ALGO <span className="text-mid-grey">(refunded - existing stake)</span>
                          </span>
                        ) : (
                          `${BOX_CREATION_FEE_ALGO} ALGO`
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => setIsUnstake(false)}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 border transition-colors ${
                    !isUnstake
                      ? 'border-amber bg-amber text-off-white'
                      : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Stake
                </button>
                <button
                  onClick={() => setIsUnstake(true)}
                  disabled={isProcessing}
                  className={`flex-1 px-4 py-2 border transition-colors ${
                    isUnstake
                      ? 'border-amber bg-amber text-off-white'
                      : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Unstake
                </button>
              </div>
              <button
                onClick={isUnstake ? handleUnstake : handleStake}
                disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0}
                className={`w-full px-4 py-2 border transition-colors mb-4 ${
                  isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0
                    ? 'border-mid-grey/30 text-mid-grey cursor-not-allowed opacity-50'
                    : 'border-amber bg-amber text-off-white hover:bg-amber/90'
                }`}
              >
                {isProcessing ? 'Processing...' : `${isUnstake ? 'UNSTAKE' : 'STAKE'} ${pool.depositAsset.symbol}`}
              </button>
              <button
                onClick={handleClaim}
                disabled={totalClaimable === 0 || isProcessing}
                className={`w-full px-4 py-2 border transition-colors ${
                  totalClaimable > 0 && !isProcessing
                    ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
                    : 'border-mid-grey/30 text-mid-grey cursor-not-allowed opacity-50'
                }`}
              >
                {isProcessing ? 'Processing...' : `Claim Rewards${totalClaimable > 0 ? ` (${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})` : ''}`}
              </button>
            </div>
          </div>

          {/* Pool Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-off-white mb-4">Pool Parameters</h3>
            <CopyField label="Pool ID" value={pool.id} variant="dark" />
            <CopyField label="Deposit Asset" value={pool.depositAsset.id || pool.depositAsset.symbol} variant="dark" />
            <CopyField
              label="Reward Asset(s)"
              value={pool.rewardAssets.map(a => a.id || a.symbol).join(', ')}
              variant="dark"
            />
            {pool.schedule.startTime && (
              <CopyField label="Start Time" value={formatDate(pool.schedule.startTime)} variant="dark" />
            )}
            {pool.schedule.endTime && (
              <CopyField label="End Time" value={formatDate(pool.schedule.endTime)} variant="dark" />
            )}
            <CopyField label="Creator Address" value={pool.creator} variant="dark" />
            {pool.contractRef.appId && (
              <CopyField label="Contract App ID" value={pool.contractRef.appId} variant="dark" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
