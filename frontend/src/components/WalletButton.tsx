import React, { useContext, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ChevronDown,
  LogOut,
  Copy,
  Droplets,
  Check,
  Globe,
  FlaskConical,
} from "lucide-react";
import { useWallet } from "@txnlab/use-wallet-react";
import { WalletContext } from "../context/wallet";
import FaucetModal from "./FaucetModal";
import ExplorerSelectModal from "./ExplorerSelectModal";
import NetworkSelectModal from "./NetworkSelectModal";
import { useExplorer, EXPLORERS } from "../context/explorerContext";
import { useNetwork } from "../context/networkContext";
import GovernanceRewardsButtons from "./GovernanceRewardsButtons";

const WalletButton: React.FC = () => {
  const { activeAccount, activeWallet } = useWallet();
  const walletContext = useContext(WalletContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFaucetModalOpen, setIsFaucetModalOpen] = useState(false);
  const [isExplorerModalOpen, setIsExplorerModalOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedExplorer } = useExplorer();
  const { isTestnet } = useNetwork();
  
  // Debug: Check if context is available
  useEffect(() => {
    console.log('WalletButton - Context check:', {
      hasContext: !!walletContext,
      hasSetDisplayWalletConnectModal: !!walletContext?.setDisplayWalletConnectModal,
      displayWalletConnectModal: walletContext?.displayWalletConnectModal,
      activeAccount: !!activeAccount,
      activeWallet: !!activeWallet,
    });
  }, [walletContext, activeAccount, activeWallet]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  if (!walletContext?.setDisplayWalletConnectModal) {
    console.error('WalletContext not available. Make sure WalletButton is inside WalletContextProvider.');
    return <div className="text-red-500 text-xs">Wallet Context Error</div>;
  }
  
  const { setDisplayWalletConnectModal, nfdName, nfdAvatar, isLoadingNFD } = walletContext;

  const handleConnect = () => {
    console.log('Connect button clicked');
    if (setDisplayWalletConnectModal) {
      setDisplayWalletConnectModal(true);
      console.log('Modal state set to true');
    } else {
      console.error('setDisplayWalletConnectModal is not available');
    }
  };

  const handleDisconnect = async () => {
    if (activeWallet) {
      try {
        await activeWallet.disconnect();
        setIsDropdownOpen(false);
      } catch (error) {
        console.error("Failed to disconnect wallet:", error);
      }
    }
  };

  const copyAddress = async () => {
    if (activeAccount?.address) {
      try {
        await navigator.clipboard.writeText(activeAccount.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy address:", error);
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDisplayName = (address: string) => {
    // Show loading indicator if NFD is being fetched
    if (isLoadingNFD) {
      return "Loading...";
    }
    
    // Use NFD name if available
    if (nfdName) {
      // Remove .algo suffix if present
      const displayName = nfdName.endsWith('.algo') 
        ? nfdName.slice(0, -5) 
        : nfdName;
      // Truncate long NFD names (keep first 12 chars + ...)
      return displayName.length > 15 ? `${displayName.slice(0, 12)}...` : displayName;
    }
    
    // Fall back to truncated address
    return formatAddress(address);
  };

  const handleFaucet = () => {
    setIsFaucetModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleExplorerSelect = () => {
    setIsExplorerModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleNetworkSelect = () => {
    setIsNetworkModalOpen(true);
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    if (!isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Disconnected state - show connect button
  if (!activeAccount || !activeWallet) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Button clicked directly!');
          handleConnect();
        }}
        onMouseDown={() => {
          console.log('Button mousedown event');
        }}
        className="h-10 px-4 bg-amber text-near-black text-sm font-medium hover:bg-amber/90 transition-colors flex items-center gap-2"
        type="button"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden md:inline">Connect Wallet</span>
      </button>
    );
  }

  // Connected state - show wallet info with dropdown
  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="h-10 px-3 bg-transparent border border-mid-grey/30 text-sm font-medium text-off-white hover:border-amber hover:text-amber transition-colors flex items-center gap-2 relative z-10"
      >
        {/* Wallet/NFD icon */}
        <div className="w-5 h-5 flex items-center justify-center border border-mid-grey/30 overflow-hidden">
          {nfdAvatar ? (
            <img
              src={nfdAvatar}
              alt="NFD Avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<img src="${activeWallet.metadata.icon}" alt="${activeWallet.metadata.name} logo" class="w-4 h-4 object-contain" />`;
              }}
            />
          ) : (
            <img
              src={activeWallet.metadata.icon}
              alt={`${activeWallet.metadata.name} logo`}
              className="w-4 h-4 object-contain"
            />
          )}
        </div>

        {/* Address and wallet name */}
        <div className="hidden md:flex flex-col items-start">
          <span className="text-xs font-medium text-off-white">
            {formatDisplayName(activeAccount.address)}
          </span>
          <span className="text-xs text-mid-grey">
            {activeWallet.metadata.name}
          </span>
        </div>

        {/* Dropdown arrow */}
        <ChevronDown
          className={`w-4 h-4 text-mid-grey transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu using Portal */}
      {createPortal(
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="fixed w-80 z-[9999]"
              style={{
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              }}
            >
              {/* Dropdown Panel */}
              <div className="bg-off-white border border-mid-grey/30 p-4">
                {/* Wallet info header with action buttons */}
                <GovernanceRewardsButtons
                  walletAddress={activeAccount.address}
                  walletIcon={activeWallet.metadata.icon}
                  nfdAvatar={nfdAvatar}
                />

                {/* Address section */}
                <div className="mb-4">
                  <div className="p-3 border border-mid-grey/30 flex items-center gap-3">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-near-black">
                        {formatDisplayName(activeAccount.address)}
                      </span>
                      {nfdName && (
                        <div className="text-xs text-slate-grey mt-1">
                          {formatAddress(activeAccount.address)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={copyAddress}
                      className="p-2 hover:bg-mid-grey/10 border border-mid-grey/30 transition-colors"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-amber" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-grey" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-2">
                  {/* Network Select button */}
                  <button
                    onClick={handleNetworkSelect}
                    className="w-full h-12 px-4 bg-off-white border border-mid-grey/30 hover:border-amber hover:text-amber transition-colors flex items-center gap-3 text-left"
                  >
                    <div className="w-6 h-6 flex items-center justify-center border border-mid-grey/30">
                      {isTestnet ? (
                        <FlaskConical className="w-3 h-3 text-near-black" />
                      ) : (
                        <Globe className="w-3 h-3 text-near-black" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-near-black">
                        Switch Network
                      </p>
                      <p className="text-xs text-slate-grey">
                        Current: {isTestnet ? 'Testnet' : 'Mainnet'}
                      </p>
                    </div>
                  </button>

                  {/* Faucet button - Only show on testnet */}
                  {isTestnet && (
                    <button
                      onClick={handleFaucet}
                      className="w-full h-12 px-4 bg-amber text-near-black hover:bg-amber/90 transition-colors flex items-center gap-3 text-left"
                    >
                      <div className="w-6 h-6 flex items-center justify-center border border-near-black/20">
                        <Droplets className="w-3 h-3 text-near-black" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-near-black">
                          Resource Station
                        </p>
                        <p className="text-xs text-near-black/70">
                          Request testnet resources
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Explorer Select button */}
                  <button
                    onClick={handleExplorerSelect}
                    className="w-full h-12 px-4 bg-off-white border border-mid-grey/30 hover:border-amber hover:text-amber transition-colors flex items-center gap-3 text-left"
                  >
                    <div className="w-6 h-6 flex items-center justify-center border border-mid-grey/30">
                      <img 
                        src={EXPLORERS[selectedExplorer].logo} 
                        alt={EXPLORERS[selectedExplorer].name}
                        className="w-4 h-4 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-near-black">
                        Select Explorer
                      </p>
                      <p className="text-xs text-slate-grey">
                        Current: {EXPLORERS[selectedExplorer].name}
                      </p>
                    </div>
                  </button>

                  {/* Social Icons */}
                  <div className="flex items-center justify-evenly pt-2 pb-2">
                    <a
                      href="https://x.com/compxlabs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 border border-mid-grey/30 text-slate-grey hover:text-amber hover:border-amber transition-colors"
                      title="X (Twitter)"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                          fill="currentColor"
                        />
                      </svg>
                    </a>
                    <a
                      href="https://discord.gg/pSG93C6UN8"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 border border-mid-grey/30 text-slate-grey hover:text-amber hover:border-amber transition-colors"
                      title="Discord"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20.317 4.36a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.111.806-.154 1.17-1.5-.224-2.994-.224-4.478 0a8.18 8.18 0 0 0-.155-1.17.076.076 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 8.074-.32 11.663.099 15.202a.082.082 0 0 0 .031.057c2.03 1.5 3.995 2.407 5.927 3.016a.076.076 0 0 0 .083-.026c.455-.623.885-1.278 1.244-1.966a.075.075 0 0 0-.041-.105 13.229 13.229 0 0 1-1.886-.9.075.075 0 0 1-.008-.126c.126-.094.252-.192.372-.29a.075.075 0 0 1 .078-.01c3.927 1.792 8.18 1.792 12.061 0a.075.075 0 0 1 .078.01c.12.099.246.196.373.29a.075.075 0 0 1-.007.127 12.239 12.239 0 0 1-1.887.899.075.075 0 0 0-.041.105c.363.689.79 1.343 1.243 1.967a.076.076 0 0 0 .083.026c1.937-.61 3.902-1.516 5.932-3.016a.076.076 0 0 0 .032-.057c.5-4.107-.839-7.66-3.549-10.815a.06.06 0 0 0-.031-.026Z"
                          fill="currentColor"
                        />
                      </svg>
                    </a>
                    <a
                      href="https://t.me/compxlabs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 border border-mid-grey/30 text-slate-grey hover:text-amber hover:border-amber transition-colors"
                      title="Telegram"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"
                          fill="currentColor"
                        />
                      </svg>
                    </a>
                    <a
                      href="https://github.com/compx-labs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 border border-mid-grey/30 text-slate-grey hover:text-amber hover:border-amber transition-colors"
                      title="GitHub"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.49.5.09.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10Z"
                          fill="currentColor"
                        />
                      </svg>
                    </a>
                  </div>

                  {/* Disconnect button */}
                  <button
                    onClick={handleDisconnect}
                    className="w-full h-12 px-4 bg-off-white border border-mid-grey/30 hover:border-slate-grey hover:text-slate-grey transition-colors flex items-center gap-3 text-left"
                  >
                    <div className="w-6 h-6 flex items-center justify-center border border-mid-grey/30">
                      <LogOut className="w-3 h-3 text-near-black" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-near-black">
                        Disconnect
                      </p>
                      <p className="text-xs text-slate-grey">
                        Disconnect your wallet
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Faucet Modal */}
      <FaucetModal
        isOpen={isFaucetModalOpen}
        onClose={() => setIsFaucetModalOpen(false)}
        walletAddress={activeAccount?.address}
      />

      {/* Explorer Select Modal */}
      <ExplorerSelectModal
        isOpen={isExplorerModalOpen}
        onClose={() => setIsExplorerModalOpen(false)}
      />

      {/* Network Select Modal */}
      <NetworkSelectModal
        isOpen={isNetworkModalOpen}
        onClose={() => setIsNetworkModalOpen(false)}
      />
    </>
  );
};

export default WalletButton;
