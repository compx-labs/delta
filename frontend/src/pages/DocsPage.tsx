import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  Wallet,
  Droplets,
  ChevronRight,
  Radio,
  Target,
  Settings,
  FileText,
} from "lucide-react";
import { AppNav } from '../components/AppNav';
import { Footer } from '../components/Footer';
import {
  OverviewSection,
  PoolsSection,
  CreateSection,
  ManageSection,
  StakingSection,
  RewardsSection,
  FaucetSection,
} from '../components/docs';

export function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    {
      id: "overview",
      title: "Overview",
      icon: Radio,
      description: "Understanding Delta Staking Protocol",
    },
    {
      id: "pools",
      title: "Pools",
      icon: Coins,
      description: "Browse and explore staking pools",
    },
    {
      id: "create",
      title: "Create",
      icon: TrendingUp,
      description: "Create your own staking pool",
    },
    {
      id: "manage",
      title: "Manage",
      icon: Settings,
      description: "Manage pools you've created",
    },
    {
      id: "staking",
      title: "Staking",
      icon: Wallet,
      description: "Stake assets and earn rewards",
    },
    {
      id: "rewards",
      title: "Rewards",
      icon: FileText,
      description: "Understanding rewards and APR",
    },
    {
      id: "faucet",
      title: "Resource Station",
      icon: Droplets,
      description: "Get testnet tokens for testing",
    },
  ];

  return (
    <div className="min-h-screen bg-near-black text-off-white">
      <AppNav />

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Navigation Link */}
        <div className="mb-4 md:mb-4">
          <Link 
            to="/pools"
            className="inline-flex items-center gap-2 text-amber hover:text-amber/80 transition-colors text-sm md:text-base group"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform duration-150" />
            <span className="uppercase tracking-wide">Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <motion.div
          className="mb-5 md:mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          

          <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-medium mb-3 sm:mb-4 md:mb-6 text-off-white tracking-tight">
            DELTA <span className="text-amber">DOCUMENTATION</span>
          </h1>
          <p className="text-xs sm:text-base md:text-xl text-mid-grey max-w-4xl leading-relaxed mb-5 sm:mb-6 md:mb-8">
            Complete guide to Delta Staking Protocol • Learn to navigate the system • Master DeFi staking
          </p>
        </motion.div>

        {/* Main Documentation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {/* Navigation Sidebar */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-near-black border-2 border-mid-grey/30 sticky top-24">
              <div className="p-4 md:p-6">
                <h3 className="text-lg font-medium text-off-white uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber" />
                  NAVIGATION
                </h3>
                <nav className="space-y-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full text-left p-3 transition-all duration-150 group ${
                          isActive 
                            ? 'bg-amber/20 border-2 border-amber/30 text-amber' 
                            : 'hover:bg-mid-grey/10 text-mid-grey hover:text-off-white border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-amber' : 'text-mid-grey group-hover:text-amber'}`} />
                          <div className="flex-1">
                            <div className={`font-medium text-sm ${isActive ? 'text-amber' : 'text-off-white group-hover:text-off-white'}`}>
                              {section.title}
                            </div>
                            <div className="text-xs text-mid-grey mt-0.5">
                              {section.description}
                            </div>
                          </div>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90 text-amber' : 'text-mid-grey group-hover:text-amber'}`} />
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-near-black border-2 border-mid-grey/30">
              <div className="p-6 md:p-8">
                {/* Overview Section */}
                {activeSection === "overview" && <OverviewSection />}

                {/* Pools Section */}
                {activeSection === "pools" && <PoolsSection />}

                {/* Create Section */}
                {activeSection === "create" && <CreateSection />}

                {/* Manage Section */}
                {activeSection === "manage" && <ManageSection />}

                {/* Staking Section */}
                {activeSection === "staking" && <StakingSection />}

                {/* Rewards Section */}
                {activeSection === "rewards" && <RewardsSection />}

                {/* Faucet Section */}
                {activeSection === "faucet" && <FaucetSection />}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
