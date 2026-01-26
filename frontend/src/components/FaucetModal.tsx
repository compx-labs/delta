/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Droplets } from "lucide-react";
import { useToast } from "../context/toastContext";
import { getTestTokens } from "../contracts/faucet/user";
import { useWallet } from "@txnlab/use-wallet-react";

interface Token {
  id: string;
  faucetId: number;
  name: string;
  symbol: string;
  image: string;
  description: string;
}

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
}

// Mock token data - replace with real token data
const TESTNET_TOKENS: Token[] = [
  {
    id: "744427912",
    faucetId: 744429238,
    name: "xUSD Testnet",
    symbol: "xUSDt",
    image: "/xUSDt.svg",
    description: "xUSD Testnet",
  },
  {
    id: "744427950",
    faucetId: 744429257,
    name: "CompX Token Testnet",
    symbol: "COMPXt",
    image: "/COMPXt.svg",
    description: "CompX Token Testnet",
  },
  {
    id: "747008852",
    faucetId: 747009258,
    name: "USDC Token Testnet",
    symbol: "USDCt",
    image: "/USDCt-logo.svg",
    description: "USDC Token Testnet",
  },
  {
    id: "747008871",
    faucetId: 747009380,
    name: "goBTC Token Testnet",
    symbol: "goBTCt",
    image: "/goBTCt-logo.svg",
    description: "goBTC Token Testnet",
  },
];

const FaucetModal: React.FC<FaucetModalProps> = ({
  isOpen,
  onClose,
  walletAddress,
}) => {
  const [requestingTokens, setRequestingTokens] = useState<Set<string>>(
    new Set()
  );

  const { activeAddress, signTransactions } = useWallet();
  const { openToast } = useToast();

  const handleTokenRequest = async (token: Token) => {
    if (requestingTokens.has(token.id)) return;

    setRequestingTokens((prev) => new Set(prev).add(token.id));

    try {
      openToast({
        type: "loading",
        message: "Requesting resources...",
        description: `Requesting ${token.symbol} from Resource Station`,
      });

      await getTestTokens(
        activeAddress!,
        signTransactions,
        token.faucetId
      ).then(() => {
        openToast({
          type: "success",
          message: "Resources acquired successfully",
          description: `${token.symbol} resources have been transferred to your wallet`,
        });
      });
    } catch (error: any) {
      console.error(`Failed to request ${token.symbol}:`, error);
      openToast({
        type: "error",
        message: "Failed to acquire resources",
        description:
          error?.message ||
          "An error occurred while requesting resources from Resource Station",
      });
    } finally {
      setRequestingTokens((prev) => {
        const newSet = new Set(prev);
        newSet.delete(token.id);
        return newSet;
      });
    }
  };

  const getButtonState = (token: Token) => {
    if (requestingTokens.has(token.id)) return "requesting";
    return "available";
  };

  const getButtonContent = (token: Token) => {
    const state = getButtonState(token);

    switch (state) {
      case "requesting":
        return (
          <>
            <span>Requesting...</span>
          </>
        );

      default:
        return (
          <>
            <Droplets className="w-4 h-4" />
            <span>Request {token.symbol}</span>
          </>
        );
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          aria-labelledby="faucet-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-900 bg-opacity-90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Modal container */}
            <div className="relative text-slate-600 cut-corners-lg bg-noise-dark border-2 border-slate-600 shadow-industrial overflow-hidden">
              {/* Header */}
              <div className="p-4 md:p-6 border-b-2 border-slate-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center border-2 border-slate-500">
                      <Droplets className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h2
                        id="faucet-modal-title"
                        className="text-lg md:text-xl font-mono font-bold text-white uppercase tracking-wide"
                      >
                        Resource Station
                      </h2>
                      <p className="text-sm text-slate-300 font-mono">
                        Request testnet resources for delta missions
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="group relative p-2 rounded-lg hover:bg-slate-700 transition-all duration-150 border-2 border-slate-600"
                  >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-150" />
                  </button>
                </div>
              </div>

              {/* Wallet info */}
              {walletAddress && (
                <div className="px-4 md:px-6 py-3 bg-slate-800/50 border-b-2 border-slate-600">
                  <p className="text-sm text-slate-300 font-mono">
                    <span className="text-cyan-400 font-medium uppercase tracking-wide">
                      Wallet:
                    </span>{" "}
                    <span className="text-white">
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                    </span>
                  </p>
                </div>
              )}

              {/* Token Grid */}
              <div className="p-4 md:p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TESTNET_TOKENS.map((token, index) => (
                    <motion.div
                      key={token.id}
                      className="relative group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      {/* Token card */}
                      <div className="relative bg-slate-800 border-2 border-slate-600 rounded-lg p-4 hover:border-slate-500 hover:bg-slate-750 transition-all duration-150">
                        {/* Token header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-slate-600 to-slate-700 border-2 border-slate-500 flex items-center justify-center">
                            <img
                              src={token.image}
                              alt={`${token.name} logo`}
                              className="w-6 h-6 object-contain"
                              onError={(e) => {
                                // Fallback to a generic token icon if image fails to load
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-mono font-semibold text-white">
                              {token.symbol}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono">
                              {token.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              ID: {token.id}
                            </p>
                          </div>
                        </div>

                        {/* Request button */}
                        <button
                          onClick={() => handleTokenRequest(token)}
                          disabled={requestingTokens.has(token.id)}
                          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono font-semibold transition-all duration-150 border-2 ${
                            requestingTokens.has(token.id)
                              ? "bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed"
                              : "bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500 hover:border-cyan-400"
                          }`}
                        >
                          {getButtonContent(token)}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 md:px-6 py-4 border-t-2 border-slate-600 bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-mono">
                    Resources are for testnet only and have no real value
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-slate-700 border-2 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white transition-all duration-150 font-mono text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default FaucetModal;
