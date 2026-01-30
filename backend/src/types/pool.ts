export type CreationStatus = 'pending' | 'creating' | 'completed' | 'failed'

export interface Pool {
  id: string
  app_id: number | null
  network: 'testnet' | 'mainnet'
  stake_token: string
  reward_token: string
  total_rewards: number
  name: string
  created_by: string
  website_url: string | null
  description: string | null
  tags: string[] | null
  creation_status: CreationStatus
  step_create_completed: boolean
  step_init_completed: boolean
  step_fund_activate_register_completed: boolean
  created_at: string
  updated_at: string
}

export interface CreatePoolRequest {
  stake_token: string
  reward_token: string
  total_rewards: number
  name: string
  created_by: string // Now required, set from wallet
  network: 'testnet' | 'mainnet' // Network where the pool will be created
  website_url?: string
  description?: string
  tags?: string[]
}

export interface UpdatePoolRequest {
  app_id?: number
  network?: 'testnet' | 'mainnet'
  name?: string
  website_url?: string
  description?: string
  tags?: string[]
  creation_status?: CreationStatus
  step_create_completed?: boolean
  step_init_completed?: boolean
  step_fund_activate_register_completed?: boolean
}
