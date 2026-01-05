import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AppNav } from '../components/AppNav'
import { Footer } from '../components/Footer'
import type { PoolDetail } from '../types/pool'
import { getPoolDetail } from '../services/poolService'
import { StatusDot } from '../components/StatusDot'
import { StatItem } from '../components/StatItem'
import { CopyField } from '../components/CopyField'

interface ActionsPanelProps {
  pool: PoolDetail
  depositAmount: string
  setDepositAmount: (value: string) => void
  isWithdraw: boolean
  setIsWithdraw: (value: boolean) => void
  totalClaimable: number
}

function ActionsPanel({
  pool,
  depositAmount,
  setDepositAmount,
  isWithdraw,
  setIsWithdraw,
  totalClaimable,
}: ActionsPanelProps) {
  return (
    <div className="border border-mid-grey/30 p-6">
      <h2 className="text-lg font-medium text-off-white mb-6">Pool Actions</h2>
      
      {/* Deposit/Withdraw Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setIsWithdraw(false)}
          className={`flex-1 px-4 py-2 border transition-colors ${
            !isWithdraw
              ? 'border-amber bg-amber text-off-white'
              : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => setIsWithdraw(true)}
          className={`flex-1 px-4 py-2 border transition-colors ${
            isWithdraw
              ? 'border-amber bg-amber text-off-white'
              : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
          }`}
        >
          Withdraw
        </button>
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm text-mid-grey mb-2">
          Amount ({pool.depositAsset.symbol})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.00"
            className="flex-1 px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
          />
          <button className="px-4 py-2 border border-mid-grey/30 text-mid-grey hover:text-off-white transition-colors">
            MAX
          </button>
        </div>
      </div>

      {/* Action Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-mid-grey">APR</span>
          <span className={`${pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-mid-grey'}`}>
            {pool.apr !== null ? `+${pool.apr.toFixed(2)}%` : '--'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-mid-grey">Wallet Balance</span>
          <span className="text-off-white">0 {pool.depositAsset.symbol}</span>
        </div>
        {pool.user.stakedAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-mid-grey">Deposited</span>
            <span className="text-off-white">{pool.user.stakedAmount.toLocaleString()} {pool.depositAsset.symbol}</span>
          </div>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        className={`w-full px-4 py-3 border transition-colors mb-4 ${
          !isWithdraw
            ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
            : 'border-amber bg-amber text-off-white hover:bg-amber/90'
        }`}
      >
        {isWithdraw ? 'WITHDRAW' : 'DEPOSIT'} {pool.depositAsset.symbol}
      </button>

      {/* Claim Rewards Button */}
      <button
        disabled={totalClaimable === 0}
        className={`w-full px-4 py-3 border transition-colors ${
          totalClaimable > 0
            ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
            : 'border-mid-grey/30 text-mid-grey cursor-not-allowed'
        }`}
      >
        Claim Rewards {totalClaimable > 0 && `(${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})`}
      </button>
    </div>
  )
}

