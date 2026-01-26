import React from "react";
import { Droplets } from "lucide-react";

export const FaucetSection: React.FC = () => {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="w-6 h-6 text-amber" />
        <h2 className="text-2xl font-medium text-off-white uppercase tracking-wide">
          RESOURCE STATION
        </h2>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-mid-grey mb-6 leading-relaxed">
          The Resource Station provides free testnet tokens so you can explore all features of
          Delta without using real assets.
        </p>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Available Tokens</h3>
        <p className="text-mid-grey mb-4 leading-relaxed">
          The Resource Station offers testnet tokens for testing:
        </p>
        <ul className="list-disc list-inside text-mid-grey space-y-2 mb-6">
          <li><strong>ALGO:</strong> For transaction fees</li>
          <li><strong>USDCt:</strong> Testnet USDC for testing</li>
          <li><strong>xUSDt:</strong> Testnet xUSD for testing</li>
          <li><strong>COMPXt:</strong> Testnet COMPX tokens</li>
        </ul>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">How to Get Tokens</h3>
        <ol className="list-decimal list-inside text-mid-grey space-y-2 mb-6">
          <li>Connect your Algorand wallet</li>
          <li>Ensure you're on the testnet network</li>
          <li>Navigate to the Resource Station (accessible from wallet dropdown)</li>
          <li>Select the tokens you need</li>
          <li>Click "Request Tokens"</li>
          <li>Approve the transaction in your wallet</li>
          <li>Wait for transaction confirmation</li>
        </ol>

        <div className="border-2 border-amber/30 bg-amber/10 p-4 mb-6">
          <p className="text-amber text-sm">
            <strong>Testnet Only:</strong> These tokens have no real-world value and are for
            testing purposes only. Rate limit: one request every 24 hours per wallet address.
          </p>
        </div>

        <h3 className="text-xl font-medium text-off-white mb-4 mt-8">Getting Started Checklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="border-2 border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-3">For Staking</h4>
            <ul className="list-disc list-inside text-mid-grey text-sm space-y-1">
              <li>Get ALGO for transaction fees</li>
              <li>Get stake asset tokens to stake</li>
              <li>Get reward asset tokens (if creating a pool)</li>
              <li>Browse pools and start staking</li>
            </ul>
          </div>
          <div className="border-2 border-mid-grey/30 p-4">
            <h4 className="text-off-white font-medium mb-3">For Pool Creation</h4>
            <ul className="list-disc list-inside text-mid-grey text-sm space-y-1">
              <li>Get ALGO for transaction fees</li>
              <li>Get reward asset tokens to fund your pool</li>
              <li>Create your pool using the wizard</li>
              <li>Monitor your pool on the Manage page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

