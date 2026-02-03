import { motion } from 'framer-motion'
import { IoMdPlay } from 'react-icons/io'
import { Tooltip } from './tooltip'
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
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="The name of the staking pool">
                <span className="cursor-help">Pool Name</span>
              </Tooltip>
            </th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="The asset token that can be staked in this pool">
                <span className="cursor-help">Stake Token</span>
              </Tooltip>
            </th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="Pool type: Single asset or LP (Liquidity Pool) token">
                <span className="cursor-help">Type</span>
              </Tooltip>
            </th>
            <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="Annual Percentage Rate - the expected annual return for staking">
                <span className="cursor-help">APR</span>
              </Tooltip>
            </th>
            <th className="text-right px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="Total Value Locked - the total USD value of assets currently staked in this pool">
                <span className="cursor-help">Total Deposited</span>
              </Tooltip>
            </th>
            <th className="text-left px-4 py-3 text-xs text-mid-grey font-medium">
              <Tooltip content="The reward token(s) distributed to stakers">
                <span className="cursor-help">Rewards</span>
              </Tooltip>
            </th>
          </tr>
        </thead>
        <tbody>
          {pools.map((pool) => {
            return (
              <motion.tr
                key={pool.id}
                onClick={() => onSelectPool(pool.id)}
                className="border-b-2 border-mid-grey/20 cursor-pointer transition-colors hover:bg-off-white/5"
                initial="rest"
                whileHover="hover"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <motion.div
                      variants={{
                        rest: { rotate: -90 },
                        hover: { rotate: 0 },
                      }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className={`${pool.status === 'active' ? 'text-accent' : 'text-mid-grey'}`}
                    >
                      <IoMdPlay className="w-3 h-3" />
                    </motion.div>
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
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

