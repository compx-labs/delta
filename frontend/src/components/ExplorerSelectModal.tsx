import React from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useExplorer, EXPLORERS } from "../context/explorerContext";
import type { ExplorerType } from "../context/explorerContext";
import { useNetwork } from "../context/networkContext";
import { Button } from "./Button";

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
            <div className="bg-near-black border-2 border-mid-grey/30 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-medium text-off-white uppercase tracking-wide">
                  SELECT EXPLORER
                </h2>
                <Button
                  onClick={onClose}
                  variant="icon"
                  className="p-2"
                >
                  <X className="w-5 h-5 text-mid-grey" />
                </Button>
              </div>

              {/* Description */}
              <p className="text-mid-grey text-sm mb-8 leading-relaxed px-1">
                Choose your preferred blockchain explorer. Links throughout the app will use your selected explorer.
              </p>

              {/* Explorer Options */}
              <div className="space-y-3">
                {Object.values(EXPLORERS).map((explorer) => {
                  const isSelected = selectedExplorer === explorer.id;
                  return (
                    <Button
                      key={explorer.id}
                      onClick={() => handleSelectExplorer(explorer.id)}
                      className={`w-full h-auto py-4 px-7 flex items-center gap-5 text-left ${
                        isSelected
                          ? "bg-near-black border-amber"
                          : "bg-near-black"
                      }`}
                    >
                      {/* Explorer Logo */}
                      <div
                        className="w-12 h-12 flex items-center justify-center p-3 flex-shrink-0"
                        style={{ backgroundColor: explorer.bgColor }}
                      >
                        <img
                          src={explorer.logo}
                          alt={`${explorer.name} logo`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Explorer Info */}
                      <div className="flex-1 min-w-0 py-1.5">
                        <h3 className="font-medium text-off-white uppercase tracking-wide text-sm mb-2">
                          {explorer.name}
                        </h3>
                        <p className="text-xs text-mid-grey leading-relaxed">
                          {(isTestnet ? explorer.testnetUrl : explorer.mainnetUrl).replace('https://', '')}
                        </p>
                      </div>

                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="w-6 h-6 bg-amber rounded-full flex items-center justify-center flex-shrink-0">
                          <Check className="w-4 h-4 text-near-black" />
                        </div>
                      )}
                    </Button>
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

