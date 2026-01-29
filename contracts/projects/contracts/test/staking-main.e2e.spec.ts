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
const SECONDS_PER_YEAR = 31_536_000n;

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
    const aprBps = state.aprBps || 0n;
    const rewardRate = state.rewardRate || 0n;

    const cappedTime = nowTs < end ? nowTs : end;
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

    let currentRate = rewardRate;
    const annualReward = (totalStaked * aprBps) / 10_000n;
    currentRate = annualReward / SECONDS_PER_YEAR;

    let reward = (cappedTime - effectiveLast) * currentRate;
    const remaining = totalRewards - accruedRewards;
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
      decimals: 6,
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
      decimals: 6,
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

    await stakingClient.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        aprBps: 10_200n,
        startTime: 0n,
        duration: DURATION,
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
      args: { app: stakingClient.appId, mbrTxn },
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
    expect(globalState.rewardRate).toEqual(0n);
    expect(globalState.aprBps).toEqual(10_200n);
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

    await restakePool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        aprBps: 10_200n,
        startTime: 0n,
        duration: DURATION,
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

    await variedPool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        aprBps: 10_200n,
        startTime: 0n,
        duration: DURATION,
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

    await removePool.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        aprBps: 10_200n,
        startTime: 0n,
        duration: DURATION,
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
});
