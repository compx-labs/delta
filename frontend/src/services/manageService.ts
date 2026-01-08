/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ManagePoolListItem, ManagePoolDetail } from '../types/pool'

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

export async function getPoolsCreatedBy(address: string): Promise<ManagePoolListItem[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // Return all pools (in real implementation, filter by creator address)
  return [...mockManagePools]
}

export async function getManagePoolDetail(poolId: string): Promise<ManagePoolDetail | null> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return mockManagePoolDetails[poolId] || null
}

