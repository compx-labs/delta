/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ManagePoolListItem, ManagePoolDetail } from '../types/pool'
import { getAllPools, type Pool } from './poolApiService'
import type { StakingPoolState } from '../context/poolsContext'

const SECONDS_PER_YEAR = BigInt(31_536_000) // Seconds in a year

/**
 * Calculates expected end date based on APR, remaining rewards, and total stake
 * Returns null if calculation is not possible
 */
export function calculateExpectedEndDate(
  poolState: StakingPoolState | undefined,
  rewardAssetDecimals: number = 6
): string | null {
  if (!poolState) return null

  const totalStaked = poolState.totalStaked || BigInt(0)
  const totalRewards = poolState.totalRewards || BigInt(0)
  const accruedRewards = poolState.accruedRewards || BigInt(0)
  const aprBps = poolState.aprBps || BigInt(0)
  const endTime = poolState.endTime

  // If we have a contract endTime, use it as fallback
  if (endTime && endTime > BigInt(0)) {
    const contractEndDate = new Date(Number(endTime) * 1000)
    // If contract endTime is in the future, use it
    if (contractEndDate > new Date()) {
      return contractEndDate.toISOString()
    }
  }

  // Can't calculate if no stake or no APR
  if (totalStaked === BigInt(0) || aprBps === BigInt(0)) {
    return null
  }

  // Calculate remaining rewards
  const remainingRewards = totalRewards > accruedRewards 
    ? totalRewards - accruedRewards 
    : BigInt(0)

  if (remainingRewards === BigInt(0)) {
    return null
  }

  // Calculate reward rate: (totalStaked * aprBps / 10000) / SECONDS_PER_YEAR
  const annualReward = (totalStaked * aprBps) / BigInt(10_000)
  const rewardRate = annualReward / SECONDS_PER_YEAR

  if (rewardRate === BigInt(0)) {
    return null
  }

  // Calculate seconds until rewards run out: remainingRewards / rewardRate
  const secondsUntilEnd = remainingRewards / rewardRate

  // Calculate expected end date: current time + seconds until end
  const currentTime = BigInt(Math.floor(Date.now() / 1000))
  const expectedEndTimestamp = currentTime + secondsUntilEnd

  return new Date(Number(expectedEndTimestamp) * 1000).toISOString()
}

