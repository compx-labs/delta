/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config, microAlgo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { beforeAll, describe, expect, test } from "vitest";

import { MasterRepoClient } from "../smart_contracts/artifacts/master_repo/master_repoClient";
import { StakingClient } from "../smart_contracts/artifacts/staking/stakingClient";
import algosdk, { Account } from "algosdk";
import { deploy, deployMasterRepo } from "../smart_contracts/staking/deploy";
import { BOX_FEE } from "../smart_contracts/staking/config.algo";
import { consoleLogger } from "@algorandfoundation/algokit-utils/types/logging";

let masterRepoClient: MasterRepoClient;
let stakingClient: StakingClient;

let platformAdmin: Account;
let platformSuperAdmin: Account;
let poolAdmin: Account;

let stakedAssetId = 0n;
let rewardAssetId = 0n;

const INITIAL_PAY_AMOUNT = 400_000n;
const REGISTRY_BOX_FEE = 22_500n;
const PLATFORM_FEE_BPS = 350n;
const REWARD_AMOUNT = 5_000_000n;
const DURATION = 2_000n;
const STAKE_AMOUNT = 10_000_000n;
const NUM_STAKERS = 5;
const MAX_FEE = microAlgo(250_000);
const PRECISION = 1_000_000_000_000_000n;
const STAKED_ASSET_DECIMALS = 6n;
const REWARD_ASSET_DECIMALS = 6n;

