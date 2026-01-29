import React from "react";
import { Radio } from "lucide-react";

export const OverviewSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Radio className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white">
          Overview
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Delta is a permissionless staking protocol built on Algorand that enables users to create
          and participate in incentive pools for staking assets and earning rewards.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">What is Delta?</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Delta allows anyone to create staking pools where users can stake assets (single tokens or
          liquidity pool tokens) to earn rewards. Pool creators can configure reward schedules,
          set target APRs, and manage their pools through an intuitive interface.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Key Features</h3>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Permissionless pool creation</li>
          <li>Flexible reward schedules (fixed end date or target APR)</li>
          <li>Support for single-asset and LP token staking</li>
          <li>Real-time APR calculations</li>
          <li>Comprehensive pool management tools</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Getting Started</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          To get started with Delta, connect your Algorand wallet and browse available pools.
          You can stake assets to earn rewards, or create your own pool to incentivize staking
          for your project.
        </p>
      </div>
    </div>
  );
};

