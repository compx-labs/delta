import React, { useState, useEffect } from "react";
import { galaxyCardTypes } from "./galaxy-card-data";
import { getUserFluxTier } from "../contracts/flux/state";
import axios from "axios";

interface GovernanceRewardsButtonsProps {
  walletAddress?: string;
  walletIcon?: string;
  nfdAvatar?: string | null;
}

const GovernanceRewardsButtons: React.FC<GovernanceRewardsButtonsProps> = ({
  walletAddress,
  walletIcon,
  nfdAvatar,
}) => {
  const [galaxyCardImageUrl, setGalaxyCardImageUrl] = useState<string>("");
  const [loadingGalaxyCard, setLoadingGalaxyCard] = useState(false);
  const [fluxTier, setFluxTier] = useState<number>(0);
  const [loadingFluxTier, setLoadingFluxTier] = useState(false);

  // Fetch Galaxy Card data
  useEffect(() => {
    const fetchGalaxyCard = async () => {
      if (!walletAddress) {
        setGalaxyCardImageUrl("");
        return;
      }

      setLoadingGalaxyCard(true);
      try {
        const { data: galaxyCardData } = await axios.get(
          `https://api-general.compx.io/api/galaxy-card/${walletAddress}`
        );
        if (galaxyCardData) {
          const imageUrl =
            galaxyCardTypes.find(
              (card) =>
                card.name === galaxyCardData.name &&
                card.level == galaxyCardData.level
            )?.imageURL || "";
          setGalaxyCardImageUrl(imageUrl);
        }
      } catch (error) {
        console.error("Failed to fetch galaxy card:", error);
        setGalaxyCardImageUrl("");
      } finally {
        setLoadingGalaxyCard(false);
      }
    };

    fetchGalaxyCard();
  }, [walletAddress]);

  // Fetch FLUX tier data
  useEffect(() => {
    const fetchFluxTier = async () => {
      if (!walletAddress) {
        setFluxTier(0);
        return;
      }

      setLoadingFluxTier(true);
      try {
        const tier = await getUserFluxTier(walletAddress);
        setFluxTier(tier);
      } catch (error) {
        console.error("Failed to fetch FLUX tier:", error);
        setFluxTier(0);
      } finally {
        setLoadingFluxTier(false);
      }
    };

    fetchFluxTier();
  }, [walletAddress]);

  return (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-mid-grey/30">
      <div className="w-12 h-12 bg-near-black rounded-full flex items-center justify-center border-2 border-mid-grey/30 overflow-hidden flex-shrink-0">
        {nfdAvatar ? (
          <img
            src={nfdAvatar}
            alt="NFD Avatar"
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              if (walletIcon) {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<img src="${walletIcon}" alt="Wallet logo" class="w-7 h-7 object-contain rounded-full" />`;
              }
            }}
          />
        ) : walletIcon ? (
          <img
            src={walletIcon}
            alt="Wallet logo"
            className="w-7 h-7 object-contain rounded-full"
          />
        ) : null}
      </div>

      {/* Action buttons grid */}
      <div className="flex-1 grid grid-cols-2 gap-2">
        {/* Governance button */}
        <div className="relative group">
          <button
            onClick={() => {
              window.open(
                "https://app.compx.io/governance",
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className="w-full h-14 px-2 py-2 bg-transparent border-2 border-mid-grey/30 hover:border-amber transition-all duration-150 flex flex-col items-center justify-center gap-1"
          >
            {loadingFluxTier ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber border-t-transparent"></div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  <img
                    src="/FLUX-LOGO.png"
                    alt="FLUX"
                    className="w-8 h-8 object-contain rounded-full"
                  />
                  <span className="text-base font-mono font-bold text-off-white uppercase tracking-wide">
                    T-{fluxTier}
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-mid-grey uppercase tracking-wide">
                  GOVERNANCE
                </span>
              </>
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-near-black border-2 border-amber text-off-white text-xs font-mono whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
            Your current FLUX tier
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-2 border-transparent border-b-amber"></div>
          </div>
        </div>

        {/* COMPX Rewards button */}
        <div className="relative group">
          <button
            onClick={() => {
              window.open(
                "https://app.compx.io/compx-rewards",
                "_blank",
                "noopener,noreferrer"
              );
            }}
            className={`w-full h-14 bg-transparent border-2 border-mid-grey/30 hover:border-amber transition-all duration-150 flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
              galaxyCardImageUrl ? "py-2" : "px-2 py-2"
            }`}
          >
            {loadingGalaxyCard ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber border-t-transparent"></div>
            ) : galaxyCardImageUrl ? (
              <>
                <div className="flex-1 flex items-center justify-center">
                  <img
                    src={galaxyCardImageUrl}
                    alt="Galaxy Card"
                    className="h-10 w-auto object-contain"
                  />
                </div>
                <span className="text-[10px] font-mono font-semibold text-mid-grey uppercase tracking-wide">
                  REWARDS
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-mono font-bold text-off-white uppercase tracking-wide text-center">
                  Earn CompX Rewards
                </span>
                <span className="text-[10px] font-mono font-semibold text-mid-grey uppercase tracking-wide">
                  REWARDS
                </span>
              </>
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-near-black border-2 border-amber text-off-white text-xs font-mono whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
            Your current CompX Rewards level
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-2 border-transparent border-b-amber"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GovernanceRewardsButtons;

