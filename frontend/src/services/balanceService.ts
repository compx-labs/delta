import * as algokit from '@algorandfoundation/algokit-utils';
import type { Network } from '../context/networkContext';

export interface AssetBalance {
  assetId: string;
  balance: string; // Raw balance as string
  decimals: number;
  symbol?: string;
  name?: string;
}

export interface AccountBalances {
  algoBalance: string; // ALGO balance in microAlgos
  assets: AssetBalance[];
}

/**
 * Fetch account balances from Algorand indexer
 */
export async function fetchAccountBalances(
  address: string,
  networkConfig: Network
): Promise<AccountBalances> {
  if (!networkConfig.indexerServer) {
    throw new Error('Indexer server not configured for this network');
  }

  try {
    // Create indexer client
    const indexer = algokit.getAlgoIndexerClient({
      server: networkConfig.indexerServer,
      port: '',
      token: '',
    });

    // Fetch account info
    const accountInfo = await indexer.lookupAccountByID(address).do();

    // Extract ALGO balance (in microAlgos)
    const algoBalance = accountInfo.account?.amount?.toString() || '0';

    // Extract asset balances
    const assets: AssetBalance[] = [];
    
    if (accountInfo.account?.assets && Array.isArray(accountInfo.account.assets)) {
      for (const assetHolding of accountInfo.account.assets) {
        // Fetch asset details to get decimals, symbol, name
        try {
          const assetInfo = await indexer.lookupAssetByID(assetHolding.assetId).do();
          const assetParams = assetInfo.asset?.params;
          
          assets.push({
            assetId: assetHolding.assetId.toString(),
            balance: assetHolding.amount.toString(),
            decimals: assetParams?.decimals || 0,
            symbol: assetParams?.unitName || undefined,
            name: assetParams?.name || undefined,
          });
        } catch (error) {
          // If asset lookup fails, still include the balance with minimal info
          console.warn(`Failed to fetch asset ${assetHolding.assetId}:`, error);
          assets.push({
            assetId: assetHolding.assetId.toString(),
            balance: assetHolding.amount.toString(),
            decimals: 0,
          });
        }
      }
    }

    return {
      algoBalance,
      assets,
    };
  } catch (error) {
    console.error('Error fetching account balances:', error);
    throw error;
  }
}

