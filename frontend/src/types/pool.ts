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
  // Database metadata
  name?: string // Pool name from database
  stakeToken?: string // Stake token ID from database
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

export type CreationStatus = 'pending' | 'creating' | 'completed' | 'failed'

export interface ManagePoolListItem {
  id: string
  displayName: string
  type: PoolType
  status: PoolStatus
  stakers: number
  apr: number | null
  apy: number | null
  rewardsRemaining: Array<{ symbol: string; amount: number }>
  endDate: string | null
  createdAt: string
  stakeAsset: { symbol: string; id: string }
  rewardAssets: Array<{ symbol: string; id: string }>
  rewardsExhausted?: boolean
  // Creation tracking fields
  creation_status?: CreationStatus
  step_create_completed?: boolean
  step_init_completed?: boolean
  step_fund_activate_register_completed?: boolean
  app_id?: number | null
}

export interface ManagePoolDetail extends ManagePoolListItem {
  creator: string
  contractRef: { appId?: string; address?: string }
  schedule: { startTime: string | null; endTime: string | null }
  // Metadata fields
  name?: string
  website_url?: string | null
  description?: string | null
  tags?: string[] | null
}

