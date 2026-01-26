import * as algokit from "@algorandfoundation/algokit-utils";
import type { Network } from "../context/networkContext";

export interface AssetInfo {
  id: string;
  symbol: string;
  name?: string;
  decimals: number;
}

/**
 * Fetches asset information from the Algorand indexer
 */
export async function fetchAssetInfo(
  assetId: bigint | number | string,
  networkConfig: Network
): Promise<AssetInfo | null> {
  if (!networkConfig.indexerServer) {
    console.warn('Indexer server not configured');
    return null;
  }

  try {
    const indexer = algokit.getAlgoIndexerClient({
      server: networkConfig.indexerServer,
      port: '',
      token: '',
    });

    const assetInfo = await indexer.lookupAssetByID(Number(assetId)).do();
    const assetParams = assetInfo.asset?.params;

    if (!assetParams) {
      return null;
    }

    return {
      id: assetId.toString(),
      symbol: assetParams.unitName || `Asset ${assetId}`,
      name: assetParams.name,
      decimals: assetParams.decimals || 0,
    };
  } catch (error) {
    console.error(`Error fetching asset ${assetId}:`, error);
    return null;
  }
}

/**
 * Fetches multiple asset information in parallel
 */
export async function fetchMultipleAssetInfo(
  assetIds: (bigint | number | string)[],
  networkConfig: Network
): Promise<Map<string, AssetInfo>> {
  const assetMap = new Map<string, AssetInfo>();

  // Fetch all assets in parallel
  const promises = assetIds.map(async (assetId) => {
    const info = await fetchAssetInfo(assetId, networkConfig);
    if (info) {
      assetMap.set(assetId.toString(), info);
    }
  });

  await Promise.all(promises);
  return assetMap;
}
