import { useWallet } from "@txnlab/use-wallet-react";
import React, { useContext, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet } from "lucide-react";
import { WalletContext } from "../context/wallet";
import { useNetwork } from "../context/networkContext";

// Helper component for wallet connection message
const WalletConnectionMessage: React.FC = () => {
  const { isTestnet } = useNetwork();
  return (
    <p className="text-sm text-mid-grey">
      Connect your wallet to interact with Delta on Algorand {isTestnet ? 'testnet' : 'mainnet'}
    </p>
  );
};

export const WalletConnectionModal: React.FC = () => {
  const { wallets } = useWallet();
  const walletContext = useContext(WalletContext);
  const { 
    displayWalletConnectModal, 
    setDisplayWalletConnectModal
  } = walletContext;
  
  // Debug logging
  useEffect(() => {
    console.log('WalletConnectionModal - displayWalletConnectModal:', displayWalletConnectModal);
    console.log('WalletConnectionModal - wallets:', wallets?.length);
  }, [displayWalletConnectModal, wallets]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleOnConnect = async (wallet: any) => {
    try {
      await wallet.connect();
      setDisplayWalletConnectModal(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleClose = () => {
    setDisplayWalletConnectModal(false);
  };

  // Don't render if context is not available
  if (!setDisplayWalletConnectModal) {
    console.error('WalletConnectionModal: setDisplayWalletConnectModal not available');
    return null;
  }

  return (
    <AnimatePresence>
      {displayWalletConnectModal && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-near-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Modal container */}
            <div className="relative bg-near-black border border-mid-grey/30 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-off-white" />
                  </div>
                  <h3 className="text-lg font-medium text-off-white">
                    Connect Wallet
                  </h3>
                </div>
                
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-mid-grey/10 transition-colors"
                >
                  <X className="w-5 h-5 text-mid-grey" />
                </button>
              </div>

              {/* Message */}
              <div className="mb-6">
                <WalletConnectionMessage />
              </div>

              {/* Wallet options */}
              <div className="space-y-2 mb-6">
                {wallets?.map((wallet, index) => (
                  <motion.button
                    key={`wallet-${wallet.metadata.name}`}
                    className="group relative w-full"
                    onClick={() => handleOnConnect(wallet)}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    {/* Button content */}
                    <div className="relative bg-near-black border border-mid-grey/30 p-4 hover:border-amber transition-all">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-10 h-10 flex items-center justify-center border border-mid-grey/30">
                            <img
                              src={wallet.metadata.icon}
                              alt={`${wallet.metadata.name} logo`}
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                        </div>
                        
                        <div className="flex-1 text-left">
                          <h4 className="font-medium text-off-white group-hover:text-amber transition-colors">
                            {wallet.metadata.name}
                          </h4>
                          <p className="text-sm text-mid-grey">
                            Connect via {wallet.metadata.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 border border-mid-grey/30 text-off-white hover:border-mid-grey hover:text-mid-grey transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