describe("staking pools Testing - main flow", () => {
  const localnet = algorandFixture();
  let stakers: Account[] = [];

  const getAssetBalance = async (addr: string, assetId: bigint) => {
    const info = await localnet.context.algorand.client.algod.accountInformation(addr).do();
    const asset = info.assets?.find((a: any) => a.assetId === assetId);
    return asset ? BigInt(asset.amount) : 0n;
  };

  const advanceRounds = async (count: number) => {
    localnet.algorand.setSignerFromAccount(platformAdmin);
    for (let i = 0; i < count; i += 1) {
      await localnet.algorand.send.payment({
        sender: platformAdmin.addr,
        receiver: platformAdmin.addr,
        amount: microAlgo(0),
        note: "tick",
        maxFee: MAX_FEE,
      });
    }
  };

  const getLatestTimestamp = async () => {
    const status = await localnet.context.algorand.client.algod.status().do();
    const lastRound = status.lastRound ?? status.lastRound;
    const block = await localnet.context.algorand.client.algod.block(lastRound).do();
    const ts = block.block?.header.timestamp ?? block.block?.header?.timestamp ?? block["block"]?.header.timestamp;
    return BigInt(ts ?? 0);
  };

  const updatePoolPreview = (state: Awaited<ReturnType<typeof stakingClient.state.global.getAll>>, nowTs: bigint) => {
    const start = state.startTime || 0n;
    const end = state.endTime || 0n;
    const last = state.lastUpdateTime || 0n;
    const totalStaked = state.totalStaked || 0n;
    const rewardPerToken = state.rewardPerToken || 0n;
    const accruedRewards = state.accruedRewards || 0n;
    const totalRewards = state.totalRewards || 0n;
    const rewardsExhausted = state.rewardsExhausted || 0n;

    if (rewardsExhausted === 1n) {
      return {
        rewardPerToken,
        accruedRewards,
        lastUpdateTime: nowTs,
      };
    }

    const cappedTime = nowTs > end ? end : nowTs;
    if (cappedTime <= start) {
      return {
        rewardPerToken,
        accruedRewards,
        lastUpdateTime: cappedTime,
      };
    }

    const effectiveLast = last < start ? start : last;
    if (cappedTime <= effectiveLast) {
      return {
        rewardPerToken,
        accruedRewards,
        lastUpdateTime: cappedTime,
      };
    }

    if (totalStaked === 0n) {
      return {
        rewardPerToken,
        accruedRewards,
        lastUpdateTime: cappedTime,
      };
    }

    const remaining = totalRewards - accruedRewards;
    const remainingTime = end - effectiveLast;
    let reward = ((cappedTime - effectiveLast) * remaining) / remainingTime;
    if (cappedTime === end) reward = remaining;
    if (reward > remaining) reward = remaining;

    if (reward === 0n) {
      return {
        rewardPerToken,
        accruedRewards,
        lastUpdateTime: cappedTime,
      };
    }

    const deltaRPT = (reward * PRECISION) / totalStaked;
    return {
      rewardPerToken: rewardPerToken + deltaRPT,
      accruedRewards: accruedRewards + reward,
      lastUpdateTime: cappedTime,
    };
  };

  const initFundAndActivatePool = async (params: {
    client: StakingClient;
    stakedAssetId: bigint;
    rewardAssetId: bigint;
    rewardAmount: bigint;
    startTime?: bigint;
    endTime?: bigint;
    activate?: boolean;
  }) => {
    const {
      client,
      stakedAssetId: stakeId,
      rewardAssetId: rewardId,
      rewardAmount,
      startTime = 0n,
      endTime,
      activate = true,
    } = params;
    const resolvedEndTime = endTime ?? (await getLatestTimestamp()) + DURATION;

    client.algorand.setSignerFromAccount(poolAdmin);

    const initialBalanceTxn = client.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: client.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = client.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: client.appClient.appAddress,
      assetId: rewardId,
      amount: rewardAmount,
      note: "reward funding",
      maxFee: MAX_FEE,
    });

    await client.send.initApplication({
      args: {
        stakedAssetId: stakeId,
        rewardAssetId: rewardId,
        rewardAmount,
        startTime,
        endTime: resolvedEndTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await client.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    if (activate) {
      await client.send.setContractActive({
        args: {},
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });
    }
  };

  const stakeIntoPool = async (client: StakingClient, staker: Account, amount: bigint) => {
    client.algorand.setSignerFromAccount(staker);

    const stakeTxn = client.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: client.appClient.appAddress,
      assetId: stakedAssetId,
      amount,
      note: "stake helper",
      maxFee: MAX_FEE,
    });

    const mbrTxn = client.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: client.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "box mbr helper",
      maxFee: MAX_FEE,
    });

    await client.send.stake({
      args: {
        stakeTxn,
        quantity: amount,
        mbrTxn,
      },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
  };

  const waitUntilTimestamp = async (target: bigint, maxRounds = 300) => {
    let rounds = 0;
    while ((await getLatestTimestamp()) < target && rounds < maxRounds) {
      await advanceRounds(1);
      rounds += 1;
    }
  };

  // -------------------------------------------------------------------------------------------------
  beforeAll(async () => {
    await localnet.newScope();

    Config.configure({
      debug: true,
    });
    registerDebugEventHandlers();

    platformAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(100_000_000) });
    platformSuperAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(100_000_000) });
    poolAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(100_000_000) });

    masterRepoClient = await deployMasterRepo(platformAdmin, platformSuperAdmin, PLATFORM_FEE_BPS);
    localnet.algorand.setSignerFromAccount(platformAdmin);
    await localnet.algorand.send.payment({
      sender: platformAdmin.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(10_000_000),
      note: "funding master repo",
      maxFee: MAX_FEE,
    });
    masterRepoClient.algorand.setSignerFromAccount(platformAdmin);

    const stakedAsset = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 100_000_000_000n,
      decimals: Number(STAKED_ASSET_DECIMALS),
      defaultFrozen: false,
      unitName: "STAKE",
      assetName: "Stake Token",
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });
    stakedAssetId = stakedAsset.assetId;

    const rewardAsset = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 50_000_000n,
      decimals: Number(REWARD_ASSET_DECIMALS),
      defaultFrozen: false,
      unitName: "RWD",
      assetName: "Reward Token",
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });
    rewardAssetId = rewardAsset.assetId;

    stakingClient = await deploy(poolAdmin, masterRepoClient.appId);

    const initialBalanceTxn = stakingClient.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: stakingClient.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = stakingClient.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: stakingClient.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "reward funding",
      maxFee: MAX_FEE,
    });
    const endTime = (await getLatestTimestamp()) + DURATION;

    await stakingClient.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        startTime: 0n,
        endTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await stakingClient.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount: REWARD_AMOUNT,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const mbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: platformAdmin.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(REGISTRY_BOX_FEE),
      note: "registry mbr",
      maxFee: MAX_FEE,
    });

    await masterRepoClient.send.registerContract({
      args: { app: stakingClient.appId, mbrTxn, contractType: 1n },
      maxFee: MAX_FEE,
      populateAppCallResources: true,
      coverAppCallInnerTransactionFees: true,
    });

    await stakingClient.send.setContractActive({
      args: {},
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    stakers = [];
    for (let i = 0; i < NUM_STAKERS; i += 1) {
      const staker = await localnet.context.generateAccount({ initialFunds: microAlgo(10_000_000) });
      stakers.push(staker);

      localnet.algorand.setSignerFromAccount(staker);
      await localnet.algorand.send.assetOptIn({
        sender: staker.addr,
        assetId: stakedAssetId,
      });
      await localnet.algorand.send.assetOptIn({
        sender: staker.addr,
        assetId: rewardAssetId,
      });

      localnet.algorand.setSignerFromAccount(poolAdmin);
      await localnet.algorand.send.assetTransfer({
        sender: poolAdmin.addr,
        receiver: staker.addr,
        assetId: stakedAssetId,
        amount: STAKE_AMOUNT,
        note: "fund staker",
      });
    }
  }, 30000);

  test("stake, accrue rewards, claim, and unstake", async () => {
    const globalState = await stakingClient.state.global.getAll();
    expect(globalState.contractState).toEqual(1n);
    expect(globalState.totalStaked).toEqual(0n);
    expect(globalState.numStakers).toEqual(0n);
    expect(globalState.accruedRewards).toEqual(0n);
    expect(globalState.rewardPerToken).toEqual(0n);

    let runningTotalStaked = 0n;
    let runningNumStakers = 0n;

    let remainingStaked = BigInt(NUM_STAKERS) * STAKE_AMOUNT;
    let remainingStakers = BigInt(NUM_STAKERS);

    for (const staker of stakers) {
      const beforeStakeState = await stakingClient.state.global.getAll();
      const nowTs = await getLatestTimestamp();
      const preview = updatePoolPreview(beforeStakeState, nowTs);

      stakingClient.algorand.setSignerFromAccount(staker);

      const stakeTxn = stakingClient.algorand.createTransaction.assetTransfer({
        sender: staker.addr,
        receiver: stakingClient.appClient.appAddress,
        assetId: stakedAssetId,
        amount: STAKE_AMOUNT,
        note: "stake",
        maxFee: MAX_FEE,
      });

      const mbrTxn = stakingClient.algorand.createTransaction.payment({
        sender: staker.addr,
        receiver: stakingClient.appClient.appAddress,
        amount: microAlgo(BOX_FEE),
        note: "box mbr",
        maxFee: MAX_FEE,
      });

      await stakingClient.send.stake({
        args: {
          stakeTxn,
          quantity: STAKE_AMOUNT,
          mbrTxn,
        },
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });

      runningTotalStaked += STAKE_AMOUNT;
      runningNumStakers += 1n;

      const afterStake = await stakingClient.state.global.getAll();
      expect(afterStake.rewardPerToken).toEqual(preview.rewardPerToken);
      expect(afterStake.accruedRewards).toEqual(preview.accruedRewards);
      expect(afterStake.lastUpdateTime).toEqual(preview.lastUpdateTime);
      expect(afterStake.totalStaked).toEqual(runningTotalStaked);
      expect(afterStake.numStakers).toEqual(runningNumStakers);

      const stakerKey = algosdk.encodeAddress(staker.addr.publicKey);
      const stakerBox = await stakingClient.state.box.stakers.value(stakerKey);
      expect(stakerBox?.stake).toEqual(STAKE_AMOUNT);
      const expectedDebt = (STAKE_AMOUNT * (afterStake.rewardPerToken ?? 0n)) / PRECISION;
      expect(stakerBox?.rewardDebt).toEqual(expectedDebt);
    }

    const afterStakeState = await stakingClient.state.global.getAll();
    const expectedTotalStaked = BigInt(NUM_STAKERS) * STAKE_AMOUNT;
    expect(afterStakeState.totalStaked).toEqual(expectedTotalStaked);
    expect(afterStakeState.numStakers).toEqual(BigInt(NUM_STAKERS));
    expect(afterStakeState.contractState).toEqual(1n);

    await advanceRounds(50);

    consoleLogger.debug("Claiming rewards and unstaking...");
    consoleLogger.debug("Remaining Staked:", afterStakeState.totalStaked);

    for (const staker of stakers) {
      const rewardBefore = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), rewardAssetId);

      const globalBefore = await stakingClient.state.global.getAll();
      const nowTs = await getLatestTimestamp();
      const preview = updatePoolPreview(globalBefore, nowTs);
      const stakerKey = algosdk.encodeAddress(staker.addr.publicKey);
      const stakerBox = await stakingClient.state.box.stakers.value(stakerKey);
      const stakerStake = stakerBox?.stake ?? 0n;
      const stakerDebt = stakerBox?.rewardDebt ?? 0n;
      const accrued = (stakerStake * preview.rewardPerToken) / PRECISION;
      const expectedPending = accrued > stakerDebt ? accrued - stakerDebt : 0n;
      const platformFeeBps = globalBefore.platformFeeBps ?? 0n;
      const expectedFee = (expectedPending * platformFeeBps) / 10_000n;
      const expectedNet = expectedPending - expectedFee;

      stakingClient.algorand.setSignerFromAccount(staker);
      await stakingClient.send.claimRewards({
        args: {},
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });

      const afterClaimState = await stakingClient.state.global.getAll();
      expect(afterClaimState.accruedRewards).toEqual(preview.accruedRewards);
      expect(afterClaimState.rewardPerToken).toEqual(preview.rewardPerToken);
      expect(afterClaimState.lastUpdateTime).toEqual(preview.lastUpdateTime);
      if (afterClaimState.rewardsPaid !== undefined && globalBefore.rewardsPaid !== undefined) {
        expect(afterClaimState.rewardsPaid).toEqual(globalBefore.rewardsPaid + expectedPending);
      }

      const rewardAfter = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), rewardAssetId);
      expect(rewardAfter).toBeGreaterThan(rewardBefore);
      expect(rewardAfter - rewardBefore).toEqual(expectedNet);

      const stakeBefore = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), stakedAssetId);
      await stakingClient.send.unstake({
        args: { quantity: 0n },
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });

      const afterUnstakeState = await stakingClient.state.global.getAll();
      consoleLogger.debug("Remaining Staked after unstake:", afterUnstakeState.totalStaked);
      remainingStaked -= STAKE_AMOUNT;
      remainingStakers -= 1n;
      consoleLogger.debug("Remaining Staked variable:", remainingStaked);

      expect(afterUnstakeState.totalStaked).toEqual(remainingStaked);
      expect(afterUnstakeState.numStakers).toEqual(remainingStakers);

      const stakeAfter = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), stakedAssetId);
      expect(stakeAfter).toBeGreaterThan(stakeBefore);
    }

    const finalState = await stakingClient.state.global.getAll();
    expect(finalState.totalStaked).toEqual(0n);
    expect(finalState.rewardPerToken).toBeGreaterThan(0n);
  });

  test("staker restake, partial unstake, then full unstake", async () => {
    const staker = stakers[0];
    const stakerAddr = algosdk.encodeAddress(staker.addr.publicKey);

    const restakePool = await deploy(poolAdmin, masterRepoClient.appId);
    restakePool.algorand.setSignerFromAccount(poolAdmin);

    const initialBalanceTxn = restakePool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: restakePool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr - restake test",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = restakePool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: restakePool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "reward funding - restake test",
      maxFee: MAX_FEE,
    });
    const endTime = (await getLatestTimestamp()) + DURATION;

    await restakePool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        startTime: 0n,
        endTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await restakePool.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount: REWARD_AMOUNT,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await restakePool.send.setContractActive({
      args: {},
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    localnet.algorand.setSignerFromAccount(poolAdmin);
    await localnet.algorand.send.assetTransfer({
      sender: poolAdmin.addr,
      receiver: staker.addr,
      assetId: stakedAssetId,
      amount: STAKE_AMOUNT,
      note: "fund staker",
    });

    restakePool.algorand.setSignerFromAccount(staker);
    const firstStakeTxn = restakePool.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: restakePool.appClient.appAddress,
      assetId: stakedAssetId,
      amount: STAKE_AMOUNT,
      note: "stake 1",
      maxFee: MAX_FEE,
    });
    const firstMbrTxn = restakePool.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: restakePool.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "box mbr 1",
      maxFee: MAX_FEE,
    });

    await restakePool.send.stake({
      args: {
        stakeTxn: firstStakeTxn,
        quantity: STAKE_AMOUNT,
        mbrTxn: firstMbrTxn,
      },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    let stateAfterFirst = await restakePool.state.global.getAll();
    expect(stateAfterFirst.totalStaked).toEqual(STAKE_AMOUNT);
    expect(stateAfterFirst.numStakers).toEqual(1n);

    await advanceRounds(3);
    restakePool.algorand.setSignerFromAccount(staker);

    const secondStakeTxn = restakePool.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: restakePool.appClient.appAddress,
      assetId: stakedAssetId,
      amount: STAKE_AMOUNT,
      note: "stake 2",
      maxFee: MAX_FEE,
    });
    const secondMbrTxn = restakePool.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: restakePool.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "box mbr 2",
      maxFee: MAX_FEE,
    });

    await restakePool.send.stake({
      args: {
        stakeTxn: secondStakeTxn,
        quantity: STAKE_AMOUNT,
        mbrTxn: secondMbrTxn,
      },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    let stateAfterSecond = await restakePool.state.global.getAll();
    expect(stateAfterSecond.totalStaked).toEqual(STAKE_AMOUNT * 2n);
    expect(stateAfterSecond.numStakers).toEqual(1n);

    await advanceRounds(3);
    restakePool.algorand.setSignerFromAccount(staker);

    const partialUnstake = STAKE_AMOUNT / 2n;
    await restakePool.send.unstake({
      args: { quantity: partialUnstake },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    let stateAfterPartial = await restakePool.state.global.getAll();
    expect(stateAfterPartial.totalStaked).toEqual(STAKE_AMOUNT * 2n - partialUnstake);
    expect(stateAfterPartial.numStakers).toEqual(1n);

    advanceRounds(3);
    restakePool.algorand.setSignerFromAccount(staker);
    const stakerBoxAfterPartial = await restakePool.state.box.stakers.value(stakerAddr);
    expect(stakerBoxAfterPartial).toBeDefined();
    expect(stakerBoxAfterPartial?.stake).toEqual(STAKE_AMOUNT * 2n - partialUnstake);
    consoleLogger.debug("Staker box after partial unstake:", stakerBoxAfterPartial);

    await restakePool.send.unstake({
      args: { quantity: stakerBoxAfterPartial?.stake ?? 0n },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const stateAfterFull = await restakePool.state.global.getAll();
    expect(stateAfterFull.totalStaked).toEqual(0n);
    expect(stateAfterFull.numStakers).toEqual(0n);

    await expect(restakePool.state.box.stakers.value(stakerAddr)).rejects.toThrowError();
  });

  test("different stake sizes: rewards proportional after 50 rounds", async () => {
    const variedPool = await deploy(poolAdmin, masterRepoClient.appId);
    variedPool.algorand.setSignerFromAccount(poolAdmin);

    const initialBalanceTxn = variedPool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: variedPool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr - varied stakes",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = variedPool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: variedPool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "reward funding - varied stakes",
      maxFee: MAX_FEE,
    });
    const endTime = (await getLatestTimestamp()) + DURATION;

    await variedPool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        startTime: 0n,
        endTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await variedPool.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount: REWARD_AMOUNT,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await variedPool.send.setContractActive({
      args: {},
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const stakePlan = [
      5_000_000n,
      10_000_000n,
      15_000_000n,
      20_000_000n,
      25_000_000n,
    ];

    const variedStakers: Account[] = [];
    for (const amount of stakePlan) {
      const staker = await localnet.context.generateAccount({ initialFunds: microAlgo(10_000_000) });
      variedStakers.push(staker);

      localnet.algorand.setSignerFromAccount(staker);
      await localnet.algorand.send.assetOptIn({
        sender: staker.addr,
        assetId: stakedAssetId,
      });
      await localnet.algorand.send.assetOptIn({
        sender: staker.addr,
        assetId: rewardAssetId,
      });

      localnet.algorand.setSignerFromAccount(poolAdmin);
      await localnet.algorand.send.assetTransfer({
        sender: poolAdmin.addr,
        receiver: staker.addr,
        assetId: stakedAssetId,
        amount,
        note: "fund staker varied",
      });

      variedPool.algorand.setSignerFromAccount(staker);
      const stakeTxn = variedPool.algorand.createTransaction.assetTransfer({
        sender: staker.addr,
        receiver: variedPool.appClient.appAddress,
        assetId: stakedAssetId,
        amount,
        note: "stake varied",
        maxFee: MAX_FEE,
      });
      const mbrTxn = variedPool.algorand.createTransaction.payment({
        sender: staker.addr,
        receiver: variedPool.appClient.appAddress,
        amount: microAlgo(BOX_FEE),
        note: "box mbr varied",
        maxFee: MAX_FEE,
      });

      await variedPool.send.stake({
        args: {
          stakeTxn,
          quantity: amount,
          mbrTxn,
        },
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });
    }

    await advanceRounds(50);

    const platformFeeBps = (await variedPool.state.global.getAll()).platformFeeBps ?? 0n;

    for (let i = 0; i < variedStakers.length; i += 1) {
      const staker = variedStakers[i];
      const stakerAddr = algosdk.encodeAddress(staker.addr.publicKey);
      const stakeAmount = stakePlan[i];

      const globalBefore = await variedPool.state.global.getAll();
      const nowTs = await getLatestTimestamp();
      const preview = updatePoolPreview(globalBefore, nowTs);

      const rewardBefore = await getAssetBalance(stakerAddr, rewardAssetId);
      const stakerBox = await variedPool.state.box.stakers.value(stakerAddr);
      const stakerStake = stakerBox?.stake ?? 0n;
      const stakerDebt = stakerBox?.rewardDebt ?? 0n;

      const accrued = (stakerStake * preview.rewardPerToken) / PRECISION;
      const expectedPending = accrued > stakerDebt ? accrued - stakerDebt : 0n;
      const expectedFee = (expectedPending * platformFeeBps) / 10_000n;
      const expectedNet = expectedPending - expectedFee;

      variedPool.algorand.setSignerFromAccount(staker);
      await variedPool.send.claimRewards({
        args: {},
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });

      const rewardAfter = await getAssetBalance(stakerAddr, rewardAssetId);
      expect(rewardAfter - rewardBefore).toEqual(expectedNet);

      const afterClaimState = await variedPool.state.global.getAll();
      if (afterClaimState.rewardsPaid !== undefined && globalBefore.rewardsPaid !== undefined) {
        expect(afterClaimState.rewardsPaid).toEqual(globalBefore.rewardsPaid + expectedPending);
      }

      const stakeBefore = await getAssetBalance(stakerAddr, stakedAssetId);
      await variedPool.send.unstake({
        args: { quantity: 0n },
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });
      const stakeAfter = await getAssetBalance(stakerAddr, stakedAssetId);
      expect(stakeAfter - stakeBefore).toEqual(stakeAmount);
    }

    const finalState = await variedPool.state.global.getAll();
    expect(finalState.totalStaked).toEqual(0n);
    expect(finalState.numStakers).toEqual(0n);
  });

  test("removeRewards admin-only and returns remaining rewards", async () => {
    const removePool = await deploy(poolAdmin, masterRepoClient.appId);
    removePool.algorand.setSignerFromAccount(poolAdmin);

    const initialBalanceTxn = removePool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: removePool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr - remove rewards",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = removePool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: removePool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "reward funding - remove rewards",
      maxFee: MAX_FEE,
    });
    const endTime = (await getLatestTimestamp()) + DURATION;

    await removePool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        startTime: 0n,
        endTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await removePool.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount: REWARD_AMOUNT,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(2_000_000) });
    removePool.algorand.setSignerFromAccount(outsider);
    await expect(
      removePool.send.removeRewards({
        args: {},
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    removePool.algorand.setSignerFromAccount(poolAdmin);
    const adminAddr = algosdk.encodeAddress(poolAdmin.addr.publicKey);
    const before = await getAssetBalance(adminAddr, rewardAssetId);

    await removePool.send.removeRewards({
      args: {},
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const after = await getAssetBalance(adminAddr, rewardAssetId);
    expect(after - before).toEqual(REWARD_AMOUNT);
  });

  test("init rejects invalid time range and zero reward", async () => {
    const invalidTimePool = await deploy(poolAdmin, masterRepoClient.appId);
    invalidTimePool.algorand.setSignerFromAccount(poolAdmin);

    const baseTs = await getLatestTimestamp();
    const initialBalanceTxn = invalidTimePool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: invalidTimePool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "invalid time init mbr",
      maxFee: MAX_FEE,
    });

    await expect(
      invalidTimePool.send.initApplication({
        args: {
          stakedAssetId,
          rewardAssetId,
          rewardAmount: REWARD_AMOUNT,
          startTime: baseTs + 10n,
          endTime: baseTs + 10n,
          initialBalanceTxn,
        },
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    const zeroRewardPool = await deploy(poolAdmin, masterRepoClient.appId);
    zeroRewardPool.algorand.setSignerFromAccount(poolAdmin);
    const initialBalanceTxn2 = zeroRewardPool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: zeroRewardPool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "zero reward init mbr",
      maxFee: MAX_FEE,
    });

    await expect(
      zeroRewardPool.send.initApplication({
        args: {
          stakedAssetId,
          rewardAssetId,
          rewardAmount: 0n,
          startTime: 0n,
          endTime: baseTs + DURATION,
          initialBalanceTxn: initialBalanceTxn2,
        },
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();
  });

  test("before start has no accrual, end settles all rewards, and post-end stops accrual", async () => {
    const boundaryPool = await deploy(poolAdmin, masterRepoClient.appId);
    const now = await getLatestTimestamp();
    const startTime = now + 120n;
    const endTime = startTime + 120n;
    await initFundAndActivatePool({
      client: boundaryPool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      startTime,
      endTime,
      activate: true,
    });

    const staker = stakers[0];
    await stakeIntoPool(boundaryPool, staker, STAKE_AMOUNT);

    const stakerAddr = algosdk.encodeAddress(staker.addr.publicKey);
    const rewardBefore = await getAssetBalance(stakerAddr, rewardAssetId);
    boundaryPool.algorand.setSignerFromAccount(staker);
    await boundaryPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const rewardAfterBeforeStart = await getAssetBalance(stakerAddr, rewardAssetId);
    expect(rewardAfterBeforeStart).toEqual(rewardBefore);

    const stateBeforeStart = await boundaryPool.state.global.getAll();
    expect(stateBeforeStart.accruedRewards).toEqual(0n);

    await waitUntilTimestamp(endTime + 1n);

    boundaryPool.algorand.setSignerFromAccount(staker);
    await boundaryPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const stateAtEnd = await boundaryPool.state.global.getAll();
    expect(stateAtEnd.accruedRewards).toEqual(stateAtEnd.totalRewards);
    expect(stateAtEnd.rewardsExhausted).toEqual(1n);

    const accruedAtEnd = stateAtEnd.accruedRewards ?? 0n;
    await advanceRounds(5);
    await boundaryPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const stateAfterEnd = await boundaryPool.state.global.getAll();
    expect(stateAfterEnd.accruedRewards).toEqual(accruedAtEnd);
  });

  test("fundMoreRewards works in-period and fails after end", async () => {
    const topupPool = await deploy(poolAdmin, masterRepoClient.appId);
    const now = await getLatestTimestamp();
    const endTime = now + 160n;
    await initFundAndActivatePool({
      client: topupPool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      startTime: 0n,
      endTime,
      activate: true,
    });

    const topUpAmount = 250_000n;
    topupPool.algorand.setSignerFromAccount(poolAdmin);
    const topUpTxn = topupPool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: topupPool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: topUpAmount,
      note: "topup",
      maxFee: MAX_FEE,
    });
    await topupPool.send.fundMoreRewards({
      args: {
        rewardFundingTxn: topUpTxn,
        rewardAmount: topUpAmount,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const afterTopUp = await topupPool.state.global.getAll();
    expect(afterTopUp.totalRewards).toEqual(REWARD_AMOUNT + topUpAmount);

    await waitUntilTimestamp(endTime + 1n);

    const lateTopUpTxn = topupPool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: topupPool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: 1n,
      note: "late topup",
      maxFee: MAX_FEE,
    });
    await expect(
      topupPool.send.fundMoreRewards({
        args: {
          rewardFundingTxn: lateTopUpTxn,
          rewardAmount: 1n,
        },
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();
  });

  test("fundRewards amount mismatch fails", async () => {
    const mismatchPool = await deploy(poolAdmin, masterRepoClient.appId);
    mismatchPool.algorand.setSignerFromAccount(poolAdmin);
    const endTime = (await getLatestTimestamp()) + DURATION;

    const initialBalanceTxn = mismatchPool.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: mismatchPool.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "mismatch init mbr",
      maxFee: MAX_FEE,
    });
    await mismatchPool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        startTime: 0n,
        endTime,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const fundingTxn = mismatchPool.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: mismatchPool.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT - 1n,
      note: "mismatch funding",
      maxFee: MAX_FEE,
    });
    await expect(
      mismatchPool.send.fundRewards({
        args: {
          rewardFundingTxn: fundingTxn,
          rewardAmount: REWARD_AMOUNT - 1n,
        },
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();
  });

  test("setContractInactive blocks stake/claim and allows unstake", async () => {
    const inactivePool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: inactivePool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      activate: true,
    });

    const staker = stakers[1];
    await stakeIntoPool(inactivePool, staker, STAKE_AMOUNT);

    inactivePool.algorand.setSignerFromAccount(poolAdmin);
    await inactivePool.send.setContractInactive({
      args: {},
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    inactivePool.algorand.setSignerFromAccount(staker);
    await expect(
      inactivePool.send.claimRewards({
        args: {},
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    const stakeTxn = inactivePool.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: inactivePool.appClient.appAddress,
      assetId: stakedAssetId,
      amount: 1n,
      note: "inactive stake",
      maxFee: MAX_FEE,
    });
    const mbrTxn = inactivePool.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: inactivePool.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "inactive mbr",
      maxFee: MAX_FEE,
    });
    await expect(
      inactivePool.send.stake({
        args: { stakeTxn, quantity: 1n, mbrTxn },
        sender: staker.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    await inactivePool.send.unstake({
      args: { quantity: 0n },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const after = await inactivePool.state.global.getAll();
    expect(after.totalStaked).toEqual(0n);
  });

  test("admin update + withdrawPlatformFees and access controls", async () => {
    const adminPool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: adminPool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      activate: true,
    });

    const newAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(5_000_000) });
    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(5_000_000) });
    const outsiderAddr = algosdk.encodeAddress(outsider.addr.publicKey);

    adminPool.algorand.setSignerFromAccount(outsider);
    await expect(
      adminPool.send.setContractActive({
        args: {},
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    adminPool.algorand.setSignerFromAccount(poolAdmin);
    await adminPool.send.updateAdminAddress({
      args: { adminAddress: newAdmin.addr.toString() },
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await expect(
      adminPool.send.setContractInactive({
        args: {},
        sender: poolAdmin.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    adminPool.algorand.setSignerFromAccount(newAdmin);
    await adminPool.send.setContractInactive({
      args: {},
      sender: newAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await adminPool.send.setContractActive({
      args: {},
      sender: newAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const staker = stakers[2];
    await stakeIntoPool(adminPool, staker, STAKE_AMOUNT);
    await advanceRounds(8);
    adminPool.algorand.setSignerFromAccount(staker);
    await adminPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    adminPool.algorand.setSignerFromAccount(outsider);
    await expect(
      adminPool.send.withdrawPlatformFees({
        args: { receiver: outsiderAddr },
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    localnet.algorand.setSignerFromAccount(platformSuperAdmin);
    await localnet.algorand.send.assetOptIn({
      sender: platformSuperAdmin.addr,
      assetId: rewardAssetId,
    });
    const superAdminAddr = algosdk.encodeAddress(platformSuperAdmin.addr.publicKey);
    const before = await getAssetBalance(superAdminAddr, rewardAssetId);
    adminPool.algorand.setSignerFromAccount(platformSuperAdmin);
    const globalBefore = await adminPool.state.global.getAll();
    const fees = globalBefore.platformFeesAccrued ?? 0n;
    expect(fees).toBeGreaterThan(0n);
    await adminPool.send.withdrawPlatformFees({
      args: { receiver: superAdminAddr },
      sender: platformSuperAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const after = await getAssetBalance(superAdminAddr, rewardAssetId);
    expect(after - before).toEqual(fees);
    const globalAfter = await adminPool.state.global.getAll();
    expect(globalAfter.platformFeesAccrued).toEqual(0n);
  });

  test("deleteApplication guards and success path", async () => {
    const guardPool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: guardPool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      activate: true,
    });
    const staker = stakers[3];
    await stakeIntoPool(guardPool, staker, STAKE_AMOUNT);

    guardPool.algorand.setSignerFromAccount(platformSuperAdmin);
    await expect(
      guardPool.send.delete.deleteApplication({
        args: {},
        sender: platformSuperAdmin.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      }),
    ).rejects.toThrowError();

    guardPool.algorand.setSignerFromAccount(staker);
    await guardPool.send.unstake({
      args: { quantity: 0n },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    guardPool.algorand.setSignerFromAccount(poolAdmin);
    await guardPool.send.setContractInactive({
      args: {},
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    await guardPool.send.removeRewards({
      args: {},
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const feeReceiver = await localnet.context.generateAccount({ initialFunds: microAlgo(2_000_000) });
    localnet.algorand.setSignerFromAccount(feeReceiver);
    await localnet.algorand.send.assetOptIn({
      sender: feeReceiver.addr,
      assetId: rewardAssetId,
    });
    const guardState = await guardPool.state.global.getAll();
    const feesAccrued = guardState.platformFeesAccrued ?? 0n;
    if (feesAccrued > 0n) {
      guardPool.algorand.setSignerFromAccount(platformSuperAdmin);
      await guardPool.send.withdrawPlatformFees({
        args: { receiver: feeReceiver.addr.toString() },
        sender: platformSuperAdmin.addr,
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: MAX_FEE,
      });
    }

    guardPool.algorand.setSignerFromAccount(platformSuperAdmin);
    await guardPool.send.delete.deleteApplication({
      args: {},
      sender: platformSuperAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
  });

  test("single-asset staking path (stake and reward asset same)", async () => {
    const sameAssetPool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: sameAssetPool,
      stakedAssetId,
      rewardAssetId: stakedAssetId,
      rewardAmount: 1_000_000n,
      activate: true,
    });

    const staker = await localnet.context.generateAccount({ initialFunds: microAlgo(8_000_000) });
    localnet.algorand.setSignerFromAccount(staker);
    await localnet.algorand.send.assetOptIn({ sender: staker.addr, assetId: stakedAssetId });
    localnet.algorand.setSignerFromAccount(poolAdmin);
    await localnet.algorand.send.assetTransfer({
      sender: poolAdmin.addr,
      receiver: staker.addr,
      assetId: stakedAssetId,
      amount: STAKE_AMOUNT,
      note: "fund same asset staker",
    });

    sameAssetPool.algorand.setSignerFromAccount(staker);
    const stakeTxn = sameAssetPool.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: sameAssetPool.appClient.appAddress,
      assetId: stakedAssetId,
      amount: STAKE_AMOUNT,
      note: "same stake",
      maxFee: MAX_FEE,
    });
    const mbrTxn = sameAssetPool.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: sameAssetPool.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "same mbr",
      maxFee: MAX_FEE,
    });
    await sameAssetPool.send.stake({
      args: { stakeTxn, quantity: STAKE_AMOUNT, mbrTxn },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await advanceRounds(10);
    const stakerAddr = algosdk.encodeAddress(staker.addr.publicKey);
    const before = await getAssetBalance(stakerAddr, stakedAssetId);
    await sameAssetPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const after = await getAssetBalance(stakerAddr, stakedAssetId);
    expect(after).toBeGreaterThan(before);
  });

  test("invariants: rewardsPaid accounting and bounds", async () => {
    const invariantPool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: invariantPool,
      stakedAssetId,
      rewardAssetId,
      rewardAmount: REWARD_AMOUNT,
      activate: true,
    });

    const a = stakers[0];
    const b = stakers[1];
    const aAddr = algosdk.encodeAddress(a.addr.publicKey);
    const bAddr = algosdk.encodeAddress(b.addr.publicKey);
    const aBefore = await getAssetBalance(aAddr, rewardAssetId);
    const bBefore = await getAssetBalance(bAddr, rewardAssetId);

    await stakeIntoPool(invariantPool, a, STAKE_AMOUNT);
    await stakeIntoPool(invariantPool, b, STAKE_AMOUNT / 2n);
    await advanceRounds(15);

    invariantPool.algorand.setSignerFromAccount(a);
    await invariantPool.send.claimRewards({
      args: {},
      sender: a.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    invariantPool.algorand.setSignerFromAccount(b);
    await invariantPool.send.claimRewards({
      args: {},
      sender: b.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const aAfter = await getAssetBalance(aAddr, rewardAssetId);
    const bAfter = await getAssetBalance(bAddr, rewardAssetId);
    const netPaid = (aAfter - aBefore) + (bAfter - bBefore);
    const global = await invariantPool.state.global.getAll();

    const paid = global.rewardsPaid ?? 0n;
    const fees = global.platformFeesAccrued ?? 0n;
    const accrued = global.accruedRewards ?? 0n;
    const total = global.totalRewards ?? 0n;

    expect(netPaid + fees).toEqual(paid);
    expect(paid).toBeLessThanOrEqual(accrued);
    expect(accrued).toBeLessThanOrEqual(total);
  });

  test("6 decimal stake and 8 decimal reward asset flow", async () => {
    const stake6 = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 2_000_000_000_000n,
      decimals: 6,
      defaultFrozen: false,
      unitName: "S6",
      assetName: "Stake 6",
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });
    const reward8 = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 2_000_000_000_000n,
      decimals: 8,
      defaultFrozen: false,
      unitName: "R8",
      assetName: "Reward 8",
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });

    const decimalPool = await deploy(poolAdmin, masterRepoClient.appId);
    await initFundAndActivatePool({
      client: decimalPool,
      stakedAssetId: stake6.assetId,
      rewardAssetId: reward8.assetId,
      rewardAmount: 500_000_000n,
      activate: true,
    });

    const staker = await localnet.context.generateAccount({ initialFunds: microAlgo(8_000_000) });
    localnet.algorand.setSignerFromAccount(staker);
    await localnet.algorand.send.assetOptIn({ sender: staker.addr, assetId: stake6.assetId });
    await localnet.algorand.send.assetOptIn({ sender: staker.addr, assetId: reward8.assetId });

    localnet.algorand.setSignerFromAccount(poolAdmin);
    await localnet.algorand.send.assetTransfer({
      sender: poolAdmin.addr,
      receiver: staker.addr,
      assetId: stake6.assetId,
      amount: 50_000_000n,
      note: "fund 6-dec stake token",
    });

    decimalPool.algorand.setSignerFromAccount(staker);
    const stakeTxn = decimalPool.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: decimalPool.appClient.appAddress,
      assetId: stake6.assetId,
      amount: 50_000_000n,
      note: "stake 6/8",
      maxFee: MAX_FEE,
    });
    const mbrTxn = decimalPool.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: decimalPool.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "mbr 6/8",
      maxFee: MAX_FEE,
    });
    await decimalPool.send.stake({
      args: { stakeTxn, quantity: 50_000_000n, mbrTxn },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await advanceRounds(12);
    const stakerAddr = algosdk.encodeAddress(staker.addr.publicKey);
    const rewardBefore = await getAssetBalance(stakerAddr, reward8.assetId);
    await decimalPool.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const rewardAfter = await getAssetBalance(stakerAddr, reward8.assetId);
    expect(rewardAfter).toBeGreaterThan(rewardBefore);
  });
});
