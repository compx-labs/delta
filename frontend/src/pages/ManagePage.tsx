import { useState, useEffect, useContext, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@txnlab/use-wallet-react'
import { useQuery } from '@tanstack/react-query'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { ManagePoolsTable } from '../components/ManagePoolsTable'
import { Dropdown } from '../components/Dropdown'
import { StatusDot } from '../components/StatusDot'
import { CopyField } from '../components/CopyField'
import { WalletContext } from '../context/wallet'
import { usePools } from '../context/poolsContext'
import { useNetwork } from '../context/networkContext'
import { fetchMultipleAssetInfo } from '../utils/assetUtils'
import type { ManagePoolListItem, ManagePoolDetail } from '../types/pool'
import { getPoolsCreatedBy, getManagePoolDetail } from '../services/manageService'

export function ManagePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const poolId = searchParams.get('poolId')
  const { activeAccount } = useWallet()
  const { setDisplayWalletConnectModal } = useContext(WalletContext)
  const { poolStates } = usePools()
  const { networkConfig } = useNetwork()
  
  const [pools, setPools] = useState<ManagePoolListItem[]>([])
  const [poolDetail, setPoolDetail] = useState<ManagePoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
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
  } = useQuery({
    queryKey: ['assetInfo', networkConfig.id, assetIds.join(',')],
    queryFn: () => fetchMultipleAssetInfo(assetIds, networkConfig),
    enabled: assetIds.length > 0 && !!networkConfig.indexerServer,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  useEffect(() => {
    async function fetchData() {
      if (!activeAccount?.address) {
        setLoading(false)
        return
      }

      if (poolId) {
        // Fetch pool detail
        setLoading(true)
        const detail = await getManagePoolDetail(poolId)
        setPoolDetail(detail)
        setLoading(false)
      } else {
        // Fetch pools list with pool states and asset info
        setLoading(true)
        const data = await getPoolsCreatedBy(activeAccount.address, poolStates, assetInfoMap)
        setPools(data)
        setLoading(false)
      }
    }

    fetchData()
  }, [activeAccount?.address, poolId, poolStates, assetInfoMap])

  const handleFilterChange = (key: 'status' | 'type' | 'search', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleBackToManage = () => {
    setSearchParams({})
    setPoolDetail(null)
  }

  const handleConnectWallet = () => {
    setDisplayWalletConnectModal(true)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toISOString().split('T')[0]
  }

  const formatRewards = (rewards: Array<{ symbol: string; amount: number }>) => {
    if (rewards.length === 0) return '--'
    return rewards.map(r => `${r.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${r.symbol}`).join(', ')
  }

  // Pool detail view
  if (poolId) {
    if (loading) {
      return (
        <div className="min-h-screen bg-near-black text-off-white">
          <AppNav />
          <div className="container mx-auto px-4 py-16">
            <div className="text-center text-mid-grey">Loading...</div>
          </div>
          <Footer />
        </div>
      )
    }

    if (!poolDetail) {
      return (
        <div className="min-h-screen bg-near-black text-off-white">
          <AppNav />
          <div className="container mx-auto px-4 py-16">
            <button
              onClick={handleBackToManage}
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to manage
            </button>
            <h1 className="text-3xl font-medium text-off-white mb-4">Manage pool</h1>
            <p className="text-mid-grey">Pool not found.</p>
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
          <button
            onClick={handleBackToManage}
            className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
          >
            ← Back to manage
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-medium text-off-white mb-2">Manage pool</h1>
            <p className="text-mid-grey">{poolDetail.displayName}</p>
          </div>

          {/* Summary Panel */}
          <div className="border-2 border-mid-grey/30 p-6 mb-8 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CopyField
                label="Pool ID"
                value={poolDetail.id}
                variant="dark"
              />
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Type</label>
                <div className="text-sm text-off-white">
                  {poolDetail.type === 'single' ? 'Single' : 'LP'}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Status</label>
                <div className="flex items-center gap-2">
                  <StatusDot status={poolDetail.status} />
                  <span className="text-sm text-off-white capitalize">{poolDetail.status}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Stakers</label>
                <div className="text-sm text-off-white">
                  {poolDetail.stakers.toLocaleString()}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">APR</label>
                <div className={`text-sm ${
                  poolDetail.status === 'active' && poolDetail.apr !== null ? 'text-amber font-medium' : 'text-off-white'
                }`}>
                  {poolDetail.apr !== null ? `${poolDetail.apr.toFixed(2)}%` : '--'}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Remaining rewards</label>
                <div className="text-sm text-off-white">
                  {formatRewards(poolDetail.rewardsRemaining)}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Schedule start</label>
                <div className="text-sm text-off-white">
                  {formatDate(poolDetail.schedule.startTime)}
                </div>
              </div>
              <div>
                <label className="text-xs text-mid-grey mb-1 block">Schedule end</label>
                <div className="text-sm text-off-white">
                  {formatDate(poolDetail.schedule.endTime)}
                </div>
              </div>
              <CopyField
                label="Contract reference"
                value={poolDetail.contractRef.appId || poolDetail.contractRef.address || '--'}
                variant="dark"
              />
              <CopyField
                label="Creator"
                value={poolDetail.creator}
                variant="dark"
              />
            </div>
          </div>

          {/* Placeholder text */}
          <div className="text-mid-grey">
            Pool management controls will be implemented next.
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-off-white mb-2">Manage</h1>
            <p className="text-mid-grey">Pools created by you</p>
          </div>
          
        </div>

        {/* Not Connected State */}
        {!activeAccount && (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-medium text-off-white mb-2">Connect wallet</h2>
            <p className="text-mid-grey mb-6">Connect a wallet to view pools you created.</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors"
            >
              Connect
            </button>
          </div>
        )}

        {/* Connected but no pools */}
        {activeAccount && !loading && pools.length === 0 && (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-medium text-off-white mb-2">No pools found</h2>
            <p className="text-mid-grey">Pools you create will appear here.</p>
          </div>
        )}

        {/* Filters and Table */}
        {activeAccount && pools.length > 0 && (
          <>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <Dropdown
                label="Status"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              />
              <Dropdown
                label="Type"
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'single', label: 'Single' },
                  { value: 'lp', label: 'LP' },
                ]}
                value={filters.type}
                onChange={(value) => handleFilterChange('type', value)}
              />
              <div className="flex-1">
                <label className="sr-only">Search</label>
                <input
                  type="text"
                  placeholder="Search by pool or asset"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>
            </div>

            {/* Pools Table */}
            {loading ? (
              <div className="py-16 text-center text-mid-grey">Loading...</div>
            ) : (
              <ManagePoolsTable
                pools={pools}
                filters={filters}
              />
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

