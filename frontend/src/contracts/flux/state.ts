import {
  FLUX_ORACLE_APP_ID,
  NETWORK_TOKEN,
  ALGOD_SERVER,
} from "../../constants/constants";
import { FluxGateClient } from "./flux-gateClient";
import * as algokit from "@algorandfoundation/algokit-utils";
/**
 * Get user's FLUX tier from FluxGate oracle
 * @param userAddress User's Algorand address
 * @returns Tier level (0-4)
 */
export async function getUserFluxTier(userAddress: string): Promise<number> {
  try {
    const algorand = algokit.AlgorandClient.fromConfig({
      algodConfig: {
        server: ALGOD_SERVER,
        token: NETWORK_TOKEN,
      },
    });
    algorand.setDefaultValidityWindow(1000);
    const appClient = new FluxGateClient({
      algorand,
      appId: BigInt(FLUX_ORACLE_APP_ID),
    });

    const record = await appClient.state.box.fluxRecords.value({
      userAddress,
    });

    console.log("record", record);

    if (record) {
      console.log("record.tier", record.tier);
      return Number(record.tier);
    }

    return 0;
  } catch (error) {
    console.error(`Error fetching FLUX tier for ${userAddress}:`, error);
    return 0;
  }
}
