import { Config, microAlgo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { beforeAll, describe, expect, test } from "vitest";
import algosdk, { Account } from "algosdk";

import { MasterRepoClient } from "../smart_contracts/artifacts/master_repo/master_repoClient";
import { StakingClient } from "../smart_contracts/artifacts/staking/stakingClient";
import { BOX_FEE, INITIAL_PAY_AMOUNT, PRECISION } from "../smart_contracts/staking/config.algo";
import { deploy, deployMasterRepo } from "../smart_contracts/staking/deploy";

const MAX_FEE = microAlgo(250_000);
const PLATFORM_FEE_BPS = 0n;
const APR_BPS = 500n;
const SECONDS_PER_YEAR = 31_536_000n;

describe("staking pools - decimals e2e", () => {
  const localnet = algorandFixture();
  let platformAdmin: Account;
  let platformSuperAdmin: Account;
  let poolAdmin: Account;
  let masterRepoClient: MasterRepoClient;

  const getAssetBalance = async (addr: string, assetId: bigint) => {
    const info = await localnet.context.algorand.client.algod.accountInformation(addr).do();
    const asset = info.assets?.find((a: any) => a.assetId === assetId);
    return asset ? BigInt(asset.amount) : 0n;
  };

  const getLatestTimestamp = async () => {
    const status = await localnet.context.algorand.client.algod.status().do();
    const block = await localnet.context.algorand.client.algod.block(status.lastRound).do();
    const ts = block.block?.header.timestamp ?? block.block?.header?.timestamp ?? 0;
    return BigInt(ts);
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

  const expectedReward = (args: {
    durationSec: bigint;
    totalStaked: bigint;
    aprBps: bigint;
    stakeDecimals: number;
    rewardDecimals: number;
  }) => {
    const { durationSec, totalStaked, aprBps, stakeDecimals, rewardDecimals } = args;
    const scaleNum = rewardDecimals >= stakeDecimals ? 10n ** BigInt(rewardDecimals - stakeDecimals) : 1n;
    const scaleDen = rewardDecimals >= stakeDecimals ? 1n : 10n ** BigInt(stakeDecimals - rewardDecimals);
    const scaledTotalStaked = (totalStaked * scaleNum) / scaleDen;
    const annualReward = (scaledTotalStaked * aprBps) / 10_000n;
    return (durationSec * annualReward) / SECONDS_PER_YEAR;
  };

  beforeAll(async () => {
    await localnet.newScope();
    Config.configure({ debug: true });
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
  }, 30000);

  test.each([
    { name: "reward decimals > stake decimals", stakeDecimals: 6, rewardDecimals: 8 },
    { name: "reward decimals < stake decimals", stakeDecimals: 8, rewardDecimals: 6 },
  ])("$name accrues non-zero rewards for small stake", async ({ stakeDecimals, rewardDecimals }) => {
    const stakedAsset = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 1_000_000_000_000n,
      decimals: stakeDecimals,
      defaultFrozen: false,
      unitName: "STK",
      assetName: `Stake ${stakeDecimals}`,
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });
    const stakedAssetId = stakedAsset.assetId;

    const rewardAsset = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 10_000_000_000n,
      decimals: rewardDecimals,
      defaultFrozen: false,
      unitName: "RWD",
      assetName: `Reward ${rewardDecimals}`,
      manager: poolAdmin.addr,
      reserve: poolAdmin.addr,
    });
    const rewardAssetId = rewardAsset.assetId;

    const stakingClient: StakingClient = await deploy(poolAdmin, masterRepoClient.appId);
    stakingClient.algorand.setSignerFromAccount(poolAdmin);

    const initialBalanceTxn = stakingClient.algorand.createTransaction.payment({
      sender: poolAdmin.addr,
      receiver: stakingClient.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr",
      maxFee: MAX_FEE,
    });

    const rewardAmount = 1_000_000_000n;
    const rewardFundingTxn = stakingClient.algorand.createTransaction.assetTransfer({
      sender: poolAdmin.addr,
      receiver: stakingClient.appClient.appAddress,
      assetId: rewardAssetId,
      amount: rewardAmount,
      note: "reward funding",
      maxFee: MAX_FEE,
    });

    await stakingClient.send.initApplication({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount,
        aprBps: APR_BPS,
        startTime: 0n,
        duration: 2_592_000n,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await stakingClient.send.fundRewards({
      args: { rewardFundingTxn, rewardAmount },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await stakingClient.send.setContractActive({
      args: {},
      maxFee: MAX_FEE,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
    });

    const staker = await localnet.context.generateAccount({ initialFunds: microAlgo(10_000_000) });
    const stakeHuman = 15n;
    const stakeAmount = stakeHuman * 10n ** BigInt(stakeDecimals);

    await localnet.context.algorand.send.assetOptIn({
      sender: staker.addr,
      assetId: stakedAssetId,
      maxFee: MAX_FEE,
    });
    await localnet.context.algorand.send.assetOptIn({
      sender: staker.addr,
      assetId: rewardAssetId,
      maxFee: MAX_FEE,
    });
    await localnet.context.algorand.send.assetTransfer({
      sender: poolAdmin.addr,
      receiver: staker.addr,
      assetId: stakedAssetId,
      amount: stakeAmount,
      maxFee: MAX_FEE,
    });

    stakingClient.algorand.setSignerFromAccount(staker);

    const stakeTxn = stakingClient.algorand.createTransaction.assetTransfer({
      sender: staker.addr,
      receiver: stakingClient.appClient.appAddress,
      assetId: stakedAssetId,
      amount: stakeAmount,
      note: "stake",
      maxFee: MAX_FEE,
    });
    const mbrTxn = stakingClient.algorand.createTransaction.payment({
      sender: staker.addr,
      receiver: stakingClient.appClient.appAddress,
      amount: microAlgo(BOX_FEE),
      note: "mbr",
      maxFee: MAX_FEE,
    });

    const beforeStakeTs = await getLatestTimestamp();
    await stakingClient.send.stake({
      args: { stakeTxn, quantity: stakeAmount, mbrTxn },
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await advanceRounds(20);

    const rewardBefore = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), rewardAssetId);
    const claimTs = await getLatestTimestamp();
    const duration = claimTs > beforeStakeTs ? claimTs - beforeStakeTs : 0n;
    const minExpected = expectedReward({
      durationSec: duration,
      totalStaked: stakeAmount,
      aprBps: APR_BPS,
      stakeDecimals,
      rewardDecimals,
    });

    await stakingClient.send.claimRewards({
      args: {},
      sender: staker.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });
    const rewardAfter = await getAssetBalance(algosdk.encodeAddress(staker.addr.publicKey), rewardAssetId);
    const paid = rewardAfter - rewardBefore;

    const globalState = await stakingClient.state.global.getAll();
    const stakerBox = await stakingClient.state.box.stakers.value(algosdk.encodeAddress(staker.addr.publicKey));
    const accrued = ((stakerBox?.stake || 0n) * (globalState.rewardPerToken || 0n)) / BigInt(PRECISION);

    expect(globalState.totalStaked).toEqual(stakeAmount);
    expect(globalState.accruedRewards).toBeGreaterThan(0n);
    expect(globalState.rewardRate).toBeGreaterThanOrEqual(0n);
    expect(accrued).toBeGreaterThan(0n);
    expect(paid).toBeGreaterThan(0n);
    expect(paid).toBeGreaterThanOrEqual(minExpected);
  }, 90000);
});
