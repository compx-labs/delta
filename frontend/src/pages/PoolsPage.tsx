import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import { PoolsTable } from '../components/PoolsTable'
import { Dropdown } from '../components/Dropdown'
import type { PoolListItem } from '../types/pool'
import type { PoolFilters } from '../types/pool'
import { getPools } from '../services/poolService'

export function PoolsPage() {
  const navigate = useNavigate()
  const [pools, setPools] = useState<PoolListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PoolFilters>({
    type: 'all',
    status: 'all',
    search: '',
  })

  useEffect(() => {
    async function fetchPools() {
      setLoading(true)
      const data = await getPools(filters)
      setPools(data)
      setLoading(false)
    }

    fetchPools()
  }, [filters])

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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-medium text-off-white mb-2">Pools</h1>
            <p className="text-mid-grey">Permissionless reward distribution</p>
          </div>
          <Link
            to="/create"
            className="inline-block px-6 py-3 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors text-center"
          >
            Create pool
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
              className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>
        </div>

        {/* Pools Table */}
        {loading ? (
          <div className="py-16 text-center text-mid-grey">Loading...</div>
        ) : (
          <PoolsTable
            pools={pools}
            onSelectPool={handleSelectPool}
          />
        )}

        {/* Empty state */}
        {pools.length === 0 && !loading && (
          <div className="py-16 text-center text-mid-grey">
            No pools available. Pools will appear here once incentive programs are created.
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

