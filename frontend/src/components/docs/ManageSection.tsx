import React from "react";
import { Settings } from "lucide-react";

export const ManageSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white">
          Manage pools
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          Manage pools you've created. View pool statistics, monitor stakers, and track reward
          distribution.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Accessing Your Pools</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          To view pools you've created:
        </p>
        <ol className="list-decimal list-inside text-mid-grey space-y-2 mb-6">
          <li>Connect your wallet</li>
          <li>Navigate to the Manage page</li>
          <li>View all pools created by your wallet address</li>
        </ol>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Information</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          For each pool, you can view:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li>Pool App ID (with explorer link)</li>
          <li>Current status (active, inactive, rewards exhausted)</li>
          <li>Number of stakers</li>
          <li>Current APR</li>
          <li>Remaining rewards</li>
          <li>Estimated end date (calculated from remaining rewards)</li>
          <li>Creator address (with NFD lookup and explorer link)</li>
          <li>Pool metadata (name, website, description, tags)</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Filtering Pools</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Use filters to find specific pools:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li><strong>Status:</strong> Filter by active, inactive, or all pools</li>
          <li><strong>Type:</strong> Filter by single-asset, LP, or all types</li>
          <li><strong>Search:</strong> Search by pool name or asset symbol</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Management Actions</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          When viewing a specific pool, you have access to the following management actions:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li><strong>Activate/Deactivate Pool:</strong> Control whether the pool is accepting new stakes. Only inactive pools can have rewards removed.</li>
          <li><strong>Remove Rewards:</strong> Withdraw remaining rewards from an inactive pool. This action is only available when the pool is inactive.</li>
          <li><strong>Add More Rewards:</strong> Fund additional rewards to extend the pool's duration. This increases the estimated end date based on the current APR and TVL.</li>
          <li><strong>Update Metadata:</strong> Edit pool name, website URL, description, and tags to help users discover your pool.</li>
        </ul>

        <div className="border-2 border-amber/30 bg-amber/10 p-4 mb-6">
          <p className="text-amber text-sm">
            <strong>Rewards Exhausted:</strong> Pools automatically show a "Rewards Exhausted" badge when all rewards have been distributed. These pools cannot accept new stakes but existing stakers can still claim their accumulated rewards.
          </p>
        </div>
      </div>
    </div>
  );
};

