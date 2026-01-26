import * as algokit from "@algorandfoundation/algokit-utils";
import { StakingClient } from "../contracts/staking/stakingClient";
import { NETWORK_TOKEN, getAlgodServer } from "../constants/constants";
import type { Network } from "../context/networkContext";
import type { StakeInfoRecord } from "../contracts/staking/stakingClient";

const PRECISION = BigInt(1_000_000_000_000_000); // PRECISION constant from contract (10^15)

/**
 * Creates a StakingClient instance for reading state (no signer needed)
 */
function createStakingClient(network: 'testnet' | 'mainnet', appId: bigint): StakingClient {
  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(network),
      token: NETWORK_TOKEN,
    },
  });
  algorand.setDefaultValidityWindow(1000);

  return new StakingClient({
    algorand,
    appId,
  });
}

export interface UserStakingInfo {
  stakedAmount: bigint;
  rewardDebt: bigint;
  claimableRewards: bigint;
}

/**
 * Fetches user staking information for a specific pool
 */
export async function fetchUserStakingInfo(
  network: 'testnet' | 'mainnet',
  appId: bigint,
  userAddress: string,
  rewardPerToken?: bigint
): Promise<UserStakingInfo | null> {
  try {
    const client = createStakingClient(network, appId);
    
    // Get user's staker record from box state
    const stakerInfo = await client.state.box.stakers.value(userAddress);
    
    if (!stakerInfo || stakerInfo.stake === BigInt(0)) {
      return {
        stakedAmount: BigInt(0),
        rewardDebt: BigInt(0),
        claimableRewards: BigInt(0),
      };
    }

    // If rewardPerToken is not provided, fetch it from global state
    let currentRewardPerToken = rewardPerToken;
    if (!currentRewardPerToken) {
      const globalState = await client.state.global.getAll();
      currentRewardPerToken = globalState.rewardPerToken || BigInt(0);
    }

    // Calculate claimable rewards: (stake * rewardPerToken / PRECISION) - rewardDebt
    const accrued = (stakerInfo.stake * currentRewardPerToken) / PRECISION;
    const claimable = accrued > stakerInfo.rewardDebt ? accrued - stakerInfo.rewardDebt : BigInt(0);

    return {
      stakedAmount: stakerInfo.stake,
      rewardDebt: stakerInfo.rewardDebt,
      claimableRewards: claimable,
    };
  } catch (error) {
    console.error(`Error fetching user staking info for pool ${appId}:`, error);
    return null;
  }
}

/**
 * Formats a bigint amount with decimals
 */
export function formatAmount(amount: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}

/**
 * Parses a string amount to bigint with decimals
 */
export function parseAmount(amount: string, decimals: number = 6): bigint {
  const parts = amount.split('.');
  const whole = parts[0] || '0';
  const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction);
}
