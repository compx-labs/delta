import type { PoolListItem, PoolDetail, PoolFilters } from '../types/pool'

// Mock data - replace with real API calls later
const mockPools: PoolListItem[] = [
  {
    id: 'pool-1',
    displayName: 'xUSD / ALGO',
    type: 'lp',
    depositAsset: { symbol: 'xUSD-ALGO LP', id: 'lp-1' },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1' }],
    apr: 12.5,
    tvlUsd: 1250000,
    status: 'active',
  },
  {
    id: 'pool-2',
    displayName: 'COMPX',
    type: 'single',
    depositAsset: { symbol: 'COMPX', id: 'compx-1' },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1' }],
    apr: 8.3,
    tvlUsd: 850000,
    status: 'active',
  },
  {
    id: 'pool-3',
    displayName: 'ALGO',
    type: 'single',
    depositAsset: { symbol: 'ALGO', id: 'algo-1' },
    rewardAssets: [{ symbol: 'FLUX', id: 'flux-1' }],
    apr: null,
    tvlUsd: 0,
    status: 'inactive',
  },
]

const mockPoolDetails: Record<string, PoolDetail> = {
  'pool-1': {
    id: 'pool-1',
    displayName: 'xUSD / ALGO',
    type: 'lp',
    status: 'active',
    apr: 12.5,
    tvlUsd: 1250000,
    user: {
      stakedAmount: 0,
      claimableRewards: [],
    },
    depositAsset: { symbol: 'xUSD-ALGO LP', id: 'lp-1', decimals: 6 },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1', decimals: 6 }],
    rewardsRemaining: [{ symbol: 'xUSD', amount: 50000 }],
    schedule: {
      startTime: '2024-01-01T00:00:00Z',
      endTime: '2024-12-31T23:59:59Z',
    },
    creator: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890AB',
    contractRef: { appId: '123456789' },
  },
  'pool-2': {
    id: 'pool-2',
    displayName: 'COMPX',
    type: 'single',
    status: 'active',
    apr: 8.3,
    tvlUsd: 850000,
    user: {
      stakedAmount: 1000,
      claimableRewards: [{ symbol: 'xUSD', amount: 25.5 }],
    },
    depositAsset: { symbol: 'COMPX', id: 'compx-1', decimals: 6 },
    rewardAssets: [{ symbol: 'xUSD', id: 'xusd-1', decimals: 6 }],
    rewardsRemaining: [{ symbol: 'xUSD', amount: 30000 }],
    schedule: {
      startTime: '2024-01-15T00:00:00Z',
      endTime: '2024-11-30T23:59:59Z',
    },
    creator: 'BCDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890ABC',
    contractRef: { appId: '987654321' },
  },
  'pool-3': {
    id: 'pool-3',
    displayName: 'ALGO',
    type: 'single',
    status: 'inactive',
    apr: null,
    tvlUsd: 0,
    user: {
      stakedAmount: 0,
      claimableRewards: [],
    },
    depositAsset: { symbol: 'ALGO', id: 'algo-1', decimals: 6 },
    rewardAssets: [{ symbol: 'FLUX', id: 'flux-1', decimals: 6 }],
    rewardsRemaining: [{ symbol: 'FLUX', amount: 0 }],
    schedule: {
      startTime: null,
      endTime: null,
    },
    creator: 'CDEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890ABCD',
    contractRef: { address: 'DEFGHIJKLMNOPQRSTUVWXYZ234567890123456789012345678901234567890ABCDE' },
  },
}

export async function getPools(filters: PoolFilters = {}): Promise<PoolListItem[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  let filtered = [...mockPools]

  // Filter by type
  if (filters.type && filters.type !== 'all') {
    filtered = filtered.filter(pool => pool.type === filters.type)
  }

  // Filter by status
  if (filters.status && filters.status !== 'all') {
    filtered = filtered.filter(pool => pool.status === filters.status)
  }

  // Filter by search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      pool =>
        pool.displayName.toLowerCase().includes(searchLower) ||
        pool.id.toLowerCase().includes(searchLower) ||
        pool.depositAsset.symbol.toLowerCase().includes(searchLower)
    )
  }

  // Sort: Active first, then alphabetical by display name
  filtered.sort((a, b) => {
    if (a.status === 'active' && b.status === 'inactive') return -1
    if (a.status === 'inactive' && b.status === 'active') return 1
    return a.displayName.localeCompare(b.displayName)
  })

  return filtered
}

export async function getPoolDetail(poolId: string): Promise<PoolDetail | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))

  return mockPoolDetails[poolId] || null
}

