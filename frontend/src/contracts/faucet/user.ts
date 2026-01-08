import { getExistingClient } from "./getClientObject";
import { getAlgod } from "../../utils";
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";

export async function getTestTokens(
  address: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransactions: any,
  appId: number
) {
  try {
    const appClient = await getExistingClient(signTransactions, address, appId);
    console.log(appClient);
    appClient.algorand.setSigner(address, signTransactions);
    appClient.algorand.setDefaultSigner(signTransactions);
    const globalState = await appClient.state.global.getAll();
    console.log(globalState);
    const tokenId = globalState.tokenId as bigint;
    let optinRequired = false;
    try {
      await getAlgod().accountAssetInformation(address, tokenId).do();
      optinRequired = false;
    } catch (error) {
      console.error(error);
      optinRequired = true;
    }

    const group = appClient.newGroup();
    if (optinRequired) {
      const optinTx = await appClient.algorand.createTransaction.assetOptIn({
        sender: address,
        assetId: tokenId,
      });
      group.addTransaction(optinTx);
    }
    await group.dripToken({ args: [], maxFee: AlgoAmount.MicroAlgos(250_000) }).send({
      populateAppCallResources: true,
      suppressLog: true,
      coverAppCallInnerTransactionFees: true,
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
}
