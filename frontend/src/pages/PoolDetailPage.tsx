import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useWallet } from '@txnlab/use-wallet-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { usePools } from '../context/poolsContext'
import type { StakingPoolState } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { useWalletContext } from '../context/wallet'
import { useToast } from '../context/toastContext'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import { fetchUserStakingInfo, formatAmount, calculateEstimatedRewards, fetchAllStakers } from '../utils/poolUtils'
import { stake, unstake, claimRewards } from '../contracts/staking/user'
import { StatusDot } from '../components/StatusDot'
import { StatItem } from '../components/StatItem'
import { AnimButton } from '../components/AnimButton'
import type { PoolDetail } from '../types/pool'
import { getPoolByAppId } from '../services/poolApiService'
import { ExternalLink } from 'lucide-react'
import { useExplorer } from '../context/explorerContext'
import { useNFD } from '../hooks/useNFD'
import { usePricing } from '../context/pricingContext'
import { AddressDisplay } from '../components/AddressDisplay'

type TabId = 'assets' | 'stakers' | 'contract' | 'metadata'

interface TokenDetails {
  asset_id: number
  name: string
  unit_name: string
  fraction_decimals: number
  description?: string
  url?: string
  creator_address?: string
  verification_details?: {
    project_name?: string
    project_description?: string
    project_url?: string
    discord_url?: string
    telegram_url?: string
    twitter_username?: string
  }
}

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
  const { getUsdValue } = usePricing()
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

  // Calculate USD value using pricing context
  const calculateUsdValue = (): number | null => {
    if (stakeAmount <= 0 || !pool.depositAsset.id) return null
    const decimals = pool.depositAsset.decimals || 6
    const stakeAmountBigInt = BigInt(Math.floor(stakeAmount * 10 ** decimals))
    return getUsdValue(stakeAmountBigInt, pool.depositAsset.id, decimals)
  }

  const stakeUsdValue = stakeAmount > 0 ? calculateUsdValue() : null

  // Network fees: 0.0225 ALGO for box creation, but refunded if user already has stake
  const BOX_CREATION_FEE_ALGO = 0.0225
  // Fee applies to stake calls, but is refunded immediately if user already has a stake
  const showNetworkFeeInfo = !isWithdraw && stakeAmount > 0

  return (
    <div className="border-2 border-mid-grey/30 p-6">
      <h2 className="text-lg font-medium text-off-white mb-6">Pool Actions</h2>
      
      {/* Deposit/Withdraw Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsWithdraw(false)}
          disabled={isProcessing}
          className={`flex-1 px-4 py-2 border-2 transition-colors ${
            !isWithdraw
              ? 'border-off-white bg-off-white text-near-black'
              : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Deposit
        </button>
        <button
          onClick={() => setIsWithdraw(true)}
          disabled={isProcessing}
          className={`flex-1 px-4 py-2 border-2 transition-colors ${
            isWithdraw
              ? 'border-off-white bg-off-white text-near-black'
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
            className="flex-1 px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-off-white disabled:opacity-50"
          />
          <button 
            onClick={handleMax}
            disabled={isProcessing}
            className="px-4 py-2 border-2 border-mid-grey/30 text-mid-grey hover:text-off-white transition-colors disabled:opacity-50"
          >
            MAX
          </button>
        </div>
      </div>

      {/* Action Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-mid-grey">APR</span>
          <span className="text-mid-grey">
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
            <div className="border-t-2 border-mid-grey/20 pt-3 mt-3">
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
      <div className="mb-4">
        <AnimButton
          text={isProcessing ? 'Processing...' : `${isWithdraw ? 'WITHDRAW' : 'DEPOSIT'} ${pool.depositAsset.symbol}`}
          onClick={handleAction}
          disabled={isProcessing || !depositAmount || parseFloat(depositAmount) <= 0}
          variant="default"
          className="w-full"
        />
      </div>

      {/* Claim Rewards Button */}
      <AnimButton
        text={isProcessing ? 'Processing...' : `Claim Rewards${totalClaimable > 0 ? ` (${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})` : ''}`}
        onClick={onClaim}
        disabled={totalClaimable === 0 || isProcessing}
        variant="default"
        className="w-full"
      />
    </div>
  )
}

