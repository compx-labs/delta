import * as algokit from "@algorandfoundation/algokit-utils";
import { StakingClient } from "../contracts/staking/stakingClient";
import { NETWORK_TOKEN, getAlgodServer } from "../constants/constants";
import type { StakingPoolState } from "../context/poolsContext";

const PRECISION = BigInt(1_000_000_000_000_000); // PRECISION constant from contract (10^15)
const SECONDS_PER_YEAR = BigInt(31_536_000); // Seconds in a year
const pow10 = (decimals: number): bigint => 10n ** BigInt(decimals);

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
  const divisor = pow10(decimals);
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

  return BigInt(whole) * pow10(decimals) + BigInt(fraction);
}

/**
 * Estimates the current rewardPerToken by simulating updatePool() call
 * This mirrors the contract's updatePool() logic
 */
function estimateRewardPerToken(
  poolState: StakingPoolState,
  currentTimestamp: bigint,
  stakedAssetDecimals: number = 6,
  rewardAssetDecimals: number = 6
): bigint {
  const startTime = poolState.startTime || BigInt(0);
  const endTime = poolState.endTime || BigInt(0);
  const lastUpdateTime = poolState.lastUpdateTime || BigInt(0);
  const totalStaked = poolState.totalStaked || BigInt(0);
  const rewardPerToken = poolState.rewardPerToken || BigInt(0);
  const accruedRewards = poolState.accruedRewards || BigInt(0);
  const totalRewards = poolState.totalRewards || BigInt(0);
  const aprBps = poolState.aprBps || BigInt(0);
  const contractState = poolState.contractState || BigInt(0);

  // If contract is not active, return current rewardPerToken
  if (contractState === BigInt(0)) {
    return rewardPerToken;
  }

  // Cap time to end time if we're past it
  const cappedTime = currentTimestamp < endTime ? currentTimestamp : endTime;
  
  // If we haven't started yet, return current rewardPerToken
  if (cappedTime <= startTime) {
    return rewardPerToken;
  }

  // Calculate effective last update time
  const effectiveLast = lastUpdateTime < startTime ? startTime : lastUpdateTime;
  
  // If no time has passed, return current rewardPerToken
  if (cappedTime <= effectiveLast) {
    return rewardPerToken;
  }

  // If no one has staked, return current rewardPerToken
  if (totalStaked === BigInt(0)) {
    return rewardPerToken;
  }

  // Calculate duration since last update
  const duration = cappedTime - effectiveLast;

  // Convert staked units to reward-asset base units so APR math is unit-consistent.
  const scaledTotalStaked =
    rewardAssetDecimals >= stakedAssetDecimals
      ? totalStaked * pow10(rewardAssetDecimals - stakedAssetDecimals)
      : totalStaked / pow10(stakedAssetDecimals - rewardAssetDecimals);

  const annualReward = (scaledTotalStaked * aprBps) / BigInt(10_000);

  // Calculate reward for this duration
  let reward = (duration * annualReward) / SECONDS_PER_YEAR;
  
  // Cap reward by remaining rewards
  const remaining = totalRewards - accruedRewards;
  if (reward > remaining) {
    reward = remaining;
  }

  // If no reward, return current rewardPerToken
  if (reward === BigInt(0)) {
    return rewardPerToken;
  }

  // Calculate delta reward per token: (reward * PRECISION) / totalStaked
  const deltaRPT = (reward * PRECISION) / totalStaked;
  
  // Return estimated reward per token
  return rewardPerToken + deltaRPT;
}

/**
 * Calculates estimated current rewards for a user
 * This simulates what their rewards would be if updatePool() were called right now
 * 
 * @param poolState - Current pool state from contract
 * @param userStakingInfo - User's current staking info (stakedAmount, rewardDebt)
 * @param currentTimestamp - Current Unix timestamp in seconds (optional, defaults to now)
 * @returns Estimated claimable rewards in smallest unit
 */
export function calculateEstimatedRewards(
  poolState: StakingPoolState,
  userStakingInfo: UserStakingInfo,
  currentTimestamp?: bigint,
  stakedAssetDecimals: number = 6,
  rewardAssetDecimals: number = 6
): bigint {
  // Use current timestamp if not provided
  const now = currentTimestamp || BigInt(Math.floor(Date.now() / 1000));
  
  // If user has no stake, return 0
  if (userStakingInfo.stakedAmount === BigInt(0)) {
    return BigInt(0);
  }

  // Estimate what rewardPerToken would be if updatePool() were called now
  const estimatedRewardPerToken = estimateRewardPerToken(poolState, now, stakedAssetDecimals, rewardAssetDecimals);

  // Calculate estimated accrued rewards: (stake * estimatedRewardPerToken / PRECISION)
  const estimatedAccrued = (userStakingInfo.stakedAmount * estimatedRewardPerToken) / PRECISION;

  // Calculate estimated claimable: estimatedAccrued - rewardDebt
  const estimatedClaimable = estimatedAccrued > userStakingInfo.rewardDebt 
    ? estimatedAccrued - userStakingInfo.rewardDebt 
    : BigInt(0);

  return estimatedClaimable;
}

/**
 * Fetches all stakers for a pool
 */
export async function fetchAllStakers(
  network: 'testnet' | 'mainnet',
  appId: bigint
): Promise<Map<string, { stake: bigint; rewardDebt: bigint }>> {
  try {
    const client = createStakingClient(network, appId);
    const stakersMap = await client.state.box.stakers.getMap();
    return stakersMap;
  } catch (error) {
    console.error(`Error fetching stakers for pool ${appId}:`, error);
    return new Map();
  }
}
