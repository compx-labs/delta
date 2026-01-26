import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Globe, FlaskConical } from "lucide-react";
import { useNetwork } from "../context/networkContext";
import type { NetworkType } from "../context/networkContext";

interface NetworkSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NetworkSelectModal: React.FC<NetworkSelectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedNetwork, switchNetwork } = useNetwork();

  const handleSelectNetwork = async (network: NetworkType) => {
    if (network === selectedNetwork) {
      onClose();
      return;
    }
    
    // Close modal first
    onClose();
    
    // Switch network (will reload the page)
    await switchNetwork(network);
  };

  if (!isOpen) return null;

  const networkOptions = [
    {
      id: 'testnet' as NetworkType,
      name: 'Testnet',
      description: 'Test environment with testnet ALGO and assets',
      icon: FlaskConical,
      color: 'purple',
    },
    {
      id: 'mainnet' as NetworkType,
      name: 'Mainnet',
      description: 'Live network with real assets',
      icon: Globe,
      color: 'cyan',
    },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-near-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg mx-4"
          >
            {/* Modal Panel */}
            <div className="bg-near-black border-2 border-mid-grey/30 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-medium text-off-white uppercase tracking-wide">
                  SELECT NETWORK
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-off-white hover:text-near-black border-2 border-mid-grey/30 transition-colors group"
                >
                  <X className="w-5 h-5 text-mid-grey group-hover:text-near-black" />
                </button>
              </div>

              {/* Description */}
              <div className="bg-near-black border-2 border-mid-grey/30 p-4 mb-6">
                <p className="text-white text-sm">
                  ⚠️ Switching networks will reload the application and disconnect your wallet.
                </p>
              </div>

              {/* Network Options */}
              <div className="space-y-3">
                {networkOptions.map((network) => {
                  const isSelected = selectedNetwork === network.id;
                  const Icon = network.icon;
                  
                  return (
                    <button
                      key={network.id}
                      onClick={() => handleSelectNetwork(network.id)}
                      className={`w-full p-4 border-2 transition-all duration-150 flex items-center gap-4 group ${
                        isSelected
                          ? "bg-near-black border-amber hover:bg-off-white hover:text-near-black hover:border-mid-grey/30"
                          : "bg-near-black border-mid-grey/30 hover:bg-off-white hover:text-near-black hover:border-mid-grey/30"
                      }`}
                    >
                      {/* Network Icon */}
                      <div className="w-12 h-12 flex items-center justify-center border-2 border-mid-grey/30 group-hover:border-mid-grey/30 bg-near-black">
                        <Icon className="w-6 h-6 text-off-white hover:text-near-black" />
                      </div>

                      {/* Network Info */}
                      <div className="flex-1 text-left">
                        <h3 className="font-medium text-off-white group-hover:text-near-black uppercase tracking-wide">
                          {network.name.toUpperCase()}
                        </h3>
                        <p className="text-xs text-mid-grey group-hover:text-near-black/70 mt-1">
                          {network.description}
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-accent group-hover:bg-near-black group-hover:border-2 group-hover:border-mid-grey/30">
                          <Check className="w-4 h-4 text-near-black group-hover:text-off-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default NetworkSelectModal;

