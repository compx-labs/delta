import { TransactionSigner } from "algosdk";
import { TokenFaucetClient } from "./token-faucetClient";
import * as algokit from "@algorandfoundation/algokit-utils";
import { NETWORK_TOKEN, getAlgodServer } from "../../constants/constants";
import type { NetworkType } from "../../context/networkContext";

// Get the current network from localStorage
function getCurrentNetwork(): NetworkType {
  const stored = localStorage.getItem('orbital-preferred-network');
  return (stored as NetworkType) || 'testnet';
}

export async function getExistingClient(
  signer: TransactionSigner,
  activeAddress: string,
  appId: number
): Promise<TokenFaucetClient> {
  const network = getCurrentNetwork();
  
  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(network),
      token: NETWORK_TOKEN,
    },
  });
  algorand.setDefaultValidityWindow(1000);

  const appClient = new TokenFaucetClient({
    algorand, // your AlgorandClient instance
    appId: BigInt(appId), // the application ID
    defaultSender: activeAddress,
    defaultSigner: signer,
  });

  return appClient;
}
