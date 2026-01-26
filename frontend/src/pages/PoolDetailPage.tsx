import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@txnlab/use-wallet-react'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { usePools } from '../context/poolsContext'
import type { StakingPoolState } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { useWalletContext } from '../context/wallet'
import { useToast } from '../context/toastContext'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import { fetchUserStakingInfo, formatAmount, calculateEstimatedRewards } from '../utils/poolUtils'
import { stake, unstake, claimRewards } from '../contracts/staking/user'
import { StatusDot } from '../components/StatusDot'
import { StatItem } from '../components/StatItem'
import { CopyField } from '../components/CopyField'
import type { PoolDetail } from '../types/pool'

interface ActionsPanelProps {
  pool: PoolDetail
  depositAmount: string
  setDepositAmount: (value: string) => void
  isWithdraw: boolean
  setIsWithdraw: (value: boolean) => void
  totalClaimable: number
  walletBalance: string
  onStake: () => Promise<void>
  onUnstake: () => Promise<void>
  onClaim: () => Promise<void>
  isProcessing: boolean
  currentStakedAmount: number
}

function ActionsPanel({
  pool,
  depositAmount,
  setDepositAmount,
  isWithdraw,
  setIsWithdraw,
  totalClaimable,
  walletBalance,
  onStake,
  onUnstake,
  onClaim,
  isProcessing,
  currentStakedAmount,
}: ActionsPanelProps) {
  const handleMax = () => {
    if (isWithdraw) {
      // Set to staked amount
      setDepositAmount(pool.user.stakedAmount.toString())
    } else {
      // Set to wallet balance
      setDepositAmount(walletBalance)
    }
  }

  const handleAction = async () => {
    if (isWithdraw) {
      await onUnstake()
    } else {
      await onStake()
    }
  }

  // Calculate values for display
  const stakeAmount = parseFloat(depositAmount) || 0
  const hasExistingStake = currentStakedAmount > 0
  
  // Calculate total stake (current + new)
  const totalStake = isWithdraw 
    ? Math.max(0, currentStakedAmount - stakeAmount)
    : currentStakedAmount + stakeAmount

  // Calculate USD value (simplified - using pool TVL ratio)
  // In a real implementation, you'd fetch asset prices from an oracle or API
  const calculateUsdValue = (): number | null => {
    if (!pool.tvlUsd || pool.tvlUsd === 0) {
      return null // Can't calculate without TVL data
    }
    // Estimate price per token from TVL
    // This is a simplified calculation - in production you'd use real price feeds
    // We'll use a placeholder calculation based on TVL
    // For now, we'll show null if we can't get accurate pricing
    // In production, integrate with a price oracle like Flux or CoinGecko
    return null // Placeholder - implement price feed integration
  }

  const stakeUsdValue = stakeAmount > 0 ? calculateUsdValue() : null

  // Network fees: 0.0225 ALGO for box creation, but refunded if user already has stake
  const BOX_CREATION_FEE_ALGO = 0.0225
  // Fee applies to stake calls, but is refunded immediately if user already has a stake
  const showNetworkFeeInfo = !isWithdraw && stakeAmount > 0

  return (
    <div className="border border-mid-grey/30 p-6">
      <h2 className="text-lg font-medium text-off-white mb-6">Pool Actions</h2>
      
      {/* Deposit/Withdraw Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsWithdraw(false)}
          disabled={isProcessing}
          className={`flex-1 px-4 py-2 border transition-colors ${
            !isWithdraw
              ? 'border-amber bg-amber text-off-white'
              : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Deposit
        </button>
        <button
          onClick={() => setIsWithdraw(true)}
          disabled={isProcessing}
          className={`flex-1 px-4 py-2 border transition-colors ${
            isWithdraw
              ? 'border-amber bg-amber text-off-white'
              : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Withdraw
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm text-mid-grey mb-2">
          Amount ({pool.depositAsset.symbol})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.00"
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber disabled:opacity-50"
          />
          <button 
            onClick={handleMax}
            disabled={isProcessing}
            className="px-4 py-2 border border-mid-grey/30 text-mid-grey hover:text-off-white transition-colors disabled:opacity-50"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Action Details */}
      <div className="space-y-3 mb-6">
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
        
        {/* Transaction Details - only show when amount is entered */}
        {stakeAmount > 0 && (
          <>
            <div className="border-t border-mid-grey/20 pt-3 mt-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-mid-grey">
                  {isWithdraw ? 'Amount to Withdraw' : 'Stake to be Added'}
                </span>
                <span className="text-off-white font-medium">
                  {stakeAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} {pool.depositAsset.symbol}
                </span>
              </div>
              {stakeUsdValue !== null && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-mid-grey">USD Value</span>
                  <span className="text-off-white">
                    ${stakeUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {!isWithdraw && (
                <div className="flex justify-between text-sm mb-2">
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
          </>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        onClick={handleAction}
        disabled={isProcessing || !depositAmount || parseFloat(depositAmount) <= 0}
        className={`w-full px-4 py-3 border transition-colors mb-4 ${
          isProcessing || !depositAmount || parseFloat(depositAmount) <= 0
            ? 'border-mid-grey/30 text-mid-grey cursor-not-allowed opacity-50'
            : 'border-amber bg-amber text-off-white hover:bg-amber/90'
        }`}
      >
        {isProcessing ? 'Processing...' : `${isWithdraw ? 'WITHDRAW' : 'DEPOSIT'} ${pool.depositAsset.symbol}`}
      </button>

      {/* Claim Rewards Button */}
      <button
        onClick={onClaim}
        disabled={totalClaimable === 0 || isProcessing}
        className={`w-full px-4 py-3 border transition-colors ${
          totalClaimable > 0 && !isProcessing
            ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
            : 'border-mid-grey/30 text-mid-grey cursor-not-allowed opacity-50'
        }`}
      >
        {isProcessing ? 'Processing...' : `Claim Rewards${totalClaimable > 0 ? ` (${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})` : ''}`}
      </button>
    </div>
  )
}

export function PoolDetailPage() {
  const [searchParams] = useSearchParams()
  const poolId = searchParams.get('poolId')
  const { activeAccount, transactionSigner } = useWallet()
  const { networkConfig } = useNetwork()
  const { poolStates, refetchPools } = usePools()
  const { assets: walletAssets, refetchBalances } = useWalletContext()
  const { openToast } = useToast()
  const queryClient = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [isWithdraw, setIsWithdraw] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const network = networkConfig.id
  
  // Create signer from transactionSigner function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const signer = useMemo<any>(() => {
    if (!activeAccount || !transactionSigner) return null
    // Wrap transactionSigner to match TransactionSigner interface
    return transactionSigner
  }, [activeAccount, transactionSigner])

  // Get pool state from context
  const poolState = useMemo(() => {
    if (!poolId) return null
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
      if (!poolId || !activeAccount?.address || !poolState) return null
      return fetchUserStakingInfo(
        network,
        BigInt(poolId),
        activeAccount.address,
        poolState.rewardPerToken
      )
    },
    enabled: !!poolId && !!activeAccount?.address && !!poolState,
    staleTime: 30 * 1000,
  })

  // Transform pool state to PoolDetail format
  const pool = useMemo<PoolDetail | null>(() => {
    if (!poolState || !poolId) return null

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

    const stakedSymbol = stakedAssetInfo.symbol || `Asset ${poolState.stakedAssetId?.toString() || 'unknown'}`
    const rewardSymbol = rewardAssetInfo.symbol || `Asset ${poolState.rewardAssetId?.toString() || 'unknown'}`
    const displayName = isLpToken 
      ? stakedSymbol 
      : `${stakedSymbol} / ${rewardSymbol}`

    // Calculate user info
    const stakedAmount = userStakingInfo?.stakedAmount 
      ? Number(userStakingInfo.stakedAmount) / (10 ** (stakedAssetInfo.decimals || 6))
      : 0

    // Calculate estimated rewards (since rewards only update on contract interaction)
    // Always use estimated rewards when we have pool state and user info
    const estimatedRewards = userStakingInfo && poolState
      ? calculateEstimatedRewards(poolState, userStakingInfo)
      : (userStakingInfo?.claimableRewards || BigInt(0))
    
    const claimableRewards = estimatedRewards > BigInt(0)
      ? Number(estimatedRewards) / (10 ** (rewardAssetInfo.decimals || 6))
      : 0

    // Calculate rewards remaining (simplified - would need contract balance)
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
        id: poolState.stakedAssetId?.toString() || '',
        decimals: stakedAssetInfo.decimals,
      },
      rewardAssets: [{
        symbol: rewardSymbol,
        id: poolState.rewardAssetId?.toString() || '',
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

  // Get wallet balance for staked asset
  const walletBalance = useMemo(() => {
    if (!pool || !walletAssets) return '0'
    const asset = walletAssets.find((a: { assetId: string }) => a.assetId === pool.depositAsset.id)
    if (!asset) return '0'
    const balance = BigInt(asset.balance)
    const decimals = asset.decimals || 6
    return formatAmount(balance, decimals)
  }, [pool, walletAssets])

  const totalClaimable = pool?.user.claimableRewards.reduce((sum, r) => sum + r.amount, 0) || 0

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
    // poolStates is Map<string, StakingPoolState>, so keys are already strings
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

  // Handlers for actions
  const handleStake = async () => {
    if (!pool || !activeAccount || !signer || !depositAmount) return
    
    const amount = parseFloat(depositAmount)
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
      description: `Staking ${depositAmount} ${pool.depositAsset.symbol}`,
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
      await Promise.all([
        refetchPools(),
        refetchUserInfo(),
        refetchBalances(),
      ])
      
      setDepositAmount('')
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
    if (!pool || !activeAccount || !signer || !depositAmount) return
    
    const amount = parseFloat(depositAmount)
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
      description: `Unstaking ${depositAmount} ${pool.depositAsset.symbol}`,
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
      await Promise.all([
        refetchPools(),
        refetchUserInfo(),
        refetchBalances(),
      ])
      
      setDepositAmount('')
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
    if (previousUserInfo && activeAccount?.address) {
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
      await Promise.all([
        refetchPools(),
        refetchUserInfo(),
        refetchBalances(),
      ])
      
      openToast({
        type: 'success',
        message: 'Rewards claimed',
        description: `Successfully claimed ${rewardAmounts}`,
      })
    } catch (error) {
      console.error('Claim failed:', error)
      
      // Rollback optimistic update on error
      if (previousUserInfo && activeAccount?.address) {
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

  if (!poolId) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">No pool selected.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!poolState) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Loading pool...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Pool not found or incomplete data.</p>
          </div>
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
        <Link
          to="/pools"
          className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
        >
          ← Back to Pools
        </Link>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Pool Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-medium text-off-white mb-2">{pool.displayName}</h1>
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

            {/* Key Stats */}
            <div>
              <h2 className="text-lg font-medium text-off-white mb-4">Pool Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-mid-grey mb-1">APR</div>
                  <div className={`text-xl font-medium ${
                    pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-off-white'
                  }`}>
                    {pool.apr !== null ? `${pool.apr.toFixed(2)}%` : '--'}
                  </div>
                </div>
                <StatItem
                  label="Total Deposited"
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
            </div>

            {/* Pool Parameters */}
            <div>
              <h2 className="text-lg font-medium text-off-white mb-4">Pool Parameters</h2>
              <div className="space-y-4">
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

          {/* Right Panel - Actions (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <ActionsPanel
              pool={pool}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              isWithdraw={isWithdraw}
              setIsWithdraw={setIsWithdraw}
              totalClaimable={totalClaimable}
              walletBalance={walletBalance}
              onStake={handleStake}
              onUnstake={handleUnstake}
              onClaim={handleClaim}
              isProcessing={isProcessing}
              currentStakedAmount={pool.user.stakedAmount}
            />
          </div>
        </div>

        {/* Mobile Action Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full px-6 py-4 bg-amber text-off-white font-medium border-t border-amber/20"
          >
            Deposit | Withdraw | Claim
          </button>
        </div>

        {/* Mobile Drawer */}
        {isDrawerOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-near-black/80 z-50"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-near-black border-t border-mid-grey/30 rounded-t-lg max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-near-black border-b border-mid-grey/30 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-off-white">Pool Actions</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-mid-grey hover:text-off-white transition-colors"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
              <div className="p-6">
                <ActionsPanel
                  pool={pool}
                  depositAmount={depositAmount}
                  setDepositAmount={setDepositAmount}
                  isWithdraw={isWithdraw}
                  setIsWithdraw={setIsWithdraw}
                  totalClaimable={totalClaimable}
                  walletBalance={walletBalance}
                  onStake={handleStake}
                  onUnstake={handleUnstake}
                  onClaim={handleClaim}
                  isProcessing={isProcessing}
                  currentStakedAmount={pool.user.stakedAmount}
                />
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}
