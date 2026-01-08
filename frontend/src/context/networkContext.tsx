/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState } from 'react';
import { NetworkId } from '@txnlab/use-wallet-react';

export type NetworkType = 'mainnet' | 'testnet';

export interface Network {
  id: NetworkType;
  name: string;
  walletNetworkId: NetworkId;
  algodServer: string;
  indexerServer?: string;
}

export const NETWORKS: Record<NetworkType, Network> = {
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    walletNetworkId: NetworkId.TESTNET,
    algodServer: 'https://testnet-api.4160.nodely.dev',
    indexerServer: 'https://testnet-idx.4160.nodely.dev',
  },
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    walletNetworkId: NetworkId.MAINNET,
    algodServer: 'https://mainnet-api.4160.nodely.dev',
    indexerServer: 'https://mainnet-idx.4160.nodely.dev',
  },
};

interface NetworkContextType {
  selectedNetwork: NetworkType;
  setSelectedNetwork: (network: NetworkType) => void;
  isTestnet: boolean;
  networkConfig: Network;
  switchNetwork: (network: NetworkType) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

const STORAGE_KEY = 'delta-preferred-network';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedNetwork, setSelectedNetworkState] = useState<NetworkType>(() => {
    // Check localStorage first - user preference takes priority
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'mainnet' || stored === 'testnet') {
      return stored;
    }
    
    // If no user preference, check environment variable as initial default
    const envNetwork = import.meta.env.VITE_NETWORK as NetworkType | undefined;
    if (envNetwork && (envNetwork === 'mainnet' || envNetwork === 'testnet')) {
      localStorage.setItem(STORAGE_KEY, envNetwork);
      return envNetwork;
    }
    
    // Final fallback to mainnet
    localStorage.setItem(STORAGE_KEY, 'mainnet');
    return 'mainnet';
  });

  const setSelectedNetwork = (network: NetworkType) => {
    setSelectedNetworkState(network);
    localStorage.setItem(STORAGE_KEY, network);
  };

  const switchNetwork = async (network: NetworkType) => {
    if (network === selectedNetwork) return;
    
    // Set the new network
    setSelectedNetwork(network);
    
    // Reload the page to reinitialize wallet manager and clear all cached data
    // This is the safest way to ensure everything is properly reset
    window.location.reload();
  };

  const networkConfig = NETWORKS[selectedNetwork];
  const isTestnet = selectedNetwork === 'testnet';

  return (
    <NetworkContext.Provider
      value={{
        selectedNetwork,
        setSelectedNetwork,
        isTestnet,
        networkConfig,
        switchNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

