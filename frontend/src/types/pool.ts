export type PoolType = 'single' | 'lp'
export type PoolStatus = 'active' | 'inactive'

export interface Asset {
  symbol: string
  id?: string
  decimals?: number
}

export interface PoolListItem {
  id: string
  displayName: string
  type: PoolType
  depositAsset: Asset
  rewardAssets: Asset[]
  apr: number | null
  tvlUsd: number | null
  status: PoolStatus
}

export interface PoolDetail {
  id: string
  displayName: string
  type: PoolType
  status: PoolStatus
  apr: number | null
  tvlUsd: number | null
  user: {
    stakedAmount: number
    claimableRewards: Array<{ symbol: string; amount: number }>
  }
  depositAsset: Asset
  rewardAssets: Asset[]
  rewardsRemaining: Array<{ symbol: string; amount: number }>
  schedule: {
    startTime: string | null
    endTime: string | null
  }
  creator: string
  contractRef: {
    appId?: string
    address?: string
  }
}

export interface PoolFilters {
  type?: 'all' | 'single' | 'lp'
  status?: 'all' | 'active' | 'inactive'
  search?: string
}