// Placeholder data - replace with real API calls later
const mockManagePools: ManagePoolListItem[] = [
  {
    id: 'pool-1',
    displayName: 'xUSD / ALGO',
    type: 'lp',
    status: 'active',
    stakers: 245,
    apr: 12.5,
    apy: 13.2,
    rewardsRemaining: [{ symbol: 'xUSD', amount: 50000 }],
    endDate: '2024-12-31T23:59:59Z',
    createdAt: '2024-01-01T00:00:00Z',
    stakeAsset: { symbol: 'xUSD-ALGO LP', id: 'lp-1' },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1' }],
  },
  {
    id: 'pool-2',
    displayName: 'COMPX',
    type: 'single',
    status: 'active',
    stakers: 189,
    apr: 8.3,
    apy: 8.6,
    rewardsRemaining: [{ symbol: 'xUSD', amount: 30000 }],
    endDate: '2024-11-30T23:59:59Z',
    createdAt: '2024-01-15T00:00:00Z',
    stakeAsset: { symbol: 'COMPX', id: 'compx-1' },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1' }],
  },
  {
    id: 'pool-3',
    displayName: 'ALGO',
    type: 'single',
    status: 'inactive',
    stakers: 0,
    apr: null,
    apy: null,
    rewardsRemaining: [{ symbol: 'FLUX', amount: 0 }],
    endDate: null,
    createdAt: '2024-02-01T00:00:00Z',
    stakeAsset: { symbol: 'ALGO', id: 'algo-1' },
    rewardAssets: [{ symbol: 'FLUX', id: 'flux-1' }],
  },
  {
    id: 'pool-4',
    displayName: 'USDC',
    type: 'single',
    status: 'active',
    stakers: 156,
    apr: 15.7,
    apy: 16.9,
    rewardsRemaining: [
      { symbol: 'xUSD', amount: 75000 },
      { symbol: 'ALGO', amount: 5000 },
    ],
    endDate: '2025-06-30T23:59:59Z',
    createdAt: '2024-03-10T00:00:00Z',
    stakeAsset: { symbol: 'USDC', id: 'usdc-1' },
    rewardAssets: [
      { symbol: 'xUSD', id: 'xusd-1' },
      { symbol: 'ALGO', id: 'algo-1' },
    ],
  },
  {
    id: 'pool-5',
    displayName: 'xUSD / USDC LP',
    type: 'lp',
    status: 'active',
    stakers: 312,
    apr: null,
    apy: null,
    rewardsRemaining: [{ symbol: 'xUSD', amount: 120000 }],
    endDate: '2025-12-31T23:59:59Z',
    createdAt: '2024-04-20T00:00:00Z',
    stakeAsset: { symbol: 'xUSD-USDC LP', id: 'lp-2' },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1' }],
  },
  {
    id: 'pool-6',
    displayName: 'FLUX',
    type: 'single',
    status: 'inactive',
    stakers: 42,
    apr: 5.2,
    apy: 5.3,
    rewardsRemaining: [{ symbol: 'ALGO', amount: 15000 }],
    endDate: '2024-10-15T23:59:59Z',
    createdAt: '2024-05-05T00:00:00Z',
    stakeAsset: { symbol: 'FLUX', id: 'flux-1' },
    rewardAssets: [{ symbol: 'ALGO', id: 'algo-1' }],
  },
]

const mockManagePoolDetails: Record<string, ManagePoolDetail> = {
  'pool-1': {
    ...mockManagePools[0],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '123456789' },
    schedule: {
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-12-31T23:59:59Z',
    },
  },
  'pool-2': {
    ...mockManagePools[1],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '987654321' },
    schedule: {
      startTime: '2024-01-15T00:00:00Z',
      endTime: '2024-11-30T23:59:59Z',
    },
  },
  'pool-3': {
    ...mockManagePools[2],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { address: 'DEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890ABCDE' },
    schedule: {
      startTime: null,
      endTime: null,
    },
  },
  'pool-4': {
    ...mockManagePools[3],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '555666777' },
    schedule: {
      startTime: '2024-03-10T00:00:00Z',
      endTime: '2025-06-30T23:59:59Z',
    },
  },
  'pool-5': {
    ...mockManagePools[4],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '111222333' },
    schedule: {
      startTime: '2024-04-20T00:00:00Z',
      endTime: '2025-12-31T23:59:59Z',
    },
  },
  'pool-6': {
    ...mockManagePools[5],
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '444555666' },
    schedule: {
      startTime: '2024-05-05T00:00:00Z',
      endTime: '2024-10-15T23:59:59Z',
    },
  },
}

