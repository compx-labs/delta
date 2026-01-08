import React, { createContext, useContext, useState } from 'react';
import { useNetwork } from './networkContext';

export type ExplorerType = 'lora' | 'pera' | 'allo' | 'surf';

export interface Explorer {
  id: ExplorerType;
  name: string;
  mainnetUrl: string;
  testnetUrl: string;
  logo: string;
  bgColor: string;
}

export const EXPLORERS: Record<ExplorerType, Explorer> = {
  lora: {
    id: 'lora',
    name: 'Lora',
    mainnetUrl: 'https://lora.algokit.io/mainnet',
    testnetUrl: 'https://lora.algokit.io/testnet',
    logo: '/lora-logo.svg',
    bgColor: '#001424',
  },
  pera: {
    id: 'pera',
    name: 'Pera',
    mainnetUrl: 'https://explorer.perawallet.app',
    testnetUrl: 'https://explorer.perawallet.app/testnet',
    logo: '/pera-logo.svg',
    bgColor: '#FFEE55',
  },
  allo: {
    id: 'allo',
    name: 'Allo',
    mainnetUrl: 'https://allo.info',
    testnetUrl: 'https://testnet.allo.info',
    logo: '/allo-logo.svg',
    bgColor: '#1D3163',
  },
  surf: {
    id: 'surf',
    name: 'Surf',
    mainnetUrl: 'https://algo.surf',
    testnetUrl: 'https://testnet.algo.surf',
    logo: '/surf-logo.svg',
    bgColor: '#6366f1',
  },
};

interface ExplorerContextType {
  selectedExplorer: ExplorerType;
  setSelectedExplorer: (explorer: ExplorerType) => void;
  getExplorerUrl: (type: 'application' | 'transaction' | 'address', id: string | number) => string;
}

const ExplorerContext = createContext<ExplorerContextType | undefined>(undefined);

const STORAGE_KEY = 'delta-preferred-explorer';

export const ExplorerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isTestnet } = useNetwork();
  const [selectedExplorer, setSelectedExplorerState] = useState<ExplorerType>(() => {
    // Load from localStorage on init
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as ExplorerType) || 'lora'; // Default to Lora
  });

  const setSelectedExplorer = (explorer: ExplorerType) => {
    setSelectedExplorerState(explorer);
    localStorage.setItem(STORAGE_KEY, explorer);
  };

  const getExplorerUrl = (type: 'application' | 'transaction' | 'address', id: string | number) => {
    const explorer = EXPLORERS[selectedExplorer];
    const baseUrl = isTestnet ? explorer.testnetUrl : explorer.mainnetUrl;
    return `${baseUrl}/${type}/${id}`;
  };

  return (
    <ExplorerContext.Provider
      value={{
        selectedExplorer,
        setSelectedExplorer,
        getExplorerUrl,
      }}
    >
      {children}
    </ExplorerContext.Provider>
  );
};

export const useExplorer = () => {
  const context = useContext(ExplorerContext);
  if (context === undefined) {
    throw new Error('useExplorer must be used within an ExplorerProvider');
  }
  return context;
};

