import { algorandFixture } from "@algorandfoundation/algokit-utils/testing";
import { StakingClient, StakingFactory } from "../artifacts/staking/stakingClient";
import algosdk, { Address, Account } from "algosdk";
import { MasterRepoClient, MasterRepoFactory } from "../artifacts/master_repo/master_repoClient";

export const deploy = async (adminAccount: Account, masterRepoApp: bigint) => {
  const localnet = algorandFixture();
  await localnet.newScope(); // Ensure context is initialized before accessing it
  localnet.algorand.setSignerFromAccount(adminAccount);

  const factory = localnet.algorand.client.getTypedAppFactory(StakingFactory, {
    defaultSender: adminAccount.addr,
  });
  factory.algorand.setSignerFromAccount(adminAccount);
  const { appClient } = await factory.send.create.createApplication({
    args: {
      adminAddress: adminAccount.addr.toString(),
      masterRepoApp,
    },
    sender: adminAccount.addr,
  });
  appClient.algorand.setSignerFromAccount(adminAccount);
  return appClient;
};

export const deployMasterRepo = async (adminAccount: Account, superAdminAccount: Account, platformFeeBps: bigint): Promise<MasterRepoClient> => {
  const localnet = algorandFixture();
  await localnet.newScope(); // Ensure context is initialized before accessing it
  localnet.algorand.setSignerFromAccount(adminAccount);

  const factory = localnet.algorand.client.getTypedAppFactory(MasterRepoFactory, {
    defaultSender: adminAccount.addr,
  });
  factory.algorand.setSignerFromAccount(adminAccount);
  const { appClient } = await factory.send.create.createApplication({
    args: {
      adminAddress: adminAccount.addr.toString(),
      superAdminAddress: superAdminAccount.addr.toString(),
      platformFeeBps,
    },
    sender: adminAccount.addr,
  });
  appClient.algorand.setSignerFromAccount(adminAccount);
  return appClient;
};

export const getMasterRepoClient = async (masterRepoAppId: bigint): Promise<MasterRepoClient> => {
  {
    const localnet = algorandFixture();
    await localnet.newScope();

    const appClient = new MasterRepoClient({
      algorand: localnet.algorand, // your AlgorandClient instance
      appId: BigInt(masterRepoAppId), // the application ID
    });
    return appClient;
  }
};
