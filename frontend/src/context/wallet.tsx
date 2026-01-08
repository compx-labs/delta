"use client";

import { createContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@txnlab/use-wallet-react";
import { useNetwork } from "./networkContext";
import { fetchAccountBalances, type AccountBalances, type AssetBalance } from "../services/balanceService";

interface WalletContextType {
  address: string;
  setAddress: (value: string) => void;
  displayWalletConnectModal: boolean;
  setDisplayWalletConnectModal: (value: boolean) => void;
  walletConnected: boolean;
  setWalletConnected: (value: boolean) => void;
  // NFD information
  nfdName: string | null;
  nfdAvatar: string | null;
  isLoadingNFD: boolean;
  // Asset balances
  algoBalance: string;
  assets: AssetBalance[];
  isLoadingBalances: boolean;
  balancesError: Error | null;
  refetchBalances: () => void;
}

// NFD data interface
interface NFDData {
  name: string;
  avatar?: string;
}

// NFD fetching function
async function getNFD(address: string): Promise<NFDData | null> {
  const nfdURL = `https://api.nf.domains/nfd/address?address=${address}&limit=1&view=thumbnail`;
  try {
    const nfdURLResponseData = await fetch(nfdURL);
    const nfdURLResponse = await nfdURLResponseData.json();
    
    if (
      !nfdURLResponse ||
      !Array.isArray(nfdURLResponse) ||
      nfdURLResponse.length !== 1
    ) {
      return null;
    }
    
    const nfdBlob = nfdURLResponse[0];
    if (!nfdBlob.depositAccount || nfdBlob.depositAccount !== address) {
      return null;
    }
    
    const nfdData: NFDData = {
      name: nfdBlob.name
    };
    
    // Check for avatar - prioritize userDefined, then verified
    let avatarUrl = null;
    
    // First check userDefined avatar (direct URL)
    if (nfdBlob.properties?.userDefined?.avatar) {
      avatarUrl = nfdBlob.properties.userDefined.avatar;
      console.log('🖼️ Found userDefined avatar:', avatarUrl);
    }
    // Then check verified avatar (IPFS/NFT)
    else if (nfdBlob.properties?.verified?.avatar) {
      const verifiedAvatar = nfdBlob.properties.verified.avatar;
      console.log('🎨 Found verified avatar:', verifiedAvatar);
      
      // Convert IPFS links to HTTP using Algonode
      if (verifiedAvatar.startsWith('ipfs://')) {
        const ipfsHash = verifiedAvatar.replace('ipfs://', '');
        avatarUrl = `https://ipfs.algonode.xyz/ipfs/${ipfsHash}?optimizer=image&width=75`;
        console.log('🔗 Converted IPFS to HTTP:', avatarUrl);
      } else {
        // If it's already an HTTP URL, use as-is
        avatarUrl = verifiedAvatar;
      }
    }
    
    if (avatarUrl) {
      nfdData.avatar = avatarUrl;
    }
    
    console.log('nfdBlob', nfdBlob);
    console.log('✅ NFD found:', nfdData.name, nfdData.avatar ? 'with avatar' : 'no avatar');
    return nfdData;
  } catch (e) {
    console.error('❌ NFD fetch error:', e);
    return null;
  }
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

const WalletContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get actual wallet state from useWallet hook
  const { activeAccount, activeWallet } = useWallet();
  const { networkConfig } = useNetwork();
  
  const [address, setAddress] = useState<string>("");
  const [displayWalletConnectModal, setDisplayWalletConnectModal] =
    useState<boolean>(false);
  const [walletConnected, setWalletConnected] = useState<boolean>(false);

  // NFD information using React Query
  const {
    data: nfdData,
    isLoading: isLoadingNFD,
  } = useQuery({
    queryKey: ['nfd', activeAccount?.address],
    queryFn: () => getNFD(activeAccount?.address || ''),
    enabled: !!activeAccount?.address && !!activeWallet, // Only fetch when we have an active wallet and address
    staleTime: Infinity, // Never refetch automatically
    gcTime: 0, // Don't cache as requested (updated from cacheTime)
  });

  // Asset balances using React Query
  const {
    data: balancesData,
    isLoading: isLoadingBalances,
    error: balancesError,
    refetch: refetchBalances,
  } = useQuery<AccountBalances>({
    queryKey: ['balances', activeAccount?.address, networkConfig.id],
    queryFn: () => fetchAccountBalances(activeAccount?.address || '', networkConfig),
    enabled: !!activeAccount?.address && !!activeWallet && !!networkConfig.indexerServer,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    refetchOnWindowFocus: false,
  });

  return (
    <WalletContext.Provider
      value={{
        address,
        setAddress,
        displayWalletConnectModal,
        setDisplayWalletConnectModal,
        walletConnected,
        setWalletConnected,
        // NFD information
        nfdName: nfdData?.name || null,
        nfdAvatar: nfdData?.avatar || null,
        isLoadingNFD,
        // Asset balances
        algoBalance: balancesData?.algoBalance || '0',
        assets: balancesData?.assets || [],
        isLoadingBalances,
        balancesError: balancesError as Error | null,
        refetchBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export { WalletContext, WalletContextProvider };
