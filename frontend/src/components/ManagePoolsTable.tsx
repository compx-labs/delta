import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ManagePoolListItem } from '../types/pool'
import { StatusDot } from './StatusDot'

interface ManagePoolsTableProps {
  pools: ManagePoolListItem[]
  filters: {
    status: string
    type: string
    search: string
  }
}

export function ManagePoolsTable({ pools, filters }: ManagePoolsTableProps) {
  const navigate = useNavigate()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (poolId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(poolId)) {
        next.delete(poolId)
      } else {
        next.add(poolId)
      }
      return next
    })
  }

  const formatAPR = (apr: number | null) => {
    if (apr === null) return '--'
    return `${apr.toFixed(2)}%`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  const formatRewards = (rewards: Array<{ symbol: string; amount: number }>) => {
    if (rewards.length === 0) return '--'
    const first = rewards[0]
    const amount = first.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
    if (rewards.length === 1) {
      return `${amount} ${first.symbol}`
    }
    return (
      <>
        {amount} {first.symbol}
        <span className="text-mid-grey ml-1">+{rewards.length - 1}</span>
      </>
    )
  }

  const handleRowClick = (poolId: string, e: React.MouseEvent) => {
    // Don't navigate if clicking the expand button
    if ((e.target as HTMLElement).closest('[data-expand-button]')) {
      return
    }
    navigate(`/manage?poolId=${poolId}`)
  }

  const handleManageClick = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/manage?poolId=${poolId}`)
  }

  const handleResumeCreation = (poolId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/create?resume=${poolId}`)
  }

  const getCreationStatus = (pool: ManagePoolListItem) => {
    if (!pool.creation_status || pool.creation_status === 'completed') {
      return null
    }
    
    if (pool.creation_status === 'failed') {
      return { label: 'Failed', canResume: true }
    }
    
    if (pool.creation_status === 'creating' || pool.creation_status === 'pending') {
      const steps = [
        pool.step_create_completed,
        pool.step_init_completed,
        pool.step_fund_activate_register_completed,
      ]
      const completedSteps = steps.filter(Boolean).length
      return { label: `Creating (${completedSteps}/3)`, canResume: true }
    }
    
    return null
  }

  // Filter and sort pools
  let filtered = [...pools]
  
  if (filters.status !== 'all') {
    filtered = filtered.filter(pool => pool.status === filters.status)
  }
  
  if (filters.type !== 'all') {
    filtered = filtered.filter(pool => pool.type === filters.type)
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      pool =>
        pool.displayName.toLowerCase().includes(searchLower) ||
        pool.id.toLowerCase().includes(searchLower) ||
        pool.stakeAsset.symbol.toLowerCase().includes(searchLower) ||
        pool.rewardAssets.some(asset => asset.symbol.toLowerCase().includes(searchLower))
    )
  }

  // Sort: Active first, then newest (createdAt desc)
  filtered.sort((a, b) => {
    if (a.status === 'active' && b.status === 'inactive') return -1
    if (a.status === 'inactive' && b.status === 'active') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (filtered.length === 0) {
    return (
      <div className="py-16 text-center text-mid-grey">
        No pools found matching your filters.
      </div>
    )
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block border-2 border-mid-grey/30 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-mid-grey/30">
              <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Pool</th>
              <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Status</th>
              <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">Stakers</th>
              <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">APR</th>
              <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Remaining rewards</th>
              <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Expected end date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((pool) => (
              <tr
                key={pool.id}
                onClick={(e) => handleRowClick(pool.id, e)}
                className="border-b-2 border-mid-grey/20 cursor-pointer transition-colors hover:bg-off-white/5 focus-within:bg-off-white/5"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/manage?poolId=${pool.id}`)
                  }
                }}
              >
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-off-white">{pool.displayName}</span>
                    <span className="text-xs text-mid-grey">
                      {pool.type === 'single' ? 'Single' : 'LP'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <StatusDot status={pool.status} />
                      <span className="text-sm text-mid-grey capitalize">{pool.status}</span>
                    </div>
                    {getCreationStatus(pool) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-amber">
                          {getCreationStatus(pool)?.label}
                        </span>
                        {getCreationStatus(pool)?.canResume && (
                          <button
                            onClick={(e) => handleResumeCreation(pool.id, e)}
                            className="text-xs text-amber hover:text-amber/80 underline"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-mid-grey text-sm">
                  {pool.stakers.toLocaleString()}
                </td>
                <td className={`px-4 py-4 text-right text-sm ${
                  pool.status === 'active' && pool.apr !== null ? 'text-amber font-medium' : 'text-mid-grey'
                }`}>
                  {formatAPR(pool.apr)}
                </td>
                <td className="px-4 py-4 text-mid-grey text-sm">
                  {formatRewards(pool.rewardsRemaining)}
                </td>
                <td className="px-4 py-4 text-mid-grey text-sm">
                  {formatDate(pool.endDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Expandable Rows */}
      <div className="md:hidden space-y-2">
        {filtered.map((pool) => {
          const isExpanded = expandedRows.has(pool.id)
          return (
            <div
              key={pool.id}
              className="border-2 border-mid-grey/30 bg-near-black"
            >
              {/* Collapsed Row */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-expand-button]')) {
                    toggleRow(pool.id)
                  } else {
                    toggleRow(pool.id)
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={pool.status} />
                    <span className="font-medium text-off-white truncate">{pool.displayName}</span>
                  </div>
                  {getCreationStatus(pool) && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-amber">
                        {getCreationStatus(pool)?.label}
                      </span>
                      {getCreationStatus(pool)?.canResume && (
                        <button
                          onClick={(e) => handleResumeCreation(pool.id, e)}
                          className="text-xs text-amber hover:text-amber/80 underline"
                        >
                          Resume
                        </button>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`${
                      pool.status === 'active' && pool.apr !== null ? 'text-amber font-medium' : 'text-mid-grey'
                    }`}>
                      {formatAPR(pool.apr)}
                    </span>
                    <span className="text-mid-grey">
                      {pool.type === 'single' ? 'Single' : 'LP'}
                    </span>
                  </div>
                </div>
                <button
                  data-expand-button
                  className="ml-4 p-2 text-mid-grey hover:text-off-white transition-colors"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t-2 border-mid-grey/20 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-mid-grey">Stakers:</span>
                      <span className="ml-2 text-off-white">{pool.stakers.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-mid-grey">Expected end date:</span>
                      <span className="ml-2 text-off-white">{formatDate(pool.endDate)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-mid-grey text-sm">Remaining rewards:</span>
                    <div className="mt-1 text-off-white">{formatRewards(pool.rewardsRemaining)}</div>
                  </div>
                  {getCreationStatus(pool)?.canResume ? (
                    <button
                      onClick={(e) => handleResumeCreation(pool.id, e)}
                      className="w-full px-4 py-2 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors text-sm"
                    >
                      Resume Creation
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleManageClick(pool.id, e)}
                      className="w-full px-4 py-2 bg-amber text-off-white font-medium hover:bg-amber/90 transition-colors text-sm"
                    >
                      Manage pool
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

