import {
  Account,
  Application,
  BoxMap,
  contract,
  Contract,
  GlobalState,
  gtxn,
  itxn,
  op,
  uint64,
  assert,
  assertMatch,
  arc4,
} from "@algorandfoundation/algorand-typescript";
import { Address, abimethod, Uint64 } from "@algorandfoundation/algorand-typescript/arc4";
import { Global } from "@algorandfoundation/algorand-typescript/op";

const REGISTRY_BOX_FEE: uint64 = 22_500;
const MAX_BPS: uint64 = 10_000;
const CONTRACT_VERSION: uint64 = 3000;


@contract({ name: "master_repo", avmVersion: 11 })
export class MasterRepo extends Contract {
  registered_contracts = BoxMap<Application, uint64>({ keyPrefix: "rc" });

  // admin of the master repo
  admin_address = GlobalState<Account>();
  //super admin account that can make calls to registered contracts to withdraw platform fees.
  super_admin_address = GlobalState<Account>();

  platform_fee_bps = GlobalState<Uint64>();

  contract_version = GlobalState<Uint64>();

  @abimethod({ allowActions: "NoOp", onCreate: "require" })
  createApplication(adminAddress: Address, superAdminAddress: Address, platformFeeBps: uint64): void {
    assert(platformFeeBps <= MAX_BPS, "Invalid platform fee");
    this.admin_address.value = adminAddress.native;
    this.super_admin_address.value = superAdminAddress.native;
    this.platform_fee_bps.value = new Uint64(platformFeeBps);
    this.contract_version.value = new Uint64(CONTRACT_VERSION);
  }

  @abimethod({ allowActions: "NoOp" })
  updateAdminAddress(adminAddress: Account): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can update admin address");
    this.admin_address.value = adminAddress;
  }

  @abimethod({ allowActions: "NoOp" })
  updateSuperAdminAddress(superAdminAddress: Account): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can update super admin address");
    this.super_admin_address.value = superAdminAddress;
  }

  @abimethod({ allowActions: "NoOp" })
  updatePlatformFeeBps(platformFeeBps: uint64): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can update platform fee");
    assert(platformFeeBps <= MAX_BPS, "Invalid platform fee");
    this.platform_fee_bps.value = new Uint64(platformFeeBps);
  }

  //Contract type 1= staking, 2 = lending
  @abimethod({ allowActions: "NoOp" })
  registerContract(app: Application, mbrTxn: gtxn.PaymentTxn, contractType: uint64): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can register");
    assert(!this.registered_contracts(app).exists, "Already registered");

    assertMatch(mbrTxn, {
      sender: op.Txn.sender,
      receiver: Global.currentApplicationAddress,
      amount: REGISTRY_BOX_FEE,
    });

    this.registered_contracts(app).value = contractType;
  }

  @abimethod({ allowActions: "NoOp" })
  unregisterContract(app: Application, refundReceiver: Account): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can unregister");
    assert(this.registered_contracts(app).exists, "Not registered");

    this.registered_contracts(app).delete();

    itxn
      .payment({
        receiver: refundReceiver,
        amount: REGISTRY_BOX_FEE - 2000,
        sender: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit();
  }

  @abimethod({ allowActions: "NoOp" })
  isRegistered(app: Application): Uint64 {
    return new Uint64(this.registered_contracts(app).exists ? 1 : 0);
  }

  @abimethod({ allowActions: "NoOp" })
  getSuperAdminAddress(): Address {
    return new Address(this.super_admin_address.value);
  }

  @abimethod({ allowActions: "NoOp" })
  getPlatformFeeBps(): Uint64 {
    return this.platform_fee_bps.value;
  }
}
