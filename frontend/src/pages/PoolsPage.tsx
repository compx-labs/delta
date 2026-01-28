import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { PoolsTable } from '../components/PoolsTable'
import { Dropdown } from '../components/Dropdown'
import { AnimButton } from '../components/AnimButton'
import { usePools } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import { getAllPools } from '../services/poolApiService'
import type { PoolListItem } from '../types/pool'
import type { PoolFilters } from '../types/pool'

export function PoolsPage() {
  const navigate = useNavigate()
  const { networkConfig } = useNetwork()
  const { 
    poolStates, 
    isLoadingMasterRepo, 
    isLoadingPools,
    masterRepoError,
    poolsError 
  } = usePools()
  
  const [filters, setFilters] = useState<PoolFilters>({
    type: 'all',
    status: 'all',
    search: '',
  })

  // Collect all unique asset IDs from pools
  const assetIds = useMemo(() => {
    const ids = new Set<string>()
    poolStates.forEach((state) => {
      if (state.stakedAssetId) ids.add(state.stakedAssetId.toString())
      if (state.rewardAssetId) ids.add(state.rewardAssetId.toString())
    })
    return Array.from(ids)
  }, [poolStates])

  // Fetch asset information for all assets used in pools
  const { 
    data: assetInfoMap = new Map(),
    isLoading: isLoadingAssets 
  } = useQuery({
    queryKey: ['assetInfo', networkConfig.id, assetIds.join(',')],
    queryFn: () => fetchMultipleAssetInfo(assetIds, networkConfig),
    enabled: assetIds.length > 0 && !!networkConfig.indexerServer,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Fetch pool metadata from database
  const { 
    data: poolMetadataMap = new Map(),
    isLoading: isLoadingMetadata 
  } = useQuery({
    queryKey: ['poolMetadata'],
    queryFn: async () => {
      const pools = await getAllPools()
      // Create a map keyed by app_id for quick lookup
      const metadataMap = new Map<number, typeof pools[0]>()
      pools.forEach(pool => {
        if (pool.app_id) {
          metadataMap.set(pool.app_id, pool)
        }
      })
      return metadataMap
    },
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })

  // Transform pool states to PoolListItem format
  const pools = useMemo<PoolListItem[]>(() => {
    const poolList: PoolListItem[] = []

    poolStates.forEach((state, appIdStr) => {
      if (!state.stakedAssetId || !state.rewardAssetId) {
        return // Skip incomplete pools
      }

      const stakedAssetInfo = assetInfoMap.get(state.stakedAssetId.toString())
      const rewardAssetInfo = assetInfoMap.get(state.rewardAssetId.toString())

      // Determine pool type (single asset or LP token)
      // For now, we'll assume single asset unless we have better detection
      const isLpToken = stakedAssetInfo?.symbol?.toUpperCase().includes('LP') || false
      const poolType: 'single' | 'lp' = isLpToken ? 'lp' : 'single'

      // Calculate APR from aprBps (basis points)
      const apr = state.aprBps ? Number(state.aprBps) / 100 : null

      // Determine status based on contract state and time
      const now = BigInt(Math.floor(Date.now() / 1000))
      const isActive = 
        state.contractState === BigInt(1) && // Active state
        state.startTime && state.startTime <= now &&
        state.endTime && state.endTime > now

      const status: 'active' | 'inactive' = isActive ? 'active' : 'inactive'

      // Calculate TVL (Total Value Locked) - simplified for now
      // In a real implementation, you'd need to get asset prices
      const tvlUsd = state.totalStaked ? Number(state.totalStaked) / 1_000_000 : null // Simplified

      // Create display name - just show the token to be staked
      const stakedSymbol = stakedAssetInfo?.symbol || `Asset ${state.stakedAssetId}`
      const rewardSymbol = rewardAssetInfo?.symbol || `Asset ${state.rewardAssetId}`
      
      // Get metadata from database if available
      const appIdNum = parseInt(appIdStr, 10)
      const metadata = poolMetadataMap.get(appIdNum)
      
      // Use database name if available, otherwise fall back to display name
      const displayName = metadata?.name || stakedSymbol
      const stakeToken = metadata?.stake_token || state.stakedAssetId.toString()

      poolList.push({
        id: appIdStr,
        displayName,
        type: poolType,
        depositAsset: {
          symbol: stakedSymbol,
          id: state.stakedAssetId.toString(),
          decimals: stakedAssetInfo?.decimals,
        },
        rewardAssets: [{
          symbol: rewardSymbol,
          id: state.rewardAssetId.toString(),
          decimals: rewardAssetInfo?.decimals,
        }],
        apr,
        tvlUsd,
        status,
        // Database metadata
        name: metadata?.name,
        stakeToken,
      })
    })

    return poolList
  }, [poolStates, assetInfoMap, poolMetadataMap])

  // Apply filters
  const filteredPools = useMemo(() => {
    let filtered = [...pools]

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
          (pool.name || pool.displayName).toLowerCase().includes(searchLower) ||
          pool.displayName.toLowerCase().includes(searchLower) ||
          pool.id.toLowerCase().includes(searchLower) ||
          pool.depositAsset.symbol.toLowerCase().includes(searchLower) ||
          pool.rewardAssets.some(asset => asset.symbol.toLowerCase().includes(searchLower)) ||
          (pool.stakeToken && pool.stakeToken.toLowerCase().includes(searchLower))
      )
    }

    // Sort: Active first, then alphabetical by display name
    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status === 'inactive') return -1
      if (a.status === 'inactive' && b.status === 'active') return 1
      return a.displayName.localeCompare(b.displayName)
    })

    return filtered
  }, [pools, filters])

  const loading = isLoadingMasterRepo || isLoadingPools || isLoadingAssets || isLoadingMetadata

  const handleSelectPool = (id: string) => {
    navigate(`/pool?poolId=${id}`)
  }

  const handleFilterChange = (key: keyof PoolFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }))
  }

  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-3xl font-medium text-off-white mb-2">Pools</h1>
            <p className="text-mid-grey">Permissionless reward distribution</p>
          </div>
          <AnimButton
            text="Create pool"
            onClick={() => navigate('/create')}
          />
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex flex-col md:flex-row gap-4 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Dropdown
            label="Type"
            options={[
              { value: 'all', label: 'All' },
              { value: 'single', label: 'Single' },
              { value: 'lp', label: 'LP' },
            ]}
            value={filters.type || 'all'}
            onChange={(value) => handleFilterChange('type', value)}
          />
          <Dropdown
            label="Status"
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            value={filters.status || 'all'}
            onChange={(value) => handleFilterChange('status', value)}
          />
          <div className="flex-1">
            <label className="sr-only">Search</label>
            <input
              type="text"
              placeholder="Search by asset or pool ID"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </motion.div>

        {/* Error states */}
        {(masterRepoError || poolsError) && (
          <motion.div
            className="py-8 px-4 bg-red-500/10 border-2 border-red-500/30 rounded text-red-400 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <p className="font-medium mb-1">Error loading pools</p>
            <p className="text-sm text-red-300">
              {masterRepoError?.message || poolsError?.message || 'Unknown error occurred'}
            </p>
          </motion.div>
        )}

        {/* Pools Table */}
        {loading ? (
          <motion.div
            className="py-16 text-center text-mid-grey"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Loading pools...
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <PoolsTable
              pools={filteredPools}
              onSelectPool={handleSelectPool}
            />
          </motion.div>
        )}

        {/* Empty state */}
        {filteredPools.length === 0 && !loading && !masterRepoError && !poolsError && (
          <motion.div
            className="py-16 text-center text-mid-grey"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            No pools available. Pools will appear here once incentive programs are created.
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  )
}

