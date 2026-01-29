import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount";
import { TransactionSigner } from "algosdk";
import * as algokit from "@algorandfoundation/algokit-utils";
import { StakingClient, StakingFactory } from "./stakingClient";
import { MasterRepoClient } from "./master_repoClient";
import { NETWORK_TOKEN, getAlgodServer } from "../../constants/constants";
import type { NetworkType } from "../../context/networkContext";

const MAX_FEE = AlgoAmount.MicroAlgos(250_000);

// Get the current network from localStorage
function getCurrentNetwork(): NetworkType {
  const stored = localStorage.getItem('delta-preferred-network');
  return (stored as NetworkType) || 'testnet';
}

/**
 * Helper function to get an existing StakingClient instance
 */
export async function getStakingClient(
  signer: TransactionSigner,
  activeAddress: string,
  appId: number
): Promise<StakingClient> {
  const network = getCurrentNetwork();

  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(network),
      token: NETWORK_TOKEN,
    },
  });
  algorand.setDefaultValidityWindow(1000);

  const appClient = new StakingClient({
    algorand,
    appId: BigInt(appId),
    defaultSender: activeAddress,
    defaultSigner: signer,
  });

  return appClient;
}

/**
 * Helper function to get an existing MasterRepoClient instance
 */
export async function getMasterRepoClient(
  signer: TransactionSigner,
  activeAddress: string,
  appId: number
): Promise<MasterRepoClient> {
  const network = getCurrentNetwork();

  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(network),
      token: NETWORK_TOKEN,
    },
  });
  algorand.setDefaultValidityWindow(1000);

  const appClient = new MasterRepoClient({
    algorand,
    appId: BigInt(appId),
    defaultSender: activeAddress,
    defaultSigner: signer,
  });

  return appClient;
}

/**
 * Parameters for creating a staking pool
 */
export interface CreatePoolParams {
  address: string;
  signer: TransactionSigner;
  masterRepoAppId: number;
  adminAddress: string;
}

/**
 * Parameters for initializing a staking pool with fixed rewards
 */
export interface InitPoolParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  stakedAssetId: number;
  rewardAssetId: number;
  rewardAmount: number;
  startTime: number; // Unix timestamp
  duration: number; // Duration in seconds
  initialBalance: number; // Amount in microAlgos
  rewardAssetDecimals?: number;
}

/**
 * Parameters for initializing a staking pool with APR-based rewards
 */
export interface InitPoolAprParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  stakedAssetId: number;
  rewardAssetId: number;
  rewardAmount: number;
  aprBps: number; // APR in basis points
  startTime: number; // Unix timestamp
  duration: number; // Duration in seconds
  initialBalance: number; // Amount in microAlgos
  rewardAssetDecimals?: number;
}

/**
 * Parameters for staking assets
 */
export interface StakeParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  stakedAssetId: number;
  amount: number;
  stakedAssetDecimals: number;
}

/**
 * Parameters for unstaking assets
 */
export interface UnstakeParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  amount: number;
  stakedAssetDecimals: number;
}

/**
 * Parameters for claiming rewards
 */
export interface ClaimRewardsParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
}

/**
 * Parameters for funding rewards to a staking pool
 */
export interface FundRewardsParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  rewardAssetId: number;
  rewardAmount: number;
  rewardAssetDecimals?: number;
}

/**
 * Parameters for funding more rewards to a staking pool (admin only)
 */
export interface FundMoreRewardsParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
  rewardAssetId: number;
  rewardAmount: number;
  rewardAssetDecimals?: number;
}

/**
 * Parameters for removing rewards from a staking pool (admin only)
 */
export interface RemoveRewardsParams {
  address: string;
  signer: TransactionSigner;
  appId: number;
}

/**
 * Creates a new staking pool application
 */
export async function createPool({
  address,
  signer,
  masterRepoAppId,
  adminAddress,
}: CreatePoolParams): Promise<string> {
  try {
    const network = getCurrentNetwork();

    const algorand = algokit.AlgorandClient.fromConfig({
      algodConfig: {
        server: getAlgodServer(network),
        token: NETWORK_TOKEN,
      },
    });
    algorand.setDefaultValidityWindow(1000);
    algorand.setDefaultSigner(signer);

    const factory = new StakingFactory({
      algorand,
      defaultSender: address,
    });

    const result = await factory.send.create.createApplication({
      args: {
        adminAddress,
        masterRepoApp: BigInt(masterRepoAppId),
      },
      sender: address,
      maxFee: MAX_FEE,
    });

    return result.appClient.appId.toString();
  } catch (error) {
    console.error("Create pool failed:", error);
    throw error;
  }
}



