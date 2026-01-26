import React from "react";
import { Coins } from "lucide-react";

export const PoolsSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Coins className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          POOLS
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Browse and explore available staking pools on Delta. Each pool allows you to stake
          assets and earn rewards based on the pool's configuration.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Types</h3>
        <div className="space-y-4 mb-6">
          <div className="border-2 border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-2">Single-Asset Pools</h4>
            <p className="text-mid-grey text-sm">
              Stake a single token to earn rewards. Ideal for projects wanting to incentivize
              holding of their native token.
            </p>
          </div>
          <div className="border-2 border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-2">LP Token Pools</h4>
            <p className="text-mid-grey text-sm">
              Stake liquidity pool tokens to earn rewards. Perfect for incentivizing liquidity
              provision in DeFi protocols.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Information</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Each pool displays important information including:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Current APR (Annual Percentage Rate)</li>
          <li>Total value staked</li>
          <li>Number of stakers</li>
          <li>Reward asset and remaining rewards</li>
          <li>Pool status (active, inactive, or scheduled)</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">How to Browse Pools</h3>
        <ol className="list-decimal list-inside text-mid-grey space-y-2 mb-6">
          <li>Navigate to the Pools page</li>
          <li>Use filters to find pools by type, status, or search by asset</li>
          <li>Click on a pool to view detailed information</li>
          <li>Review the APR, rewards, and pool details</li>
          <li>Connect your wallet to stake assets</li>
        </ol>
      </div>
    </div>
  );
};

