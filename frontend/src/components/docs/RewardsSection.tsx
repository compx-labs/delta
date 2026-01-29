import React from "react";
import { FileText } from "lucide-react";

export const RewardsSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white">
          Rewards
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Understand how rewards work in Delta pools, including APR calculations and reward
          distribution mechanisms.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Fixed APR Model</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          All Delta pools use a fixed-APR reward model. When creating a pool, the creator sets a target APR at launch and funds a fixed reward balance up front. This gives stakers a predictable yield target and gives creators control over the pool's duration and total rewards budget.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">How Rewards Work</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Rewards accrue continuously over time for all stakers, proportional to their stake and time in the pool:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Your staked amount relative to total staked</li>
          <li>How long you've been staking</li>
          <li>The pool's effective emission rate (which adjusts automatically to maintain the target APR)</li>
        </ul>

        <div className="border-2 border-amber/30 bg-amber/10 p-4 mb-6">
          <p className="text-amber text-sm">
            <strong>Automatic Adjustment:</strong> As total staked changes, the effective emission rate adjusts automatically to keep the target APR. This means the target APR remains constant regardless of how many users stake in the pool.
          </p>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Duration</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Rewards only accrue between the pool's start and end time. Once the end time is reached, no new rewards will be distributed, though you can still claim any accumulated rewards you've earned.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Claiming Rewards</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          You can claim your accumulated rewards at any time without withdrawing your stake.
          Claimed rewards are sent directly to your wallet.
        </p>
      </div>
    </div>
  );
};

