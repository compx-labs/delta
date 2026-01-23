/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config, microAlgo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { beforeAll, describe, expect, test } from "vitest";

import { MasterRepoClient, MasterRepoFactory } from "../smart_contracts/artifacts/master_repo/master_repoClient";
import { StakingClient, StakingFactory } from "../smart_contracts/artifacts/staking/stakingClient";
import algosdk, { Account } from "algosdk";
import { deploy, deployMasterRepo } from "../smart_contracts/staking/deploy";
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
const REWARD_AMOUNT = 1_000_000n;
const DURATION = 1_000n;
const APR_BPS = 1_200n;
const MAX_FEE = microAlgo(250_000);

describe("staking pools Testing - config", () => {
  const localnet = algorandFixture();
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
    localnet.algorand.send.payment({
      sender: platformAdmin.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(10_000_000),
      note: "funding master repo",
    });
    masterRepoClient.algorand.setSignerFromAccount(platformAdmin);

    const stakedAsset = await localnet.context.algorand.send.assetCreate({
      sender: poolAdmin.addr,
      total: 10_000_000n,
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
  }, 30000);

  test("initApplication sets fixed-rate params", async () => {
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

    const globalState = await stakingClient.state.global.getAll();
    expect(globalState.stakedAssetId).toEqual(stakedAssetId);
    expect(globalState.rewardAssetId).toEqual(rewardAssetId);
    expect(globalState.totalRewards).toEqual(REWARD_AMOUNT);
    expect(globalState.rewardRate).toEqual(REWARD_AMOUNT / DURATION);
    expect(globalState.useApr).toEqual(0n);
    expect(globalState.aprBps).toEqual(0n);
    expect(globalState.contractState).toEqual(0n);
  });

  test("initApplicationApr sets APR params", async () => {
    const aprAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(10_000_000) });
    localnet.algorand.setSignerFromAccount(aprAdmin);
    localnet.algorand.send.assetOptIn({
      sender: aprAdmin.addr,
      assetId: rewardAssetId,
    });
    localnet.algorand.setSignerFromAccount(poolAdmin);
    localnet.algorand.send.assetTransfer({
      sender: poolAdmin.addr,
      receiver: aprAdmin.addr,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "funding apr admin",
    });

    const stakingAprClient = await deploy(aprAdmin, masterRepoClient.appId);
    stakingAprClient.algorand.setSignerFromAccount(aprAdmin);

    const initialBalanceTxn = stakingAprClient.algorand.createTransaction.payment({
      sender: aprAdmin.addr,
      receiver: stakingAprClient.appClient.appAddress,
      amount: microAlgo(INITIAL_PAY_AMOUNT),
      note: "initial mbr",
      maxFee: MAX_FEE,
    });

    const rewardFundingTxn = stakingAprClient.algorand.createTransaction.assetTransfer({
      sender: aprAdmin.addr,
      receiver: stakingAprClient.appClient.appAddress,
      assetId: rewardAssetId,
      amount: REWARD_AMOUNT,
      note: "reward funding",
      maxFee: MAX_FEE,
    });

    await stakingAprClient.send.initApplicationApr({
      args: {
        stakedAssetId,
        rewardAssetId,
        rewardAmount: REWARD_AMOUNT,
        aprBps: APR_BPS,
        startTime: 0n,
        duration: DURATION,
        initialBalanceTxn,
      },
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    await stakingAprClient.send.fundRewards({
      args: {
        rewardFundingTxn,
        rewardAmount: REWARD_AMOUNT,
      },
      sender: aprAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const globalState = await stakingAprClient.state.global.getAll();
    expect(globalState.useApr).toEqual(1n);
    expect(globalState.aprBps).toEqual(APR_BPS);
    expect(globalState.rewardRate).toEqual(0n);
  });

  test("registers staking with master repo", async () => {
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

    // Need to verify via box as that's how the front end will check
    const regContractBox = await masterRepoClient.state.box.registeredContracts.getMap();
    const appRegistered = regContractBox.has(stakingClient.appId);
    expect(appRegistered).toEqual(true);
  });

  test("setContractActive pulls params from master repo", async () => {
    await stakingClient.send.setContractActive({
      args: {},
      coverAppCallInnerTransactionFees: true,
      populateAppCallResources: true,
      maxFee: MAX_FEE,
    });

    const globalState = await stakingClient.state.global.getAll();
    expect(globalState.contractState).toEqual(1n);
    expect(globalState.platformFeeBps).toEqual(PLATFORM_FEE_BPS);
    expect(globalState.superAdminAddress).toEqual(algosdk.encodeAddress(platformSuperAdmin.addr.publicKey));
    expect(globalState.masterRepoApp).toEqual(masterRepoClient.appId);
  });

  test("admin can update admin address", async () => {
    const newAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(2_000_000) });
    stakingClient.algorand.setSignerFromAccount(poolAdmin);
    await stakingClient.send.updateAdminAddress({
      args: { adminAddress: newAdmin.addr.toString() },
      sender: poolAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      maxFee: MAX_FEE,
      populateAppCallResources: true,
    });

    let globalState = await stakingClient.state.global.getAll();
    expect(globalState.adminAddress).toEqual(algosdk.encodeAddress(newAdmin.addr.publicKey));

    stakingClient.algorand.setSignerFromAccount(newAdmin);
    consoleLogger.debug(`admin from global state: ${globalState.adminAddress}, admin we want (newAdmin): ${newAdmin.addr.toString()}`);

    await stakingClient.send.updateAdminAddress({
      args: { adminAddress: poolAdmin.addr.toString() },
      sender: newAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      maxFee: MAX_FEE,
      populateAppCallResources: true,
    });
    stakingClient.algorand.setSignerFromAccount(poolAdmin);

    globalState = await stakingClient.state.global.getAll();
    expect(globalState.adminAddress).toEqual(algosdk.encodeAddress(poolAdmin.addr.publicKey));
  });

  test("super admin can update super admin address and set inactive", async () => {
    await stakingClient.send.setContractActive({
      args: {},
      coverAppCallInnerTransactionFees: true,
      maxFee: microAlgo(3_000),
    });

    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(1_000_000) });
    stakingClient.algorand.setSignerFromAccount(outsider);

    await expect(
      stakingClient.send.updateSuperAdminAddress({
        args: { superAdminAddress: outsider.addr.toString() },
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        maxFee: MAX_FEE,
        populateAppCallResources: true,
      }),
    ).rejects.toThrowError();

    stakingClient.algorand.setSignerFromAccount(platformSuperAdmin);
    const newSuperAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(2_000_000) });
    await stakingClient.send.updateSuperAdminAddress({
      args: { superAdminAddress: newSuperAdmin.addr.toString() },
      sender: platformSuperAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      maxFee: MAX_FEE,
      populateAppCallResources: true,
    });

    let globalState = await stakingClient.state.global.getAll();
    expect(globalState.superAdminAddress).toEqual(algosdk.encodeAddress(newSuperAdmin.addr.publicKey));

    stakingClient.algorand.setSignerFromAccount(newSuperAdmin);
    await stakingClient.send.setContractInactive({
      args: {},
      sender: newSuperAdmin.addr,
      coverAppCallInnerTransactionFees: true,
      maxFee: MAX_FEE,
      populateAppCallResources: true,
    });
    globalState = await stakingClient.state.global.getAll();
    expect(globalState.contractState).toEqual(0n);

    stakingClient.algorand.setSignerFromAccount(poolAdmin);
  });

  test("non-admin cannot activate or update admin", async () => {
    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(1_000_000) });
    stakingClient.algorand.setSignerFromAccount(outsider);

    await expect(
      stakingClient.send.setContractActive({
        args: {},
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        maxFee: MAX_FEE,
        populateAppCallResources: true,
      }),
    ).rejects.toThrowError();

    await expect(
      stakingClient.send.updateAdminAddress({
        args: { adminAddress: outsider.addr.toString() },
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        maxFee: MAX_FEE,
        populateAppCallResources: true,
      }),
    ).rejects.toThrowError();

    stakingClient.algorand.setSignerFromAccount(poolAdmin);
  });
});
