// Environment variables and app constants
// This file centralizes all environment variable access and app configuration

// Network configuration
export const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const IS_TESTNET = NETWORK === 'testnet';
export const IS_DEVELOPMENT = import.meta.env.DEV;  
export const NETWORK_TOKEN = import.meta.env.VITE_NETWORK_TOKEN;

// Master repo app IDs (network-specific)
export const MASTER_REPO_APP_ID_TESTNET = import.meta.env.VITE_MASTER_REPO_APP_TESTNET;
export const MASTER_REPO_APP_ID_MAINNET = import.meta.env.VITE_MASTER_REPO_APP_MAINNET;

// Legacy - keeping for backward compatibility during migration
export const MASTER_REPO_APP_ID = import.meta.env.VITE_MASTER_REPO_APP;

/**
 * Get the master repo app ID for the specified network
 * @param network - 'testnet' or 'mainnet'
 * @returns The master repo app ID for the network, or undefined if not configured
 */
export function getMasterRepoAppId(network: 'testnet' | 'mainnet'): string | undefined {
  return network === 'testnet' 
    ? MASTER_REPO_APP_ID_TESTNET 
    : MASTER_REPO_APP_ID_MAINNET;
}

// API Configuration  
export const DELTA_BACKEND_URL = import.meta.env.VITE_DELTA_BACKEND_URL || 'http://localhost:3001/api';
// Legacy - keeping for backward compatibility during migration
export const GENERAL_BACKEND_URL = import.meta.env.VITE_GENERAL_BACKEND_URL || 'http://localhost:8080/api';

// Network-specific constants
export const ALGORAND_NETWORK = IS_TESTNET ? 'testnet' : 'mainnet';

// Algorand API endpoints (network-aware)
export const ALGOD_SERVER = IS_TESTNET 
  ? 'https://testnet-api.4160.nodely.dev' 
  : 'https://mainnet-api.4160.nodely.dev';

export const INDEXER_SERVER = IS_TESTNET
  ? 'https://testnet-idx.4160.nodely.dev'
  : 'https://mainnet-idx.4160.nodely.dev';

// Helper function to get the appropriate server for a given network
export function getAlgodServer(network: 'testnet' | 'mainnet'): string {
  return network === 'testnet' 
    ? 'https://testnet-api.4160.nodely.dev'
    : 'https://mainnet-api.4160.nodely.dev';
}

export function getIndexerServer(network: 'testnet' | 'mainnet'): string {
  return network === 'testnet'
    ? 'https://testnet-idx.4160.nodely.dev'
    : 'https://mainnet-idx.4160.nodely.dev';
}

export const FLUX_ORACLE_APP_ID = import.meta.env.VITE_FLUX_ORACLE_APP_ID || 1134439922;
console.log("FLUX_ORACLE_APP_ID", FLUX_ORACLE_APP_ID);
// Debug logging
if (IS_DEVELOPMENT) {
  console.log('App Constants:', {
    NETWORK,
    IS_TESTNET,
    IS_DEVELOPMENT,
    DELTA_BACKEND_URL,
    GENERAL_BACKEND_URL,
    ALGORAND_NETWORK,
    ALGOD_SERVER,
    INDEXER_SERVER
  });
}

// Export all environment variables for easy access
export const ENV = {
  NETWORK,
  IS_TESTNET,
  IS_DEVELOPMENT,
  DELTA_BACKEND_URL,
  GENERAL_BACKEND_URL,
  ALGORAND_NETWORK,
  ALGOD_SERVER,
  INDEXER_SERVER
} as const;