export async function getPoolsCreatedBy(
  address: string,
  poolStates?: Map<string, StakingPoolState>,
  assetInfoMap?: Map<string, { symbol: string; decimals?: number }>,
  registeredAppIds?: bigint[]
): Promise<ManagePoolListItem[]> {
  try {
    // Fetch pools from API and filter by creator address
    const allPools = await getAllPools()
    const userPools = allPools.filter(pool => pool.created_by === address)
    
    // Filter to only include pools that are registered in the registry contract
    // The registry contract is the source of truth
    const registeredAppIdsSet = registeredAppIds 
      ? new Set(registeredAppIds.map(id => id.toString()))
      : new Set<string>()
    
    // If poolStates is provided, use it as the source of truth (it only contains registered pools)
    // Otherwise, check against registeredAppIds
    const registeredUserPools = userPools.filter((pool: Pool) => {
      if (!pool.app_id) return false // Must have an app_id
      
      // If poolStates is provided, check if the pool exists in it
      if (poolStates) {
        return poolStates.has(pool.app_id.toString())
      }
      
      // Otherwise, check against registeredAppIds
      return registeredAppIdsSet.has(pool.app_id.toString())
    })
    
    // Transform API pools to ManagePoolListItem format
    return registeredUserPools.map((pool: Pool): ManagePoolListItem => {
      const appIdStr = pool.app_id?.toString() || ''
      const poolState = poolStates?.get(appIdStr)
      
      // Calculate APR from pool state
      const apr = poolState?.aprBps 
        ? Number(poolState.aprBps) / 100 
        : null

      // Calculate remaining rewards
      // totalRewards should be set when rewards are funded
      // accruedRewards tracks how much has been distributed so far
      const rewardsRemaining: Array<{ symbol: string; amount: number }> = []
      const totalRewards = poolState?.totalRewards
      const accruedRewards = poolState?.accruedRewards || BigInt(0)
      
      // Only calculate if totalRewards exists (means rewards were funded)
      if (totalRewards !== undefined && totalRewards !== null) {
        const remaining = totalRewards - accruedRewards
        const rewardAssetInfo = assetInfoMap?.get(pool.reward_token)
        const decimals = rewardAssetInfo?.decimals || 6
        const amount = Number(remaining) / (10 ** decimals)
        
        // Only add if amount is greater than 0
        if (amount > 0) {
          const symbol = rewardAssetInfo?.symbol || pool.reward_token
          rewardsRemaining.push({ symbol, amount })
        }
      }

      // Calculate expected end date
      const rewardAssetInfo = assetInfoMap?.get(pool.reward_token)
      const rewardAssetDecimals = rewardAssetInfo?.decimals || 6
      const expectedEndDate = calculateExpectedEndDate(poolState, rewardAssetDecimals)

      // Get stakers count
      const stakers = poolState?.numStakers 
        ? Number(poolState.numStakers) 
        : 0

      // Determine status
      const now = BigInt(Math.floor(Date.now() / 1000))
      const isActive = poolState?.contractState === BigInt(1) &&
        poolState.startTime && poolState.startTime <= now &&
        pool.creation_status === 'completed'
      const status: 'active' | 'inactive' = isActive ? 'active' : 'inactive'

      // Check if rewards are exhausted
      const rewardsExhausted = poolState?.rewardsExhausted === BigInt(1)

      return {
        id: pool.id,
        displayName: pool.name || `Pool ${pool.id.slice(0, 8)}`,
        type: 'single', // Default type, could be enhanced with additional field
        status,
        stakers,
        apr,
        apy: null, // APY calculation would require compounding logic
        rewardsRemaining,
        endDate: expectedEndDate,
        createdAt: pool.created_at,
        stakeAsset: { 
          symbol: assetInfoMap?.get(pool.stake_token)?.symbol || pool.stake_token, 
          id: pool.stake_token 
        },
        rewardAssets: [{ 
          symbol: assetInfoMap?.get(pool.reward_token)?.symbol || pool.reward_token, 
          id: pool.reward_token 
        }],
        rewardsExhausted,
        creation_status: pool.creation_status,
        step_create_completed: pool.step_create_completed,
        step_init_completed: pool.step_init_completed,
        step_fund_activate_register_completed: pool.step_fund_activate_register_completed,
        app_id: pool.app_id,
      }
    })
  } catch (error) {
    console.error('Failed to fetch pools:', error)
    // Fallback to mock data on error
    return [...mockManagePools]
  }
}

