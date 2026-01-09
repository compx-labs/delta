import React from "react";
import { TrendingUp } from "lucide-react";

export const CreateSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          CREATE POOL
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Create your own staking pool to incentivize staking of your assets. The pool creation
          wizard guides you through each step of the process.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Step 1: Pool Type</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Choose between a single-asset pool or an LP token pool. Single-asset pools are for
          staking individual tokens, while LP pools are for staking liquidity pool tokens.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Step 2: Assets</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Select the stake asset (what users will stake) and the reward asset (what users will
          earn). You can search for assets by symbol, name, or asset ID.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Step 3: Rewards</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Configure your reward schedule:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-4">
          <li><strong>Total Rewards:</strong> The total amount of reward tokens to distribute</li>
          <li><strong>Start Time:</strong> Start immediately or schedule for later</li>
          <li><strong>End Condition:</strong> Choose between fixed end date or target APR</li>
        </ul>

        <div className="border border-amber/30 bg-amber/10 p-4 mb-6">
          <p className="text-amber text-sm">
            <strong>Note:</strong> APR varies with total staked. Target APR is calculated using
            the assumed TVL you provide.
          </p>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Step 4: Metadata</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Add optional metadata to help users discover your pool:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-4">
          <li>Pool name (required)</li>
          <li>Created by</li>
          <li>Website URL</li>
          <li>Description (max 140 characters)</li>
          <li>Tags (up to 3)</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Step 5: Review</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Review all your pool configuration details before confirming. Once confirmed, you'll
          need to sign transactions to create the pool on-chain.
        </p>
      </div>
    </div>
  );
};

