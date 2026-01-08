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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm"
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
            <div className="bg-noise-dark border-2 border-slate-600 cut-corners-lg p-6 shadow-industrial">
              {/* Edge lighting */}
              <div className="absolute inset-0 cut-corners-lg shadow-edge-glow pointer-events-none"></div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-xl font-bold text-white uppercase tracking-wide">
                  Select Network
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 cut-corners-sm transition-all duration-150"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Description */}
              <div className="bg-amber-500/10 border border-amber-500/30 cut-corners-sm p-4 mb-6">
                <p className="text-amber-200 text-sm font-mono">
                  ⚠️ Switching networks will reload the application and disconnect your wallet.
                </p>
              </div>

              {/* Network Options */}
              <div className="space-y-3">
                {networkOptions.map((network) => {
                  const isSelected = selectedNetwork === network.id;
                  const Icon = network.icon;
                  const colorClasses = network.color === 'purple' 
                    ? "bg-purple-600/20 border-purple-500 hover:bg-purple-600/30"
                    : "bg-cyan-600/20 border-cyan-500 hover:bg-cyan-600/30";
                  
                  return (
                    <button
                      key={network.id}
                      onClick={() => handleSelectNetwork(network.id)}
                      className={`w-full p-4 border-2 cut-corners-sm transition-all duration-150 flex items-center gap-4 ${
                        isSelected
                          ? colorClasses
                          : "bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {/* Network Icon */}
                      <div
                        className={`w-12 h-12 flex items-center justify-center border-2 ${
                          network.color === 'purple'
                            ? 'bg-purple-600 border-purple-500'
                            : 'bg-cyan-600 border-cyan-500'
                        }`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Network Info */}
                      <div className="flex-1 text-left">
                        <h3 className="font-mono font-bold text-white uppercase tracking-wide">
                          {network.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {network.description}
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          network.color === 'purple' ? 'bg-purple-500' : 'bg-cyan-500'
                        }`}>
                          <Check className="w-4 h-4 text-white" />
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