export function PoolDetailPage() {
  const [searchParams] = useSearchParams()
  const poolId = searchParams.get('poolId')
  const { activeAccount, transactionSigner } = useWallet()
  const { networkConfig, isTestnet } = useNetwork()
  const { poolStates, refetchPools } = usePools()
  const { assets: walletAssets, refetchBalances } = useWalletContext()
  const { openToast } = useToast()
  const { getUsdValue } = usePricing()
  const queryClient = useQueryClient()
  const [depositAmount, setDepositAmount] = useState('')
  const [isWithdraw, setIsWithdraw] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('assets')
  const [depositTokenDetails, setDepositTokenDetails] = useState<TokenDetails | null>(null)
  const [rewardTokenDetails, setRewardTokenDetails] = useState<TokenDetails[]>([])

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

  // Fetch all stakers
  const { data: allStakers } = useQuery({
    queryKey: ['allStakers', network, poolId],
    queryFn: async () => {
      if (!poolId) return new Map()
      return fetchAllStakers(network, BigInt(poolId))
    },
    enabled: !!poolId,
    staleTime: 30 * 1000,
  })

  // Fetch pool metadata from database
  const { data: poolMetadata, error: metadataError } = useQuery({
    queryKey: ['poolMetadata', poolId, networkConfig.id],
    queryFn: async () => {
      if (!poolId) return null
      const appId = Number(poolId)
      if (isNaN(appId)) return null
      // getPoolByAppId returns null for 404s, throws for other errors
      return await getPoolByAppId(appId, networkConfig.id)
    },
    enabled: !!poolId && !isNaN(Number(poolId)),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on error - if it fails, we just won't show the tab
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

    // Calculate rewards remaining
    // totalRewards should be set when rewards are funded
    // accruedRewards tracks how much has been distributed so far
    const totalRewards = poolState.totalRewards
    const accruedRewards = poolState.accruedRewards || BigInt(0)
    
    // Only calculate if totalRewards exists (means rewards were funded)
    const rewardsRemaining = totalRewards !== undefined && totalRewards !== null
      ? Number(totalRewards - accruedRewards) / (10 ** (rewardAssetInfo.decimals || 6))
      : null

    return {
      id: poolId,
      displayName,
      type: poolType,
      status,
      apr,
      tvlUsd: poolState.totalStaked && poolState.stakedAssetId
        ? getUsdValue(poolState.totalStaked, poolState.stakedAssetId.toString(), stakedAssetInfo.decimals)
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
      rewardsRemaining: rewardsRemaining !== null && rewardsRemaining > 0 ? [{
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
  }, [poolState, poolId, assetInfoMap, userStakingInfo, getUsdValue])

  // Get wallet balance for staked asset
  const walletBalance = useMemo(() => {
    if (!pool || !walletAssets) return '0'
    const asset = walletAssets.find((a: { assetId: string }) => a.assetId === pool.depositAsset.id)
    if (!asset) return '0'
    const balance = BigInt(asset.balance)
    const decimals = asset.decimals || 6
    return formatAmount(balance, decimals)
  }, [pool, walletAssets])

  // Fetch token details from Pera Wallet API (mainnet) or use placeholder (testnet)
  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!pool || !pool.depositAsset.id) return

      if (isTestnet) {
        // Use placeholder data for testnet
        setDepositTokenDetails({
          asset_id: Number(pool.depositAsset.id),
          name: `${pool.depositAsset.symbol} Token`,
          unit_name: pool.depositAsset.symbol,
          fraction_decimals: pool.depositAsset.decimals || 6,
          description: `Testnet token for ${pool.depositAsset.symbol}. This is placeholder data for testing purposes.`,
        })
        
        const rewardPlaceholders: TokenDetails[] = pool.rewardAssets.map((asset) => ({
          asset_id: Number(asset.id || 0),
          name: `${asset.symbol} Token`,
          unit_name: asset.symbol,
          fraction_decimals: asset.decimals || 6,
          description: `Testnet token for ${asset.symbol}. This is placeholder data for testing purposes.`,
        }))
        setRewardTokenDetails(rewardPlaceholders)
      } else {
        // Fetch from Pera Wallet API for mainnet
        try {
          const requests = [
            axios.get(`https://mainnet.api.perawallet.app/v1/public/assets/${pool.depositAsset.id}`),
            ...pool.rewardAssets.map((asset) =>
              asset.id
                ? axios.get(`https://mainnet.api.perawallet.app/v1/public/assets/${asset.id}`)
                : Promise.resolve({ data: null })
            ),
          ]

          const responses = await Promise.all(requests)
          
          if (responses[0]?.data) {
            setDepositTokenDetails(responses[0].data)
          }

          const rewardDetails: TokenDetails[] = responses
            .slice(1)
            .map((response) => response?.data)
            .filter((data): data is TokenDetails => data !== null && data !== undefined)
          
          setRewardTokenDetails(rewardDetails)
        } catch (error) {
          console.error('Failed to fetch token details:', error)
          // Set placeholder data on error
          setDepositTokenDetails({
            asset_id: Number(pool.depositAsset.id),
            name: `${pool.depositAsset.symbol} Token`,
            unit_name: pool.depositAsset.symbol,
            fraction_decimals: pool.depositAsset.decimals || 6,
            description: `Token information unavailable.`,
          })
          setRewardTokenDetails([])
        }
      }
    }

    fetchTokenDetails()
  }, [pool, isTestnet])

  const totalClaimable = pool?.user.claimableRewards.reduce((sum, r) => sum + r.amount, 0) || 0

  // Get explorer hook for generating links
  const { getExplorerUrl } = useExplorer()

  // Fetch NFD for creator address
  const { data: creatorNFD } = useNFD(pool?.creator)

  // Switch away from metadata tab if metadata becomes unavailable
  useEffect(() => {
    if (activeTab === 'metadata' && (!poolMetadata || metadataError)) {
      setActiveTab('assets')
    }
  }, [activeTab, poolMetadata, metadataError])

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
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">No pool selected.</p>
          </motion.div>
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
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Loading pool...</p>
          </motion.div>
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
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Pool not found or incomplete data.</p>
          </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Link
            to="/pools"
            className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
          >
            ← Back to Pools
          </Link>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Pool Information */}
          <motion.div
            className="lg:col-span-2 space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-mid-grey mb-1">APR</div>
                  <div className={`text-xl font-medium ${
                    pool.apr !== null ? 'text-accent' : 'text-off-white'
                  }`}>
                    {pool.apr !== null ? `${pool.apr.toFixed(2)}%` : '--'}
                  </div>
                </div>
                <StatItem
                  label="Total Deposited"
                  value={pool.tvlUsd !== null && pool.tvlUsd > 0 
                    ? pool.tvlUsd >= 1000 
                      ? `$${(pool.tvlUsd / 1000).toFixed(1)}K`
                      : `$${pool.tvlUsd.toFixed(2)}`
                    : '--'}
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

            {/* Tabs */}
            <div>
              {/* Tab Headers */}
              <div className="flex gap-2 border-b-2 border-mid-grey/30 mb-4">
                {poolMetadata && !metadataError && (
                  <button
                    onClick={() => setActiveTab('metadata')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'metadata'
                        ? 'text-off-white border-b-2 border-off-white -mb-[2px]'
                        : 'text-mid-grey hover:text-off-white'
                    }`}
                  >
                    Metadata
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('assets')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'assets'
                      ? 'text-off-white border-b-2 border-off-white -mb-[2px]'
                      : 'text-mid-grey hover:text-off-white'
                  }`}
                >
                  Assets
                </button>
                <button
                  onClick={() => setActiveTab('stakers')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'stakers'
                      ? 'text-off-white border-b-2 border-off-white -mb-[2px]'
                      : 'text-mid-grey hover:text-off-white'
                  }`}
                >
                  Stakers
                </button>
                <button
                  onClick={() => setActiveTab('contract')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'contract'
                      ? 'text-off-white border-b-2 border-off-white -mb-[2px]'
                      : 'text-mid-grey hover:text-off-white'
                  }`}
                >
                  Contract
                </button>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === 'assets' && (
                  <div className="space-y-6">
                    <div className="border-2 border-mid-grey/30 p-4">
                      <h3 className="text-sm font-medium text-mid-grey mb-4">Deposit Asset</h3>
                      {/* Symbol, Asset ID, Decimals in one row */}
                      <div className={`grid gap-4 mb-4 ${pool.depositAsset.decimals !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Symbol</div>
                          <div className="text-sm text-off-white font-mono">{pool.depositAsset.symbol}</div>
                        </div>
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Asset ID</div>
                          <div className="text-sm text-off-white font-mono">{pool.depositAsset.id || '--'}</div>
                        </div>
                        {pool.depositAsset.decimals !== undefined && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">Decimals</div>
                            <div className="text-sm text-off-white">{pool.depositAsset.decimals}</div>
                          </div>
                        )}
                      </div>
                      {/* Description and other info below */}
                      <div className="space-y-3 pt-3 border-t-2 border-mid-grey/20">
                        {(depositTokenDetails?.description || depositTokenDetails?.verification_details?.project_description) && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">Description</div>
                            <div className="text-sm text-off-white leading-relaxed">
                              {depositTokenDetails.description || depositTokenDetails.verification_details?.project_description}
                            </div>
                          </div>
                        )}
                        {depositTokenDetails?.url && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">URL</div>
                            <a 
                              href={depositTokenDetails.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-off-white hover:text-mid-grey break-all"
                            >
                              {depositTokenDetails.url}
                            </a>
                          </div>
                        )}
                        {depositTokenDetails?.verification_details?.project_url && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">Project URL</div>
                            <a 
                              href={depositTokenDetails.verification_details.project_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-off-white hover:text-mid-grey break-all"
                            >
                              {depositTokenDetails.verification_details.project_url}
                            </a>
                          </div>
                        )}
                        {depositTokenDetails?.creator_address && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">Creator Address</div>
                            <div className="text-sm text-off-white">
                              <AddressDisplay 
                                address={depositTokenDetails.creator_address}
                                showExplorerLink={true}
                              />
                            </div>
                          </div>
                        )}
                        {(depositTokenDetails?.verification_details?.discord_url || depositTokenDetails?.verification_details?.telegram_url || depositTokenDetails?.verification_details?.twitter_username) && (
                          <div>
                            <div className="text-xs text-mid-grey mb-1">Social Links</div>
                            <div className="flex flex-wrap gap-3 text-sm">
                              {depositTokenDetails.verification_details?.discord_url && (
                                <a 
                                  href={depositTokenDetails.verification_details.discord_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-off-white hover:text-mid-grey"
                                >
                                  Discord
                                </a>
                              )}
                              {depositTokenDetails.verification_details?.telegram_url && (
                                <a 
                                  href={depositTokenDetails.verification_details.telegram_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-off-white hover:text-mid-grey"
                                >
                                  Telegram
                                </a>
                              )}
                              {depositTokenDetails.verification_details?.twitter_username && (
                                <a 
                                  href={`https://twitter.com/${depositTokenDetails.verification_details.twitter_username}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-off-white hover:text-mid-grey"
                                >
                                  Twitter
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="border-2 border-mid-grey/30 p-4">
                      <h3 className="text-sm font-medium text-mid-grey mb-4">Reward Asset(s)</h3>
                      <div className="space-y-4">
                        {pool.rewardAssets.map((asset, index) => {
                          const rewardDetails = rewardTokenDetails[index]
                          return (
                            <div key={index} className={index > 0 ? 'pt-4 border-t-2 border-mid-grey/20' : ''}>
                              {/* Symbol, Asset ID, Decimals in one row */}
                              <div className={`grid gap-4 mb-4 ${asset.decimals !== undefined ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                <div>
                                  <div className="text-xs text-mid-grey mb-1">
                                    {pool.rewardAssets.length > 1 ? `Reward Asset ${index + 1} Symbol` : 'Symbol'}
                                  </div>
                                  <div className="text-sm text-off-white font-mono">{asset.symbol}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-mid-grey mb-1">
                                    {pool.rewardAssets.length > 1 ? `Reward Asset ${index + 1} ID` : 'Asset ID'}
                                  </div>
                                  <div className="text-sm text-off-white font-mono">{asset.id || '--'}</div>
                                </div>
                                {asset.decimals !== undefined && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">Decimals</div>
                                    <div className="text-sm text-off-white">{asset.decimals}</div>
                                  </div>
                                )}
                              </div>
                              {/* Description and other info below */}
                              <div className="space-y-3 pt-3 border-t-2 border-mid-grey/20">
                                {(rewardDetails?.description || rewardDetails?.verification_details?.project_description) && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">Description</div>
                                    <div className="text-sm text-off-white leading-relaxed">
                                      {rewardDetails.description || rewardDetails.verification_details?.project_description}
                                    </div>
                                  </div>
                                )}
                                {rewardDetails?.url && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">URL</div>
                                    <a 
                                      href={rewardDetails.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-off-white hover:text-mid-grey break-all"
                                    >
                                      {rewardDetails.url}
                                    </a>
                                  </div>
                                )}
                                {rewardDetails?.verification_details?.project_url && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">Project URL</div>
                                    <a 
                                      href={rewardDetails.verification_details.project_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-off-white hover:text-mid-grey break-all"
                                    >
                                      {rewardDetails.verification_details.project_url}
                                    </a>
                                  </div>
                                )}
                                {rewardDetails?.creator_address && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">Creator Address</div>
                                    <div className="text-sm text-off-white">
                                      <AddressDisplay 
                                        address={rewardDetails.creator_address}
                                        showExplorerLink={true}
                                      />
                                    </div>
                                  </div>
                                )}
                                {(rewardDetails?.verification_details?.discord_url || rewardDetails?.verification_details?.telegram_url || rewardDetails?.verification_details?.twitter_username) && (
                                  <div>
                                    <div className="text-xs text-mid-grey mb-1">Social Links</div>
                                    <div className="flex flex-wrap gap-3 text-sm">
                                      {rewardDetails.verification_details?.discord_url && (
                                        <a 
                                          href={rewardDetails.verification_details.discord_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-off-white hover:text-mid-grey"
                                        >
                                          Discord
                                        </a>
                                      )}
                                      {rewardDetails.verification_details?.telegram_url && (
                                        <a 
                                          href={rewardDetails.verification_details.telegram_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-off-white hover:text-mid-grey"
                                        >
                                          Telegram
                                        </a>
                                      )}
                                      {rewardDetails.verification_details?.twitter_username && (
                                        <a 
                                          href={`https://twitter.com/${rewardDetails.verification_details.twitter_username}`} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-off-white hover:text-mid-grey"
                                        >
                                          Twitter
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'stakers' && (
                  <div className="space-y-6">
                    {/* Top-level stats */}
                    <div className="border-2 border-mid-grey/30 p-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Total Stakers</div>
                          <div className="text-xl font-medium text-off-white">
                            {poolState?.numStakers !== undefined 
                              ? poolState.numStakers.toString() 
                              : '--'}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Average Stake</div>
                          <div className="text-xl font-medium text-off-white">
                            {poolState?.numStakers && poolState.numStakers > BigInt(0) && poolState.totalStaked && pool
                              ? (() => {
                                  const avgStake = Number(poolState.totalStaked) / Number(poolState.numStakers)
                                  const decimals = pool.depositAsset.decimals || 6
                                  return formatAmount(BigInt(Math.floor(avgStake)), decimals)
                                })()
                              : '--'}
                            {poolState?.numStakers && poolState.numStakers > BigInt(0) && poolState.totalStaked && pool && (
                              <span className="text-sm text-mid-grey ml-1">{pool.depositAsset.symbol}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Average Time in Pool</div>
                          <div className="text-xl font-medium text-off-white">
                            {poolState?.startTime 
                              ? (() => {
                                  const startTime = Number(poolState.startTime) * 1000
                                  const now = Date.now()
                                  const ageMs = now - startTime
                                  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24))
                                  const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                                  if (days > 0) {
                                    return `${days}d ${hours}h`
                                  }
                                  return `${hours}h`
                                })()
                              : '--'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Top 10 Stakers Table */}
                    <div className="border-2 border-mid-grey/30">
                      <div className="p-4 border-b-2 border-mid-grey/30">
                        <h3 className="text-sm font-medium text-mid-grey">Top 10 Stakers</h3>
                      </div>
                      {allStakers && allStakers.size > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b-2 border-mid-grey/30">
                                <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Position</th>
                                <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Address</th>
                                <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">Stake Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(allStakers.entries())
                                .map(([address, info]) => ({
                                  address,
                                  stake: info.stake,
                                }))
                                .sort((a, b) => {
                                  // Sort by stake amount descending
                                  if (b.stake > a.stake) return 1
                                  if (b.stake < a.stake) return -1
                                  return 0
                                })
                                .slice(0, 10)
                                .map((staker, index) => {
                                  const stakeAmount = pool
                                    ? formatAmount(staker.stake, pool.depositAsset.decimals || 6)
                                    : staker.stake.toString()
                                  return (
                                    <tr key={staker.address} className="border-b border-mid-grey/20 hover:bg-mid-grey/5">
                                      <td className="px-4 py-3 text-sm text-off-white">{index + 1}</td>
                                      <td className="px-4 py-3 text-sm text-off-white">
                                        <AddressDisplay 
                                          address={staker.address} 
                                          showExplorerLink={true}
                                          truncate={true}
                                        />
                                      </td>
                                      <td className="px-4 py-3 text-sm text-off-white text-right">
                                        {stakeAmount} {pool?.depositAsset.symbol || ''}
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-sm text-mid-grey text-center">
                          {allStakers ? 'No stakers found' : 'Loading stakers...'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'contract' && (
                  <div className="border-2 border-mid-grey/30 p-4">
                    <div className="space-y-4">
                      {pool.contractRef.appId && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Contract App ID</div>
                          <a
                            href={getExplorerUrl('application', pool.contractRef.appId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-off-white hover:text-mid-grey font-mono inline-flex items-center gap-1"
                          >
                            {pool.contractRef.appId}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {pool.schedule.startTime && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Start Time</div>
                          <div className="text-sm text-off-white">{formatDate(pool.schedule.startTime)}</div>
                        </div>
                      )}
                      {pool.schedule.endTime && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">End Time</div>
                          <div className="text-sm text-off-white">{formatDate(pool.schedule.endTime)}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-xs text-mid-grey mb-1">Creator Address</div>
                        <a
                          href={getExplorerUrl('address', pool.creator)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-off-white hover:text-mid-grey font-mono break-all inline-flex items-center gap-1"
                        >
                          {creatorNFD?.name || pool.creator}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'metadata' && poolMetadata && (
                  <div className="border-2 border-mid-grey/30 p-4">
                    <div className="space-y-4">
                      {poolMetadata.name && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Name</div>
                          <div className="text-sm text-off-white">{poolMetadata.name}</div>
                        </div>
                      )}
                      {poolMetadata.description && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Description</div>
                          <div className="text-sm text-off-white leading-relaxed whitespace-pre-wrap">{poolMetadata.description}</div>
                        </div>
                      )}
                      {poolMetadata.website_url && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Website</div>
                          <a 
                            href={poolMetadata.website_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-off-white hover:text-mid-grey break-all inline-flex items-center gap-1"
                          >
                            {poolMetadata.website_url}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {poolMetadata.tags && poolMetadata.tags.length > 0 && (
                        <div>
                          <div className="text-xs text-mid-grey mb-2">Tags</div>
                          <div className="flex flex-wrap gap-2">
                            {poolMetadata.tags.map((tag, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 text-xs border-2 border-mid-grey/30 text-mid-grey"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {poolMetadata.created_by && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Created By</div>
                          <div className="text-sm text-off-white">
                            <AddressDisplay 
                              address={poolMetadata.created_by}
                              showExplorerLink={true}
                            />
                          </div>
                        </div>
                      )}
                      {poolMetadata.created_at && (
                        <div>
                          <div className="text-xs text-mid-grey mb-1">Created At</div>
                          <div className="text-sm text-off-white">{new Date(poolMetadata.created_at).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Actions (Desktop) */}
          <motion.div
            className="hidden lg:block lg:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
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
          </motion.div>
        </div>

        {/* Mobile Action Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full px-6 py-4 bg-off-white text-near-black font-medium border-t-2 border-off-white/20"
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
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-near-black border-t-2 border-mid-grey/30 rounded-t-lg max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-near-black border-b-2 border-mid-grey/30 px-6 py-4 flex items-center justify-between">
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
