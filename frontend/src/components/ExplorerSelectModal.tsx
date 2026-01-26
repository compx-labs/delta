import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useExplorer, EXPLORERS } from "../context/explorerContext";
import type { ExplorerType } from "../context/explorerContext";
import { useNetwork } from "../context/networkContext";

interface ExplorerSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExplorerSelectModal: React.FC<ExplorerSelectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { selectedExplorer, setSelectedExplorer } = useExplorer();
  const { isTestnet } = useNetwork();

  const handleSelectExplorer = (explorer: ExplorerType) => {
    setSelectedExplorer(explorer);
    // Close modal after a short delay to show selection
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen) return null;

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
            <div className="bg-noise-dark border-2 border-slate-600 cut-corners-lg p-6 shadow-industrial">
              {/* Edge lighting */}
              <div className="absolute inset-0 cut-corners-lg shadow-edge-glow pointer-events-none"></div>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-mono text-xl font-bold text-white uppercase tracking-wide">
                  Select Explorer
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 hover:border-slate-500 cut-corners-sm transition-all duration-150"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Description */}
              <p className="text-slate-300 text-sm font-mono mb-6">
                Choose your preferred blockchain explorer. Links throughout the app will use your selected explorer.
              </p>

              {/* Explorer Options */}
              <div className="space-y-3">
                {Object.values(EXPLORERS).map((explorer) => {
                  const isSelected = selectedExplorer === explorer.id;
                  return (
                    <button
                      key={explorer.id}
                      onClick={() => handleSelectExplorer(explorer.id)}
                      className={`w-full p-4 border-2 cut-corners-sm transition-all duration-150 flex items-center gap-4 ${
                        isSelected
                          ? "bg-cyan-600/20 border-cyan-500 hover:bg-cyan-600/30"
                          : "bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500"
                      }`}
                    >
                      {/* Explorer Logo */}
                      <div
                        className="w-12 h-12 flex items-center justify-center p-2"
                        style={{ backgroundColor: explorer.bgColor }}
                      >
                        <img
                          src={explorer.logo}
                          alt={`${explorer.name} logo`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Explorer Info */}
                      <div className="flex-1 text-left">
                        <h3 className="font-mono font-bold text-white uppercase tracking-wide">
                          {explorer.name}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          {(isTestnet ? explorer.testnetUrl : explorer.mainnetUrl).replace('https://', '')}
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
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

export default ExplorerSelectModal;

