import * as algokit from "@algorandfoundation/algokit-utils";
import type { Asset } from '../components/AssetSearchComboBox'
import type { Network } from '../context/networkContext'

/**
 * Placeholder asset service with network-aware search
 * Uses Algorand indexer when network config is provided
 */

const MOCK_ASSETS: Asset[] = [
  { id: '0', symbol: 'ALGO', name: 'Algorand', decimals: 6 },
  { id: '31566704', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { id: '123456789', symbol: 'xUSD', name: 'xUSD Stablecoin', decimals: 6 },
  { id: '987654321', symbol: 'ALGO/USDC LP', name: 'ALGO/USDC Liquidity Pool', decimals: 6, isLpToken: true },
  { id: '111222333', symbol: 'COMPX', name: 'CompX Token', decimals: 6 },
]

/**
 * Search for assets using the Algorand indexer
 */
async function searchAssetsWithIndexer(
  query: string,
  networkConfig: Network
): Promise<Asset[]> {
  if (!networkConfig.indexerServer) {
    console.warn('Indexer server not configured, falling back to mock data');
    return searchMockAssets(query);
  }

  try {
    const indexer = algokit.getAlgoIndexerClient({
      server: networkConfig.indexerServer,
      port: '',
      token: '',
    });

    const results: Asset[] = [];

    // If query looks like a number/asset ID, try to fetch that specific asset
    if (/^\d+$/.test(query.trim())) {
      try {
        const assetId = parseInt(query.trim(), 10);
        const assetInfo = await indexer.lookupAssetByID(assetId).do();
        const assetParams = assetInfo.asset?.params;

        if (assetParams) {
          results.push({
            id: assetId.toString(),
            symbol: assetParams.unitName || `Asset ${assetId}`,
            name: assetParams.name,
            decimals: assetParams.decimals || 0,
            isLpToken: assetParams.name?.toLowerCase().includes('lp') || 
                      assetParams.unitName?.toUpperCase().includes('LP') || false,
          });
        }
      } catch {
        // Asset not found, continue with search
      }
    }

    // Search by name or unit name (symbol)
    // Note: Indexer search is limited, so we'll search for assets that match
    // For a more comprehensive search, you'd need to use a backend service
    // For now, we'll combine indexer results with mock data
    const mockResults = searchMockAssets(query);
    
    // Merge results, avoiding duplicates
    const existingIds = new Set(results.map(a => a.id));
    mockResults.forEach(asset => {
      if (!existingIds.has(asset.id)) {
        results.push(asset);
      }
    });

    return results.slice(0, 20); // Limit results
  } catch (err) {
    console.error('Error searching assets with indexer:', err);
    // Fall back to mock data on error
    return searchMockAssets(query);
  }
}

/**
 * Search mock assets (fallback)
 */
function searchMockAssets(query: string): Asset[] {
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

/**
 * Get assets - uses indexer if networkConfig is provided, otherwise uses mock data
 */
export async function getAssets(
  query: string,
  networkConfig?: Network
): Promise<Asset[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200))
  
  if (!query.trim()) {
    return []
  }

  if (networkConfig) {
    return searchAssetsWithIndexer(query, networkConfig);
  }

  // Fallback to mock data if no network config
  return searchMockAssets(query);
}

