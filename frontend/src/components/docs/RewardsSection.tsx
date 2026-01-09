import React from "react";
import { FileText } from "lucide-react";

export const RewardsSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          REWARDS
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Understand how rewards work in Delta pools, including APR calculations and reward
          distribution mechanisms.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">APR (Annual Percentage Rate)</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          APR represents the annualized return on your staked assets. It's calculated based on:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Total rewards available in the pool</li>
          <li>Total value staked in the pool</li>
          <li>Time remaining until rewards are exhausted</li>
        </ul>

        <div className="border border-amber/30 bg-amber/10 p-4 mb-6">
          <p className="text-amber text-sm">
            <strong>Important:</strong> APR is dynamic and changes as more users stake or withdraw
            from the pool. Higher total staked amounts result in lower APR, while lower staked
            amounts result in higher APR.
          </p>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Reward Distribution</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Rewards are distributed continuously based on:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Your staked amount relative to total staked</li>
          <li>The pool's emission rate (rewards per time period)</li>
          <li>How long you've been staking</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Reward Schedules</h3>
        <div className="space-y-4 mb-6">
          <div className="border border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-2">Fixed End Date</h4>
            <p className="text-mid-grey text-sm">
              Rewards are distributed at a constant rate until a specific end date. The emission
              rate is calculated based on total rewards and duration.
            </p>
          </div>
          <div className="border border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-2">Target APR</h4>
            <p className="text-mid-grey text-sm">
              Rewards are distributed to maintain a target APR based on assumed TVL. The actual
              APR will vary based on real staking amounts.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Claiming Rewards</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          You can claim your accumulated rewards at any time without withdrawing your stake.
          Claimed rewards are sent directly to your wallet.
        </p>
      </div>
    </div>
  );
};