export async function getManagePoolDetail(
  poolId: string,
  poolStates?: Map<string, StakingPoolState>,
  assetInfoMap?: Map<string, { symbol: string; decimals?: number }>,
  registeredAppIds?: bigint[]
): Promise<ManagePoolDetail | null> {
  try {
    // Fetch pool from API
    const { getPoolById } = await import('./poolApiService')
    const pool = await getPoolById(poolId)
    
    // Verify pool is registered in the registry contract (source of truth)
    if (pool.app_id) {
      // If poolStates is provided but pool is not in it, the pool is not registered
      if (poolStates && !poolStates.has(pool.app_id.toString())) {
        return null // Pool not registered in contract
      }
      
      // If registeredAppIds is provided but pool is not in it, the pool is not registered
      if (registeredAppIds && !registeredAppIds.some(id => id.toString() === pool.app_id?.toString())) {
        return null // Pool not registered in contract
      }
    }
    
    const appIdStr = pool.app_id?.toString() || ''
    const poolState = poolStates?.get(appIdStr)
    
    // Calculate APR from pool state
    const apr = poolState?.aprBps 
      ? Number(poolState.aprBps) / 100 
      : null

    // Calculate remaining rewards
    const rewardsRemaining: Array<{ symbol: string; amount: number }> = []
    const totalRewards = poolState?.totalRewards
    const accruedRewards = poolState?.accruedRewards || BigInt(0)
    
    if (totalRewards !== undefined && totalRewards !== null) {
      const remaining = totalRewards - accruedRewards
      const rewardAssetInfo = assetInfoMap?.get(pool.reward_token)
      const decimals = rewardAssetInfo?.decimals || 6
      const amount = Number(remaining) / (10 ** decimals)
      
      if (amount > 0) {
        const symbol = rewardAssetInfo?.symbol || pool.reward_token
        rewardsRemaining.push({ symbol, amount })
      }
    }

    // Calculate expected end date
    const rewardAssetInfo = assetInfoMap?.get(pool.reward_token)
    const rewardAssetDecimals = rewardAssetInfo?.decimals || 6
    const expectedEndDate = calculateExpectedEndDate(poolState, rewardAssetDecimals)

    // Get stakers count
    const stakers = poolState?.numStakers 
      ? Number(poolState.numStakers) 
      : 0

    // Determine status
    const now = BigInt(Math.floor(Date.now() / 1000))
    const isActive = poolState?.contractState === BigInt(1) &&
      poolState.startTime && poolState.startTime <= now &&
      pool.creation_status === 'completed'
    const status: 'active' | 'inactive' = isActive ? 'active' : 'inactive'

    // Check if rewards are exhausted
    const rewardsExhausted = poolState?.rewardsExhausted === BigInt(1)

    // Get start time from pool state
    const startTime = poolState?.startTime 
      ? new Date(Number(poolState.startTime) * 1000).toISOString()
      : null

    return {
      id: pool.id,
      displayName: pool.name || `Pool ${pool.id.slice(0, 8)}`,
      type: 'single', // Default type, could be enhanced with additional field
      status,
      stakers,
      apr,
      apy: null,
      rewardsRemaining,
      endDate: expectedEndDate,
      createdAt: pool.created_at,
      stakeAsset: { 
        symbol: assetInfoMap?.get(pool.stake_token)?.symbol || pool.stake_token, 
        id: pool.stake_token 
      },
      rewardAssets: [{ 
        symbol: assetInfoMap?.get(pool.reward_token)?.symbol || pool.reward_token, 
        id: pool.reward_token 
      }],
      rewardsExhausted,
      creation_status: pool.creation_status,
      step_create_completed: pool.step_create_completed,
      step_init_completed: pool.step_init_completed,
      step_fund_activate_register_completed: pool.step_fund_activate_register_completed,
      app_id: pool.app_id,
      creator: pool.created_by,
      contractRef: { 
        appId: pool.app_id?.toString() 
      },
      schedule: {
        startTime,
        endTime: null, // No longer used, calculated from rewards
      },
      // Include metadata fields
      name: pool.name,
      website_url: pool.website_url,
      description: pool.description,
      tags: pool.tags,
    }
  } catch (error) {
    console.error('Failed to fetch pool detail:', error)
    return null
  }
}

