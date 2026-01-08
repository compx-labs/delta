// Environment variables and app constants
// This file centralizes all environment variable access and app configuration

// Network configuration
export const NETWORK = import.meta.env.VITE_NETWORK || 'mainnet';
export const IS_TESTNET = NETWORK === 'testnet';
export const IS_DEVELOPMENT = import.meta.env.DEV;  
export const NETWORK_TOKEN = import.meta.env.VITE_NETWORK_TOKEN;

// API Configuration
export const ORBITAL_BACKEND_URL = import.meta.env.VITE_ORBITAL_BACKEND_URL || 'http://localhost:3000/api';
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
    ORBITAL_BACKEND_URL,
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
  ORBITAL_BACKEND_URL,
  GENERAL_BACKEND_URL,
  ALGORAND_NETWORK,
  ALGOD_SERVER,
  INDEXER_SERVER
} as const;
