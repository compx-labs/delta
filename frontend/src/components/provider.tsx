'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { NetworkProvider, NETWORKS } from '../context/networkContext'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Data is fresh for 30 seconds
      gcTime: 10 * 60 * 1000, // Keep data in cache for 10 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
})

// Get the stored network preference, prioritizing user choice in localStorage
const getStoredNetwork = () => {
  // Check localStorage first - user preference takes priority
  const stored = localStorage.getItem('delta-preferred-network');
  if (stored === 'mainnet' || stored === 'testnet') {
    return stored;
  }
  
  // If no user preference, check environment variable as initial default
  const envNetwork = import.meta.env.VITE_NETWORK as string | undefined;
  if (envNetwork && (envNetwork === 'mainnet' || envNetwork === 'testnet')) {
    localStorage.setItem('delta-preferred-network', envNetwork);
    return envNetwork;
  }
  
  // Final fallback to mainnet
  localStorage.setItem('delta-preferred-network', 'mainnet');
  return 'mainnet';
}

const walletManager = new WalletManager({
  wallets: [
    WalletId.DEFLY,
    WalletId.PERA,
    {
      id: WalletId.LUTE,
      options: { siteName: 'https://delta.app' },
    },
  ],
  defaultNetwork: NETWORKS[getStoredNetwork()].walletNetworkId
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <WalletProvider manager={walletManager}>
          {children}
        </WalletProvider>
      </NetworkProvider>
    </QueryClientProvider>
  )
}