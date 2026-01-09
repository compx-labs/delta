import React from "react";
import { Settings } from "lucide-react";

export const ManageSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          MANAGE POOLS
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
          <li>Pool ID and contract reference</li>
          <li>Current status (active, inactive, scheduled)</li>
          <li>Number of stakers</li>
          <li>Current APR</li>
          <li>Remaining rewards</li>
          <li>Schedule start and end times</li>
          <li>Creator address</li>
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

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Pool Management</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          Pool management controls allow you to monitor and manage your pools. Additional
          management features will be available in future updates.
        </p>
      </div>
    </div>
  );
};

