import type { Asset } from '../components/AssetSearchComboBox'

/**
 * Placeholder asset service
 * Replace with real backend/indexer integration later
 */

const MOCK_ASSETS: Asset[] = [
  { id: '0', symbol: 'ALGO', name: 'Algorand', decimals: 6 },
  { id: '31566704', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { id: '123456789', symbol: 'xUSD', name: 'xUSD Stablecoin', decimals: 6 },
  { id: '987654321', symbol: 'ALGO/USDC LP', name: 'ALGO/USDC Liquidity Pool', decimals: 6, isLpToken: true },
  { id: '111222333', symbol: 'COMPX', name: 'CompX Token', decimals: 6 },
]

export async function getAssets(query: string): Promise<Asset[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  if (!query.trim()) {
    return []
  }
  
  const lowerQuery = query.toLowerCase()
  
  return MOCK_ASSETS.filter(asset => {
    return (
      asset.symbol.toLowerCase().includes(lowerQuery) ||
      asset.name?.toLowerCase().includes(lowerQuery) ||
      asset.id.includes(query)
    )
  })
}

