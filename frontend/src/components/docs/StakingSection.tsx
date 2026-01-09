import React from "react";
import { Wallet } from "lucide-react";

export const StakingSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Wallet className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          STAKING
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Stake your assets in pools to earn rewards. Staking is permissionless and can be done
          at any time while a pool is active.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">How to Stake</h3>
        <ol className="list-decimal list-inside text-mid-grey space-y-2 mb-6">
          <li>Connect your Algorand wallet</li>
          <li>Browse available pools on the Pools page</li>
          <li>Select a pool you want to stake in</li>
          <li>Review the pool details, APR, and rewards</li>
          <li>Enter the amount you want to stake</li>
          <li>Approve the transaction in your wallet</li>
          <li>Wait for transaction confirmation</li>
        </ol>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Staking Requirements</h3>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>You must have sufficient balance of the stake asset</li>
          <li>You may need to opt-in to the stake asset if it's an ASA</li>
          <li>You may need to opt-in to the reward asset</li>
          <li>Ensure you have ALGO for transaction fees</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Withdrawing Stakes</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          You can withdraw your staked assets at any time. When you withdraw, you'll receive:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Your original staked amount</li>
          <li>Any unclaimed rewards (you may need to claim separately)</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Rewards</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Rewards accumulate over time based on your staked amount and the pool's emission rate.
          You can claim rewards at any time without withdrawing your stake.
        </p>
      </div>
    </div>
  );
};