export function PoolDetailPage() {
  const [searchParams] = useSearchParams()
  const poolId = searchParams.get('poolId')
  const [pool, setPool] = useState<PoolDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState('')
  const [isWithdraw, setIsWithdraw] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchPool() {
      if (!poolId) {
        setLoading(false)
        return
      }

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '--'
    return new Date(dateString).toLocaleDateString()
  }

  const totalClaimable = pool?.user.claimableRewards.reduce((sum, r) => sum + r.amount, 0) || 0

  if (!poolId) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">No pool selected.</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!pool) {
    return (
      <div className="min-h-screen bg-near-black text-off-white">
        <AppNav />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl">
            <Link
              to="/pools"
              className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
            >
              ← Back to Pools
            </Link>
            <h1 className="text-3xl font-medium text-off-white mb-4">Pool Details</h1>
            <p className="text-mid-grey">Pool not found.</p>
          </div>
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
        <Link
          to="/pools"
          className="text-mid-grey hover:text-off-white transition-colors mb-6 inline-block"
        >
          ← Back to Pools
        </Link>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Pool Information */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-medium text-off-white mb-2">{pool.displayName}</h1>
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

            {/* Key Stats */}
            <div>
              <h2 className="text-lg font-medium text-off-white mb-4">Pool Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-mid-grey mb-1">APR</div>
                  <div className={`text-xl font-medium ${
                    pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-off-white'
                  }`}>
                    {pool.apr !== null ? `${pool.apr.toFixed(2)}%` : '--'}
                  </div>
                </div>
                <StatItem
                  label="Total Deposited"
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
            </div>

            {/* Pool Parameters */}
            <div>
              <h2 className="text-lg font-medium text-off-white mb-4">Pool Parameters</h2>
              <div className="space-y-4">
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

          {/* Right Panel - Actions (Desktop) */}
          <div className="hidden lg:block lg:col-span-1">
            <ActionsPanel
              pool={pool}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              isWithdraw={isWithdraw}
              setIsWithdraw={setIsWithdraw}
              totalClaimable={totalClaimable}
            />
          </div>
        </div>

        {/* Mobile Action Button */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="w-full px-6 py-4 bg-amber text-off-white font-medium border-t border-amber/20"
          >
            Deposit | Withdraw | Claim
          </button>
        </div>

        {/* Mobile Drawer */}
        {isDrawerOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-near-black/80 z-50"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-near-black border-t border-mid-grey/30 rounded-t-lg max-h-[85vh] overflow-y-auto">
              <div className="sticky top-0 bg-near-black border-b border-mid-grey/30 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-off-white">Pool Actions</h2>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-mid-grey hover:text-off-white transition-colors"
                  aria-label="Close"
                >
                  Close
                </button>
              </div>
              <div className="p-6">
                <div>
                  {/* Deposit/Withdraw Toggle */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setIsWithdraw(false)}
                      className={`flex-1 px-4 py-2 border transition-colors ${
                        !isWithdraw
                          ? 'border-amber bg-amber text-off-white'
                          : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                      }`}
                    >
                      Deposit
                    </button>
                    <button
                      onClick={() => setIsWithdraw(true)}
                      className={`flex-1 px-4 py-2 border transition-colors ${
                        isWithdraw
                          ? 'border-amber bg-amber text-off-white'
                          : 'border-mid-grey/30 text-mid-grey hover:border-mid-grey hover:text-off-white'
                      }`}
                    >
                      Withdraw
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-6">
                    <label className="block text-sm text-mid-grey mb-2">
                      Amount ({pool.depositAsset.symbol})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="flex-1 px-4 py-2 border border-mid-grey/30 bg-near-black text-off-white placeholder:text-mid-grey focus:outline-none focus:ring-1 focus:ring-amber"
                      />
                      <button className="px-4 py-2 border border-mid-grey/30 text-mid-grey hover:text-off-white transition-colors">
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Action Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-grey">APR</span>
                      <span className={`${pool.status === 'active' && pool.apr !== null ? 'text-amber' : 'text-mid-grey'}`}>
                        {pool.apr !== null ? `+${pool.apr.toFixed(2)}%` : '--'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-grey">Wallet Balance</span>
                      <span className="text-off-white">0 {pool.depositAsset.symbol}</span>
                    </div>
                    {pool.user.stakedAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-mid-grey">Deposited</span>
                        <span className="text-off-white">{pool.user.stakedAmount.toLocaleString()} {pool.depositAsset.symbol}</span>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Button */}
                  <button
                    className={`w-full px-4 py-3 border transition-colors mb-4 ${
                      !isWithdraw
                        ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
                        : 'border-amber bg-amber text-off-white hover:bg-amber/90'
                    }`}
                  >
                    {isWithdraw ? 'WITHDRAW' : 'DEPOSIT'} {pool.depositAsset.symbol}
                  </button>

                  {/* Claim Rewards Button */}
                  <button
                    disabled={totalClaimable === 0}
                    className={`w-full px-4 py-3 border transition-colors ${
                      totalClaimable > 0
                        ? 'border-amber bg-amber text-off-white hover:bg-amber/90'
                        : 'border-mid-grey/30 text-mid-grey cursor-not-allowed'
                    }`}
                  >
                    Claim Rewards {totalClaimable > 0 && `(${pool.user.claimableRewards.map(r => `${r.amount.toFixed(2)} ${r.symbol}`).join(', ')})`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

