/* eslint-disable @typescript-eslint/no-unused-vars */
import { Config, microAlgo } from "@algorandfoundation/algokit-utils";
import { registerDebugEventHandlers } from "@algorandfoundation/algokit-utils-debug";
import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { beforeAll, describe, expect, test } from "vitest";

import { MasterRepoClient } from "../smart_contracts/artifacts/master_repo/master_repoClient";
import algosdk, { Account } from "algosdk";
import { deployMasterRepo } from "../smart_contracts/staking/deploy";

let masterRepoClient: MasterRepoClient;
let adminAccount: Account;
let superAdminAccount: Account;

const PLATFORM_FEE_BPS = 250n;
const UPDATED_PLATFORM_FEE_BPS = 500n;
const REGISTRY_BOX_FEE = 22_500n;

describe("master-repo Testing - config", () => {
  const localnet = algorandFixture();

  // -------------------------------------------------------------------------------------------------
  beforeAll(async () => {
    await localnet.newScope();

    Config.configure({
      debug: true,
    });
    registerDebugEventHandlers();

    adminAccount = await localnet.context.generateAccount({ initialFunds: microAlgo(100_000_000) });
    superAdminAccount = await localnet.context.generateAccount({ initialFunds: microAlgo(10_000_000) });

    masterRepoClient = await deployMasterRepo(adminAccount, superAdminAccount, PLATFORM_FEE_BPS);
    masterRepoClient.algorand.setSignerFromAccount(adminAccount);
    localnet.algorand.setSignerFromAccount(adminAccount);
    localnet.algorand.send.payment({
      sender: adminAccount.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(10_000_000),
      note: "funding master repo",
    });
  }, 30000);

  test("createApplication sets global params", async () => {
    const globalState = await masterRepoClient.state.global.getAll();
    expect(globalState).toBeDefined();
    expect(globalState.adminAddress).toEqual(algosdk.encodeAddress(adminAccount.addr.publicKey));
    expect(globalState.superAdminAddress).toEqual(algosdk.encodeAddress(superAdminAccount.addr.publicKey));
    expect(globalState.platformFeeBps).toEqual(PLATFORM_FEE_BPS);
  });

  test("getSuperAdminAddress and getPlatformFeeBps return expected values", async () => {
    const superAdmin = await masterRepoClient.send.getSuperAdminAddress();
    const feeBps = await masterRepoClient.send.getPlatformFeeBps();

    expect(superAdmin.return).toEqual(algosdk.encodeAddress(superAdminAccount.addr.publicKey));
    expect(feeBps.return).toEqual(PLATFORM_FEE_BPS);
  });

  test("admin can update platform fee", async () => {
    await masterRepoClient.send.updatePlatformFeeBps({
      args: { platformFeeBps: UPDATED_PLATFORM_FEE_BPS },
    });

    const globalState = await masterRepoClient.state.global.getAll();
    expect(globalState.platformFeeBps).toEqual(UPDATED_PLATFORM_FEE_BPS);
  });

  test("admin can update super admin address", async () => {
    const newSuperAdmin = await localnet.context.generateAccount({ initialFunds: microAlgo(2_000_000) });

    await masterRepoClient.send.updateSuperAdminAddress({
      args: { superAdminAddress: newSuperAdmin.addr.toString() },
    });

    const globalState = await masterRepoClient.state.global.getAll();
    expect(globalState.superAdminAddress).toEqual(algosdk.encodeAddress(newSuperAdmin.addr.publicKey));
  });

  test("registers and unregisters a contract", async () => {
    const mbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: adminAccount.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(REGISTRY_BOX_FEE),
      note: "registry mbr",
    });

    await masterRepoClient.send.registerContract({
      args: { app: masterRepoClient.appId, mbrTxn },
    });

    const registered = await masterRepoClient.send.isRegistered({
      args: { app: masterRepoClient.appId },
    });
    expect(registered.return).toEqual(1n);

    await masterRepoClient.send.unregisterContract({
      args: { app: masterRepoClient.appId, refundReceiver: adminAccount.addr.toString() },
      coverAppCallInnerTransactionFees: true,
      maxFee: microAlgo(3_000),
    });

    const unregistered = await masterRepoClient.send.isRegistered({
      args: { app: masterRepoClient.appId },
    });
    expect(unregistered.return).toEqual(0n);
  });

  test("registerContract rejects duplicate registration", async () => {
    const mbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: adminAccount.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(REGISTRY_BOX_FEE),
      note: "registry mbr",
    });

    await masterRepoClient.send.registerContract({
      args: { app: masterRepoClient.appId, mbrTxn },
    });

    const secondMbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: adminAccount.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(REGISTRY_BOX_FEE),
      note: "registry mbr 2",
    });

    await expect(
      masterRepoClient.send.registerContract({
        args: { app: masterRepoClient.appId, mbrTxn: secondMbrTxn },
      }),
    ).rejects.toThrowError();
  });

  test("unregisterContract rejects when not registered", async () => {
    await masterRepoClient.send.unregisterContract({
      args: { app: masterRepoClient.appId, refundReceiver: adminAccount.addr.toString() },
      coverAppCallInnerTransactionFees: true,
      maxFee: microAlgo(3_000),
    });

    await expect(
      masterRepoClient.send.unregisterContract({
        args: { app: masterRepoClient.appId, refundReceiver: adminAccount.addr.toString() },
        coverAppCallInnerTransactionFees: true,
        maxFee: microAlgo(3_000),
      }),
    ).rejects.toThrowError();
  });

  test("createApplication rejects invalid platform fee", async () => {
    await expect(deployMasterRepo(adminAccount, superAdminAccount, 10_001n)).rejects.toThrowError();
  });

  test("non-admin cannot update admin or platform params", async () => {
    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(1_000_000) });
    masterRepoClient.algorand.setSignerFromAccount(outsider);

    await expect(
      masterRepoClient.send.updateAdminAddress({
        args: { adminAddress: outsider.addr.toString() },
        sender: outsider.addr,
      }),
    ).rejects.toThrowError();

    await expect(
      masterRepoClient.send.updatePlatformFeeBps({
        args: { platformFeeBps: 123n },
        sender: outsider.addr,
      }),
    ).rejects.toThrowError();

    await expect(
      masterRepoClient.send.updateSuperAdminAddress({
        args: { superAdminAddress: outsider.addr.toString() },
        sender: outsider.addr,
      }),
    ).rejects.toThrowError();

    masterRepoClient.algorand.setSignerFromAccount(adminAccount);
  });

  test("non-admin cannot register or unregister contracts", async () => {
    const outsider = await localnet.context.generateAccount({ initialFunds: microAlgo(1_000_000) });
    masterRepoClient.algorand.setSignerFromAccount(outsider);

    const mbrTxn = masterRepoClient.algorand.createTransaction.payment({
      sender: outsider.addr,
      receiver: masterRepoClient.appClient.appAddress,
      amount: microAlgo(REGISTRY_BOX_FEE),
      note: "registry mbr",
    });

    await expect(
      masterRepoClient.send.registerContract({
        args: { app: masterRepoClient.appId, mbrTxn },
        sender: outsider.addr,
      }),
    ).rejects.toThrowError();

    await expect(
      masterRepoClient.send.unregisterContract({
        args: { app: masterRepoClient.appId, refundReceiver: outsider.addr.toString() },
        sender: outsider.addr,
        coverAppCallInnerTransactionFees: true,
        maxFee: microAlgo(3_000),
      }),
    ).rejects.toThrowError();

    masterRepoClient.algorand.setSignerFromAccount(adminAccount);
  });
});
