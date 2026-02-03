import { useNetwork } from '../context/networkContext'

interface ProtocolStatsHeaderProps {
  protocolStatus?: 'online' | 'offline'
  totalTVL: number
  totalStakers: number
}

export function ProtocolStatsHeader({ 
  protocolStatus = 'online',
  totalTVL,
  totalStakers 
}: ProtocolStatsHeaderProps) {
  const { networkConfig } = useNetwork()

  // Format TVL with K/M suffixes
  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000) return `$${(tvl / 1000000).toFixed(2)}M`
    if (tvl >= 1000) return `$${(tvl / 1000).toFixed(1)}K`
    return `$${tvl.toFixed(2)}`
  }

  // Format stakers count
  const formatStakers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toLocaleString()
  }

  const networkDisplay = networkConfig.id === 'mainnet' ? 'MAINNET' : 'TESTNET'

  return (
    <div className="w-full relative pt-8">
      <div className="container mx-auto px-4">
        <div className="bg-near-black border-2 border-mid-grey/30 py-4 px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Left Section: Protocol Status & Network */}
            <div className="flex items-center gap-4">
              {/* Protocol Status Indicator with signal icon */}
              <div className="flex items-center gap-2">
                {/* Signal/WiFi icon representation - simplified circular signal */}
                <div className={`text-sm ${
                  protocolStatus === 'online' ? 'text-accent' : 'text-mid-grey'
                }`}>
                  <span className="font-mono">((o))</span>
                </div>
                <span className="text-sm text-mid-grey uppercase tracking-wider font-mono">
                  PROTOCOL STATUS
                </span>
              </div>

              {/* Network Badge */}
              <div className="px-3 py-1 border border-accent/50 bg-transparent">
                <span className="text-xs text-accent uppercase tracking-wider font-mono font-medium">
                  {networkDisplay}
                </span>
              </div>
            </div>

            {/* Right Section: Stats */}
            <div className="flex flex-wrap items-center gap-6 md:gap-8">
              {/* TVL */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-mid-grey uppercase tracking-wider font-mono">TVL</span>
                </div>
                <div className="text-xl font-medium text-off-white font-mono">
                  {totalTVL > 0 ? formatTVL(totalTVL) : '--'}
                </div>
              </div>

              {/* Stakers */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs text-mid-grey uppercase tracking-wider font-mono">STAKERS</span>
                </div>
                <div className="text-xl font-medium text-off-white font-mono">
                  {totalStakers > 0 ? formatStakers(totalStakers) : '--'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
