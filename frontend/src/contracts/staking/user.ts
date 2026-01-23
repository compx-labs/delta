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
 * Initializes a staking pool with fixed rewards
 */
export async function initPool({
  address,
  signer,
  appId,
  stakedAssetId,
  rewardAssetId,
  rewardAssetDecimals = 6,
  rewardAmount,
  startTime,
  duration,
  initialBalance,
}: InitPoolParams): Promise<string> {
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
    console.error("Init pool failed:", error);
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
      .initApplicationApr({
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

    const result = await appClient
      .newGroup()
      .stake({
        args: {
          stakeTxn,
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
