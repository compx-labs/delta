import axios from 'axios'
import { DELTA_BACKEND_URL } from '../constants/constants'

const API_BASE_URL = `${DELTA_BACKEND_URL}/pools`

export type CreationStatus = 'pending' | 'creating' | 'completed' | 'failed'

export interface CreatePoolData {
  stake_token: string
  reward_token: string
  total_rewards: number
  name: string
  created_by: string // Required, set from wallet
  website_url?: string
  description?: string
  tags?: string[]
}

export interface Pool {
  id: string
  app_id: number | null
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

export interface UpdatePoolData {
  app_id?: number
  name?: string
  website_url?: string
  description?: string
  tags?: string[]
  creation_status?: CreationStatus
  step_create_completed?: boolean
  step_init_completed?: boolean
  step_fund_activate_register_completed?: boolean
}

/**
 * Create a new pool in the database
 */
export async function createPool(data: CreatePoolData): Promise<Pool> {
  const response = await axios.post<Pool>(API_BASE_URL, data)
  return response.data
}

/**
 * Get all pools
 */
export async function getAllPools(): Promise<Pool[]> {
  const response = await axios.get<Pool[]>(API_BASE_URL)
  return response.data
}

/**
 * Get pool by ID
 */
export async function getPoolById(id: string): Promise<Pool> {
  const response = await axios.get<Pool>(`${API_BASE_URL}/${id}`)
  return response.data
}

/**
 * Get pool by app_id (on-chain application ID)
 * Returns null if pool is not found (404), throws for other errors
 */
export async function getPoolByAppId(appId: number): Promise<Pool | null> {
  try {
    const response = await axios.get<Pool>(`${API_BASE_URL}/app/${appId}`)
    return response.data
  } catch (error) {
    // Handle 404 as "not found" - return null instead of throwing
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Update pool metadata
 */
export async function updatePool(id: string, data: UpdatePoolData): Promise<Pool> {
  const response = await axios.patch<Pool>(`${API_BASE_URL}/${id}`, data)
  return response.data
}

/**
 * Delete pool
 */
export async function deletePool(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/${id}`)
}
