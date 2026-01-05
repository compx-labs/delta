import { useState, useEffect } from 'react'
import type { PoolDetail } from '../types/pool'
import { getPoolDetail } from '../services/poolService'
import { StatusDot } from './StatusDot'
import { StatItem } from './StatItem'
import { CopyField } from './CopyField'

interface PoolDetailPanelProps {
  poolId: string
  onClose: () => void
}

export function PoolDetailPanel({ poolId, onClose }: PoolDetailPanelProps) {
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stakeAmount, setStakeAmount] = useState('')
  const [isUnstake, setIsUnstake] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchPool() {
      setLoading(true)
      const data = await getPoolDetail(poolId)
      if (!cancelled) {
        setPool(data)
        setLoading(false)
      }
    }

    fetchPool()

    return () => {
      cancelled = true
    }
  }, [poolId])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0">
        <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center text-mid-grey">Loading...</div>
        </div>
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0">
        <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium text-off-white">Pool Details</h2>
              <button
                onClick={onClose}
                className="text-mid-grey hover:text-off-white transition-colors"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="text-center text-mid-grey py-16">Pool not found.</div>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleDateString()
  }

  const totalClaimable = pool.user.claimableRewards.reduce((sum, r) => sum + r.amount, 0)

  return (
    <div 
      className="fixed inset-0 bg-near-black/80 z-50 flex items-center justify-center p-4 md:p-0"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-near-black border border-mid-grey/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-medium text-off-white mb-2">{pool.displayName}</h2>
              <div className="flex items-center gap-4">
                <span className="text-sm text-mid-grey">
                  {pool.type === 'single' ? 'Single-asset pool' : 'LP pool'}
                </span>
                <div className="flex items-center gap-2">
                  <StatusDot status={pool.status} />
                  <span className="text-sm text-mid-grey capitalize">{pool.status}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-mid-grey hover:text-off-white transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-mid-grey/30">
            <div>
              <div className="text-xs text-mid-grey mb-1">APR</div>
              <div className={`text-xl font-medium ${
                pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-off-white'
              }`}>
                {pool.apr !== null ? `${pool.apr.toFixed(2)}%` : '--'}
              </div>
            </div>
            <StatItem
              label="Total Staked"
              value={pool.tvlUsd !== null && pool.tvlUsd > 0 ? `$${(pool.tvlUsd / 1000).toFixed(0)}K` : '--'}
              variant="dark"
            />
            <StatItem
              label="Reward Asset(s)"
              value={pool.rewardAssets.map(a => a.symbol).join(', ')}
              variant="dark"
            />
            <StatItem
              label="Rewards Remaining"
              value={pool.rewardsRemaining.map(r => `${r.amount.toLocaleString()} ${r.symbol}`).join(', ') || '--'}
              variant="dark"
            />
            {pool.schedule.endTime && (
              <StatItem
                label="End Date"
                value={formatDate(pool.schedule.endTime)}
                variant="dark"
              />
            )}
          </div>

          {/* Action Panel */}
          <div className="mb-8 pb-8 border-b border-mid-grey/30">
            <h3 className="text-lg font-medium text-off-white mb-4">Actions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-mid-grey mb-2">
                  Amount ({pool.depositAsset.symbol})
                </label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsUnstake(false)}
                  className={`flex-1 px-4 py-2 border transition-colors ${
                    !isUnstake
                      ? 'border-amber bg-amber text-off-white'
                      : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                  }`}
                >
                  Stake
                </button>
                <button
                  onClick={() => setIsUnstake(true)}
                  className={`flex-1 px-4 py-2 border transition-colors ${
                    isUnstake
                      ? 'border-amber bg-amber text-off-white'
                      : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                  }`}
                >
                  Unstake
                </button>
              </div>
              <button
                disabled={totalClaimable === 0}
                className={`w-full px-4 py-2 border transition-colors ${
                  totalClaimable > 0
                    ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
                    : 'border-mid-grey/30 text-mid-grey cursor-not-allowed'
                }`}
              >
                Claim Rewards {totalClaimable > 0 && `(${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})`}
              </button>
            </div>
          </div>

          {/* Pool Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-off-white mb-4">Pool Parameters</h3>
            <CopyField label="Pool ID" value={pool.id} variant="dark" />
            <CopyField label="Deposit Asset" value={pool.depositAsset.id || pool.depositAsset.symbol} variant="dark" />
            <CopyField
              label="Reward Asset(s)"
              value={pool.rewardAssets.map(a => a.id || a.symbol).join(', ')}
              variant="dark"
            />
            {pool.schedule.startTime && (
              <CopyField label="Start Time" value={formatDate(pool.schedule.startTime)} variant="dark" />
            )}
            {pool.schedule.endTime && (
              <CopyField label="End Time" value={formatDate(pool.schedule.endTime)} variant="dark" />
            )}
            <CopyField label="Creator Address" value={pool.creator} variant="dark" />
            {pool.contractRef.appId && (
              <CopyField label="Contract App ID" value={pool.contractRef.appId} variant="dark" />
            )}
            {pool.contractRef.address && (
              <CopyField label="Contract Address" value={pool.contractRef.address} variant="dark" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

