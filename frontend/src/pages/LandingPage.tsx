import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LandingNav } from '../components/LandingNav'
import { Footer } from '../components/Footer'
import { Section } from '../components/Section'
import { Panel } from '../components/Panel'
import { StatItem } from '../components/StatItem'
import { AnimButton } from '../components/AnimButton'

export function LandingPage() {
  const navigate = useNavigate()
  
  // Placeholder stats - replace with real data when available
  const stats = {
    activePools: null as number | null,
    totalValueStaked: null as string | null,
    rewardsDistributed: null as string | null,
    averageAPR: null as string | null,
  }

  const hasActivePools = stats.activePools !== null && stats.activePools > 0

  return (
    <div className="min-h-screen bg-off-white">
      <LandingNav />

      {/* Hero Section */}
      <section className="bg-near-black text-off-white py-24 md:py-32">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-medium mb-6">Delta</h1>
            <h2 className="text-2xl md:text-3xl text-mid-grey mb-8">
              The neutral incentives network.
            </h2>
            <p className="text-lg text-slate-grey mb-12 leading-relaxed">
              Delta is the canonical place to create and participate in staking and farming programs on Algorand.
              Permissionless, predictable, and designed to run quietly in the background of the ecosystem.
            </p>
            <div className="mb-6">
              <AnimButton
                text="Launch app"
                onClick={() => navigate('/pools')}
                variant="accent"
                className="px-8  text-lg border-accent text-accent hover:border-accent/80 hover:text-accent/80"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Strip */}
      {(stats.activePools !== null || stats.totalValueStaked !== null || stats.rewardsDistributed !== null || stats.averageAPR !== null) && (
        <motion.section
          className="border-b-2 border-mid-grey/20 py-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatItem label="Active pools" value={stats.activePools ?? '--'} />
              <StatItem label="Total value deposited" value={stats.totalValueStaked ?? '--'} />
              <StatItem label="Rewards distributed (30d)" value={stats.rewardsDistributed ?? '--'} />
              <StatItem label="Average APR (active pools)" value={stats.averageAPR ?? '--'} />
            </div>
            <div className="mt-6 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${hasActivePools ? 'bg-amber' : 'bg-mid-grey'}`} />
              <span className={`text-sm ${hasActivePools ? 'text-amber' : 'text-mid-grey'}`}>
                Network: {hasActivePools ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </motion.section>
      )}

      {/* What Delta Does */}
      <Section title="What Delta does" id="what-delta-does" animationDelay={0.2}>
        <p className="text-slate-grey mb-12 max-w-3xl leading-relaxed">
          Delta provides shared infrastructure for distributing rewards across many participants, pools, and assets.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          <Panel title="Permissionless pools">
            Create staking or farming pools without approval.
          </Panel>
          <Panel title="Transparent rewards">
            Fixed schedules, visible rates, predictable distribution.
          </Panel>
          <Panel title="Non-custodial participation">
            Deposit, earn, and exit according to pool rules.
          </Panel>
        </div>
      </Section>

      {/* What Delta Is Not */}
      <Section title="What Delta is not" className="bg-near-black text-off-white" animationDelay={0.3}>
        <div className="max-w-2xl">
          <ul className="space-y-3 text-mid-grey mb-6">
            <li>• A marketing platform</li>
            <li>• A yield optimizer</li>
            <li>• A governance surface</li>
            <li>• A gamified rewards app</li>
          </ul>
          <p className="text-mid-grey text-sm">
            There are no tiers, campaigns, or featured pools. Delta treats all pools equally.
          </p>
        </div>
      </Section>

      {/* Designed for Longevity */}
      <Section title="Designed for longevity" animationDelay={0.4}>
        <div className="max-w-2xl">
          <p className="text-slate-grey mb-6 leading-relaxed">
            Delta is built for programs that run for months, not days.
          </p>
          <ul className="space-y-2 text-slate-grey">
            <li>• Predictable behaviour</li>
            <li>• Clear reward schedules</li>
            <li>• Stable incentives</li>
            <li>• Minimal surface area</li>
          </ul>
        </div>
      </Section>

      {/* Permissionless by Default */}
      <Section title="Permissionless by default" className="bg-near-black text-off-white" animationDelay={0.5}>
        <div className="max-w-2xl">
          <ul className="space-y-3 text-mid-grey mb-6">
            <li>• Open to any ASA</li>
            <li>• Pool creation requires no approval</li>
            <li>• Fully on-chain and non-custodial</li>
            <li>• Discovery and ordering are neutral</li>
          </ul>
          <p className="text-mid-grey text-sm">
            If a pool exists, it is visible.
          </p>
        </div>
      </Section>

      {/* Economic Alignment */}
      <Section title="Economic alignment" id="economic-alignment" animationDelay={0.6}>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <Panel title="xUSD">
            xUSD is the primary unit of account for incentives. It reduces reward volatility and improves comparability between pools.
          </Panel>
          <Panel title="FLUX">
            FLUX represents long-term alignment. It may be used for parameter changes and system-level decisions. FLUX is not required to participate.
          </Panel>
        </div>
      </Section>

      {/* How Delta Fits In */}
      <Section title="How Delta fits in" id="how-delta-fits-in" animationDelay={0.7}>
        <div className="max-w-2xl">
          <p className="text-slate-grey mb-6 leading-relaxed">
            Delta is part of a layered financial system. It works alongside:
          </p>
          <ul className="space-y-2 text-slate-grey mb-6">
            <li>
              <a href="https://novadex.compx.io" className="hover:text-near-black transition-colors underline-offset-2 hover:underline">
                NovaDEX
              </a> (liquidity)
            </li>
            <li>
              <a href="https://orbital.compx.io" className="hover:text-near-black transition-colors underline-offset-2 hover:underline">
                Orbital
              </a> (lending)
            </li>
            <li>
              <a href="https://turbine.compx.io" className="hover:text-near-black transition-colors underline-offset-2 hover:underline">
                Turbine
              </a> (strategy routing)
            </li>
            <li>
              <a href="https://canix.compx.io" className="hover:text-near-black transition-colors underline-offset-2 hover:underline">
                Canix
              </a> (discovery)
            </li>
            <li>
              <a href="https://waypoint.compx.io" className="hover:text-near-black transition-colors underline-offset-2 hover:underline">
                Waypoint
              </a> (payments)
            </li>
          </ul>
          <p className="text-mid-grey text-sm">
            Delta does not compete with these products. It enables them.
          </p>
        </div>
      </Section>

      {/* Interface Philosophy */}
      <Section title="Interface philosophy" className="bg-near-black text-off-white" animationDelay={0.8}>
        <div className="grid md:grid-cols-2 gap-12 max-w-3xl">
          <div>
            <h3 className="text-lg font-medium text-off-white mb-4">You should see</h3>
            <ul className="space-y-2 text-mid-grey">
              <li>• Active pools</li>
              <li>• Reward rates</li>
              <li>• Pool status</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-medium text-off-white mb-4">You should not see</h3>
            <ul className="space-y-2 text-mid-grey">
              <li>• Promotions</li>
              <li>• Animated metrics</li>
              <li>• Artificial urgency</li>
            </ul>
          </div>
        </div>
        <p className="mt-8 text-mid-grey text-sm">
          If nothing is active, the interface remains quiet.
        </p>
      </Section>

      <Footer />
    </div>
  )
}

