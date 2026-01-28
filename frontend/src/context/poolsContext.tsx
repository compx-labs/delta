"use client";

import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import * as algokit from "@algorandfoundation/algokit-utils";
import { MasterRepoClient } from "../contracts/staking/master_repoClient";
import { StakingClient } from "../contracts/staking/stakingClient";
import { useNetwork } from "./networkContext";
import { MASTER_REPO_APP_ID, NETWORK_TOKEN, getAlgodServer } from "../constants/constants";

/**
 * Global state information from a staking contract
 */
export interface StakingPoolState {
  appId: bigint;
  stakedAssetId?: bigint;
  rewardAssetId?: bigint;
  totalStaked?: bigint;
  rewardPerToken?: bigint;
  rewardRate?: bigint;
  startTime?: bigint;
  endTime?: bigint;
  lastUpdateTime?: bigint;
  totalRewards?: bigint;
  accruedRewards?: bigint;
  aprBps?: bigint;
  adminAddress?: string;
  superAdminAddress?: string;
  numStakers?: bigint;
  contractVersion?: bigint;
  contractState?: bigint;
  masterRepoApp?: bigint;
  platformFeeBps?: bigint;
  platformFeesAccrued?: bigint;
}

/**
 * Context type for pools data
 */
interface PoolsContextType {
  // Registered contract app IDs from master repo
  registeredAppIds: bigint[];
  // Pool states keyed by appId (as string for Map compatibility)
  poolStates: Map<string, StakingPoolState>;
  // Loading states
  isLoadingMasterRepo: boolean;
  isLoadingPools: boolean;
  // Error states
  masterRepoError: Error | null;
  poolsError: Error | null;
  // Refetch functions
  refetchMasterRepo: () => Promise<any>;
  refetchPools: () => Promise<any>;
}

const PoolsContext = createContext<PoolsContextType | undefined>(undefined);

/**
 * Creates a MasterRepoClient instance for reading state (no signer needed)
 */
function createMasterRepoClient(network: 'testnet' | 'mainnet', appId: number): MasterRepoClient {
  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(network),
      token: NETWORK_TOKEN,
    },
  });
  algorand.setDefaultValidityWindow(1000);

  return new MasterRepoClient({
    algorand,
    appId: BigInt(appId),
  });
}

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

/**
 * Fetches all registered contract app IDs from the master repo
 */
async function fetchRegisteredContracts(
  network: 'testnet' | 'mainnet',
  masterRepoAppId: number
): Promise<bigint[]> {
  const client = createMasterRepoClient(network, masterRepoAppId);
  const registeredContractsMap = await client.state.box.registeredContracts.getMap();
  
  // Convert Map keys to array
  return Array.from(registeredContractsMap.keys());
}

/**
 * Fetches global state for a single staking contract
 */
async function fetchPoolState(
  network: 'testnet' | 'mainnet',
  appId: bigint
): Promise<StakingPoolState> {
  const client = createStakingClient(network, appId);
  const globalState = await client.state.global.getAll();
  
  return {
    appId,
    stakedAssetId: globalState.stakedAssetId,
    rewardAssetId: globalState.rewardAssetId,
    totalStaked: globalState.totalStaked,
    rewardPerToken: globalState.rewardPerToken,
    rewardRate: globalState.rewardRate,
    startTime: globalState.startTime,
    endTime: globalState.endTime,
    lastUpdateTime: globalState.lastUpdateTime,
    totalRewards: globalState.totalRewards,
    accruedRewards: globalState.accruedRewards,
    aprBps: globalState.aprBps,
    adminAddress: globalState.adminAddress,
    superAdminAddress: globalState.superAdminAddress,
    numStakers: globalState.numStakers,
    contractVersion: globalState.contractVersion,
    contractState: globalState.contractState,
    masterRepoApp: globalState.masterRepoApp,
    platformFeeBps: globalState.platformFeeBps,
    platformFeesAccrued: globalState.platformFeesAccrued,
  };
}

/**
 * Fetches global state for all registered staking contracts
 */
async function fetchAllPoolStates(
  network: 'testnet' | 'mainnet',
  appIds: bigint[]
): Promise<Map<string, StakingPoolState>> {
  const poolStatesMap = new Map<string, StakingPoolState>();
  
  // Fetch all pool states in parallel
  const promises = appIds.map(async (appId) => {
    try {
      const state = await fetchPoolState(network, appId);
      return { appId: appId.toString(), state };
    } catch (error) {
      console.error(`Error fetching pool state for appId ${appId}:`, error);
      // Return a minimal state object even if fetch fails
      return {
        appId: appId.toString(),
        state: { appId } as StakingPoolState,
      };
    }
  });
  
  const results = await Promise.all(promises);
  
  results.forEach(({ appId, state }) => {
    poolStatesMap.set(appId, state);
  });
  
  return poolStatesMap;
}

export const PoolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { networkConfig } = useNetwork();
  const network = networkConfig.id;
  
  // Fetch registered contract app IDs from master repo
  const masterRepoAppId = MASTER_REPO_APP_ID ? Number(MASTER_REPO_APP_ID) : undefined;
  
  const {
    data: registeredAppIds = [],
    isLoading: isLoadingMasterRepo,
    error: masterRepoError,
    refetch: refetchMasterRepo,
  } = useQuery<bigint[]>({
    queryKey: ['masterRepo', 'registeredContracts', network, masterRepoAppId],
    queryFn: () => fetchRegisteredContracts(network, masterRepoAppId!),
    enabled: !!masterRepoAppId && !!network && !isNaN(masterRepoAppId),
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch global state for all registered pools
  const {
    data: poolStates = new Map(),
    isLoading: isLoadingPools,
    error: poolsError,
    refetch: refetchPools,
  } = useQuery<Map<string, StakingPoolState>>({
    queryKey: ['pools', 'states', network, registeredAppIds.map(id => id.toString()).join(',')],
    queryFn: () => fetchAllPoolStates(network, registeredAppIds),
    enabled: registeredAppIds.length > 0 && !!network,
    staleTime: 30 * 1000, // Data is fresh for 30 seconds
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false,
  });

  return (
    <PoolsContext.Provider
      value={{
        registeredAppIds,
        poolStates,
        isLoadingMasterRepo,
        isLoadingPools,
        masterRepoError: masterRepoError as Error | null,
        poolsError: poolsError as Error | null,
        refetchMasterRepo,
        refetchPools,
      }}
    >
      {children}
    </PoolsContext.Provider>
  );
};

export const usePools = () => {
  const context = useContext(PoolsContext);
  if (context === undefined) {
    throw new Error('usePools must be used within a PoolsProvider');
  }
  return context;
};