/**
 * Initializes a staking pool with APR-based rewards
 */
export async function initPoolApr({
  address,
  signer,
  appId,
  stakedAssetId,
  rewardAssetId,
  rewardAssetDecimals = 6,
  rewardAmount,
  aprBps,
  startTime,
  duration,
  initialBalance,
}: InitPoolAprParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const upscaledRewardAmount = Math.floor(rewardAmount * 10 ** rewardAssetDecimals);

    // Create payment transaction for initial balance
    const initialBalanceTxn = appClient.algorand.createTransaction.payment({
      sender: address,
      receiver: appClient.appAddress,
      amount: AlgoAmount.MicroAlgos(initialBalance),
      note: "Initial pool balance",
      maxFee: MAX_FEE,
    });

    const result = await appClient
      .newGroup()
      .initApplication({
        args: {
          stakedAssetId: BigInt(stakedAssetId),
          rewardAssetId: BigInt(rewardAssetId),
          rewardAmount: BigInt(upscaledRewardAmount),
          aprBps: BigInt(aprBps),
          startTime: BigInt(startTime),
          duration: BigInt(duration),
          initialBalanceTxn,

        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Init pool APR failed:", error);
    throw error;
  }
}

/**
 * Stakes assets into a staking pool
 */
export async function stake({
  address,
  signer,
  appId,
  stakedAssetId,
  amount,
  stakedAssetDecimals,
}: StakeParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const upscaledAmount = Math.floor(amount * 10 ** stakedAssetDecimals);

    // Create asset transfer transaction
    const stakeTxn = appClient.algorand.createTransaction.assetTransfer({
      sender: address,
      receiver: appClient.appAddress,
      assetId: BigInt(stakedAssetId),
      amount: BigInt(upscaledAmount),
      note: "Staking assets",
      maxFee: MAX_FEE,
    });

    const mbrTxn = appClient.algorand.createTransaction.payment({
      sender: address,
      receiver: appClient.appAddress,
      amount: AlgoAmount.MicroAlgos(22_500),
      note: "MBR payment",
      maxFee: MAX_FEE,
    });

    const result = await appClient
      .newGroup()
      .stake({
        args: {
          stakeTxn,
          quantity: BigInt(upscaledAmount),
          mbrTxn,
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Stake failed:", error);
    throw error;
  }
}

/**
 * Unstakes assets from a staking pool
 */
export async function unstake({
  address,
  signer,
  appId,
  amount,
  stakedAssetDecimals,
}: UnstakeParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const upscaledAmount = Math.floor(amount * 10 ** stakedAssetDecimals);

    const result = await appClient
      .newGroup()
      .unstake({
        args: {
          quantity: BigInt(upscaledAmount),
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Unstake failed:", error);
    throw error;
  }
}

/**
 * Funds rewards to a staking pool
 */
export async function fundRewards({
  address,
  signer,
  appId,
  rewardAssetId,
  rewardAmount,
  rewardAssetDecimals = 6,
}: FundRewardsParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const upscaledRewardAmount = Math.floor(rewardAmount * 10 ** rewardAssetDecimals);

    // Create asset transfer transaction for funding rewards
    const rewardFundingTxn = appClient.algorand.createTransaction.assetTransfer({
      sender: address,
      receiver: appClient.appAddress,
      assetId: BigInt(rewardAssetId),
      amount: BigInt(upscaledRewardAmount),
      note: "Funding rewards",
      maxFee: MAX_FEE,
    });

    const result = await appClient
      .newGroup()
      .fundRewards({
        args: {
          rewardFundingTxn,
          rewardAmount: BigInt(upscaledRewardAmount),
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Fund rewards failed:", error);
    throw error;
  }
}

/**
 * Funds more rewards to a staking pool (admin only)
 * This adds additional rewards to an existing pool
 */
export async function fundMoreRewards({
  address,
  signer,
  appId,
  rewardAssetId,
  rewardAmount,
  rewardAssetDecimals = 6,
}: FundMoreRewardsParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const upscaledRewardAmount = Math.floor(rewardAmount * 10 ** rewardAssetDecimals);

    // Create asset transfer transaction for funding more rewards
    const rewardFundingTxn = appClient.algorand.createTransaction.assetTransfer({
      sender: address,
      receiver: appClient.appAddress,
      assetId: BigInt(rewardAssetId),
      amount: BigInt(upscaledRewardAmount),
      note: "Funding more rewards",
      maxFee: MAX_FEE,
    });

    const result = await appClient
      .newGroup()
      .fundMoreRewards({
        args: {
          rewardFundingTxn,
          rewardAmount: BigInt(upscaledRewardAmount),
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Fund more rewards failed:", error);
    throw error;
  }
}

/**
 * Removes rewards from a staking pool (admin only)
 * This allows the admin to withdraw unclaimed rewards
 */
export async function removeRewards({
  address,
  signer,
  appId,
}: RemoveRewardsParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const output = await appClient.send.removeRewards({
      args: [],
      sender: address,
      maxFee: MAX_FEE,
      populateAppCallResources: true,
      coverAppCallInnerTransactionFees: true,
    });

    return output.txIds[0];
  } catch (error) {
    console.error("Remove rewards failed:", error);
    return '';
  }
}

/**
 * Activates a staking pool
 */
export async function setContractActive({
  address,
  signer,
  appId,
}: {
  address: string;
  signer: TransactionSigner;
  appId: number;
}): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const result = await appClient
      .newGroup()
      .setContractActive({
        args: [],
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Set contract active failed:", error);
    throw error;
  }
}

/**
 * Deactivates a staking pool (admin only)
 */
export async function setContractInactive({
  address,
  signer,
  appId,
}: {
  address: string;
  signer: TransactionSigner;
  appId: number;
}): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const result = await appClient
      .newGroup()
      .setContractInactive({
        args: [],
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Set contract inactive failed:", error);
    throw error;
  }
}

/**
 * Registers a staking pool with the master repo
 */
export async function registerPool({
  address,
  signer,
  masterRepoAppId,
  poolAppId,
}: {
  address: string;
  signer: TransactionSigner;
  masterRepoAppId: number;
  poolAppId: number;
}): Promise<string> {
  try {
    const masterRepoClient = await getMasterRepoClient(signer, address, masterRepoAppId);
    masterRepoClient.algorand.setDefaultSigner(signer);

    // Create MBR payment transaction for registration
    const mbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: address,
      receiver: masterRepoClient.appAddress,
      amount: AlgoAmount.MicroAlgos(22_500), // MBR for registration
      note: "Pool registration MBR",
      maxFee: MAX_FEE,
    });

    const result = await masterRepoClient
      .newGroup()
      .registerContract({
        args: {
          app: BigInt(poolAppId),
          mbrTxn,
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Register pool failed:", error);
    throw error;
  }
}

/**
 * Funds rewards and activates pool in a single transaction group
 */
export async function fundRewardsAndActivate({
  address,
  signer,
  poolAppId,
  rewardAssetId,
  rewardAmount,
  rewardAssetDecimals = 6,
}: {
  address: string;
  signer: TransactionSigner;
  poolAppId: number;
  rewardAssetId: number;
  rewardAmount: number;
  rewardAssetDecimals?: number;
}): Promise<string[]> {
  try {
    const stakingClient = await getStakingClient(signer, address, poolAppId);
    stakingClient.algorand.setDefaultSigner(signer);

    const upscaledRewardAmount = Math.floor(rewardAmount * 10 ** rewardAssetDecimals);

    // Create asset transfer transaction for funding rewards
    const rewardFundingTxn = stakingClient.algorand.createTransaction.assetTransfer({
      sender: address,
      receiver: stakingClient.appAddress,
      assetId: BigInt(rewardAssetId),
      amount: BigInt(upscaledRewardAmount),
      note: "Funding rewards",
      maxFee: MAX_FEE,
    });

    // Create a transaction group with fundRewards and setContractActive
    const result = await stakingClient
      .newGroup()
      .fundRewards({
        args: {
          rewardFundingTxn,
          rewardAmount: BigInt(upscaledRewardAmount),
        },
        sender: address,
        maxFee: MAX_FEE,
      })
      .setContractActive({
        args: [],
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds;
  } catch (error) {
    console.error("Fund rewards and activate failed:", error);
    throw error;
  }
}

/**
 * Claims rewards from a staking pool
 */
export async function claimRewards({
  address,
  signer,
  appId,
}: ClaimRewardsParams): Promise<string> {
  try {
    const appClient = await getStakingClient(signer, address, appId);
    appClient.algorand.setDefaultSigner(signer);

    const result = await appClient
      .newGroup()
      .claimRewards({
        args: [],
        sender: address,
        maxFee: MAX_FEE,
      })
      .send({
        suppressLog: false,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
      });

    return result.txIds[0];
  } catch (error) {
    console.error("Claim rewards failed:", error);
    throw error;
  }
}


