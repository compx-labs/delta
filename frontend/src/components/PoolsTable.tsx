import type { PoolListItem } from '../types/pool'

interface PoolsTableProps {
  pools: PoolListItem[]
  onSelectPool: (poolId: string) => void
}

export function PoolsTable({ pools, onSelectPool }: PoolsTableProps) {
  if (pools.length === 0) {
    return (
      <div className="py-16 text-center text-mid-grey">
        No pools available. Pools will appear here once incentive programs are created.
      </div>
    )
  }

  const formatAPR = (apr: number | null) => {
    if (apr === null) return '--'
    return `${apr.toFixed(2)}%`
  }

  const formatTVL = (tvl: number | null) => {
    if (tvl === null || tvl === 0) return '--'
    if (tvl >= 1000000) return `$${(tvl / 1000000).toFixed(2)}M`
    if (tvl >= 1000) return `$${(tvl / 1000).toFixed(2)}K`
    return `$${tvl.toFixed(2)}`
  }

  return (
    <div className="border-2 border-mid-grey/30 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-mid-grey/30">
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Pool Name</th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Stake Token</th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Type</th>
            <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">APR</th>
            <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">Total Deposited</th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">Rewards</th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => {
            return (
              <tr
                key={pool.id}
                onClick={() => onSelectPool(pool.id)}
                className="border-b-2 border-mid-grey/20 cursor-pointer transition-colors hover:bg-off-white/5"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2  ${pool.status === 'active' ? 'bg-accent' : 'bg-mid-grey'}`} />
                    <span className="font-medium text-off-white">{pool.name || pool.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-mid-grey text-sm">
                  {pool.depositAsset.symbol || (
                    <span className="text-mid-grey/50">--</span>
                  )}
                </td>
                <td className="px-4 py-4 text-mid-grey text-sm">
                  {pool.type === 'single' ? 'Single' : 'LP'}
                </td>
                <td className={`px-4 py-4 text-right text-sm ${
                  pool.status === 'active' && pool.apr !== null ? 'text-amber font-medium' : 'text-mid-grey'
                }`}>
                  {formatAPR(pool.apr)}
                </td>
                <td className="px-4 py-4 text-right text-mid-grey text-sm">
                  {formatTVL(pool.tvlUsd)}
                </td>
                <td className="px-4 py-4 text-mid-grey text-sm">
                  {pool.rewardAssets.map(asset => asset.symbol).join(', ')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

