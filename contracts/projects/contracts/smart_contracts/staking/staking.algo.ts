import {
  Account,
  Asset,
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
  err,
  Application,
  clone,
} from "@algorandfoundation/algorand-typescript";
import { abiCall, abimethod, Address, Uint64 } from "@algorandfoundation/algorand-typescript/arc4";
import { Global } from "@algorandfoundation/algorand-typescript/op";
import { BOX_FEE, INITIAL_PAY_AMOUNT, mulDivW, PRECISION, StakeInfoRecord, STANDARD_TXN_FEE, VERSION } from "./config.algo";

const SECONDS_PER_YEAR: uint64 = 31_536_000;

@contract({ name: "staking", avmVersion: 11 })
export class Staking extends Contract {
  stakers = BoxMap<Account, StakeInfoRecord>({ keyPrefix: "st" });

  staked_asset_id = GlobalState<Uint64>();
  reward_asset_id = GlobalState<Uint64>();

  total_staked = GlobalState<Uint64>();
  reward_per_token = GlobalState<Uint64>();

  reward_rate = GlobalState<Uint64>();
  start_time = GlobalState<Uint64>();
  end_time = GlobalState<Uint64>();
  last_update_time = GlobalState<Uint64>();

  total_rewards = GlobalState<Uint64>();
  accrued_rewards = GlobalState<Uint64>();
  apr_bps = GlobalState<Uint64>();

  admin_address = GlobalState<Account>();
  super_admin_address = GlobalState<Account>();
  num_stakers = GlobalState<Uint64>();
  contract_version = GlobalState<Uint64>();
  contract_state = GlobalState<Uint64>(); // 0 = inactive, 1 = active
  master_repo_app = GlobalState<Application>();
  platform_fee_bps = GlobalState<Uint64>();
  platform_fees_accrued = GlobalState<Uint64>();

  @abimethod({ allowActions: "NoOp", onCreate: "require" })
  createApplication(adminAddress: Address, masterRepoApp: Application): void {
    this.admin_address.value = adminAddress.native;
    this.contract_version.value = new Uint64(VERSION);
    this.contract_state.value = new Uint64(0);
    this.master_repo_app.value = masterRepoApp;
    this.platform_fee_bps.value = new Uint64(0);
    this.platform_fees_accrued.value = new Uint64(0);
  }

  @abimethod({ allowActions: "NoOp" })
  initApplication(
    stakedAssetId: uint64,
    rewardAssetId: uint64,
    rewardAmount: uint64,
    aprBps: uint64,
    startTime: uint64,
    duration: uint64,
    initialBalanceTxn: gtxn.PaymentTxn,
  ): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can init application");
    assert(rewardAmount > 0, "Invalid reward amount");
    assert(duration > 0, "Invalid duration");
    assert(aprBps > 0, "Invalid APR");

    const start: uint64 = startTime === 0 ? Global.latestTimestamp : startTime;
    const end: uint64 = start + duration;
    assert(end > start, "Invalid time range");

    this.staked_asset_id.value = new Uint64(stakedAssetId);
    this.reward_asset_id.value = new Uint64(rewardAssetId);
    this.total_rewards.value = new Uint64(rewardAmount);
    this.reward_rate.value = new Uint64(0);
    this.start_time.value = new Uint64(start);
    this.end_time.value = new Uint64(end);
    this.last_update_time.value = new Uint64(start);
    this.reward_per_token.value = new Uint64(0);
    this.total_staked.value = new Uint64(0);
    this.num_stakers.value = new Uint64(0);
    this.accrued_rewards.value = new Uint64(0);
    this.apr_bps.value = new Uint64(aprBps);
    this.platform_fees_accrued.value = new Uint64(0);

    assertMatch(initialBalanceTxn, {
      receiver: Global.currentApplicationAddress,
      amount: INITIAL_PAY_AMOUNT,
    });

    itxn
      .assetTransfer({
        xferAsset: stakedAssetId,
        assetReceiver: Global.currentApplicationAddress,
        assetAmount: 0,
        fee: 0,
      })
      .submit();

    if (rewardAssetId !== stakedAssetId) {
      itxn
        .assetTransfer({
          xferAsset: rewardAssetId,
          assetReceiver: Global.currentApplicationAddress,
          assetAmount: 0,
          fee: 0,
        })
        .submit();
    }
  }

  @abimethod({ allowActions: "NoOp" })
  fundRewards(rewardFundingTxn: gtxn.AssetTransferTxn, rewardAmount: uint64): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can fund rewards");
    assert(this.contract_state.value === new Uint64(0), "Pool must be inactive");
    assert(this.accrued_rewards.value.asUint64() === 0, "Rewards already started");
    assert(rewardAmount === this.total_rewards.value.asUint64(), "Reward amount mismatch");

    assertMatch(rewardFundingTxn, {
      sender: this.admin_address.value,
      assetReceiver: Global.currentApplicationAddress,
      xferAsset: Asset(this.reward_asset_id.value.asUint64()),
      assetAmount: rewardAmount,
    });
  }

  @abimethod({ allowActions: "NoOp" })
  setContractActive(): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can set active");
    const superAdminResult = abiCall({
      appId: this.master_repo_app.value,
      method: MasterRepoStub.prototype.getSuperAdminAddress,
      args: [],
      fee: 0,
    }).returnValue;
    this.super_admin_address.value = superAdminResult;

    const platformFeeResult = abiCall({
      appId: this.master_repo_app.value,
      method: MasterRepoStub.prototype.getPlatformFeeBps,
      args: [],
      fee: 0,
    }).returnValue;
    this.platform_fee_bps.value = platformFeeResult;
    this.contract_state.value = new Uint64(1);
  }

  @abimethod({ allowActions: "NoOp" })
  setContractInactive(): void {
    assert(op.Txn.sender === this.admin_address.value || op.Txn.sender === this.super_admin_address.value, "Only admin can set inactive");
    this.contract_state.value = new Uint64(0);
  }

  @abimethod({ allowActions: "NoOp" })
  updateAdminAddress(adminAddress: Account): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can update admin address");
    this.admin_address.value = adminAddress;
  }

  @abimethod({ allowActions: "NoOp" })
  updateSuperAdminAddress(superAdminAddress: Account): void {
    assert(op.Txn.sender === this.super_admin_address.value, "Only super admin can update super admin address");
    this.super_admin_address.value = superAdminAddress;
  }

  @abimethod({ allowActions: "NoOp" })
  withdrawPlatformFees(receiver: Account): void {
    assert(op.Txn.sender === this.super_admin_address.value, "Only super admin can withdraw fees");
    const accrued: uint64 = this.platform_fees_accrued.value.asUint64();
    assert(accrued > 0, "No fees accrued");

    this.platform_fees_accrued.value = new Uint64(0);
    itxn
      .assetTransfer({
        xferAsset: this.reward_asset_id.value.asUint64(),
        assetReceiver: receiver,
        sender: Global.currentApplicationAddress,
        assetAmount: accrued,
        fee: 0,
      })
      .submit();
  }

  @abimethod({ allowActions: "NoOp" })
  emergencyWithdrawAsset(assetId: uint64, amount: uint64, receiver: Account): void {
    assert(op.Txn.sender === this.super_admin_address.value, "Only super admin can withdraw");
    assert(this.contract_state.value === new Uint64(0), "Pool must be inactive");
    assert(this.stakers(receiver).exists, "No stake found for user");

    const rec = clone(this.stakers(receiver).value);
    const stakeNow: uint64 = rec.stake.asUint64();
    assert(stakeNow > 0, "No stake");
    assert(assetId === this.staked_asset_id.value.asUint64(), "Invalid asset");
    assert(amount === stakeNow, "Amount mismatch");

    const accrued = mulDivW(stakeNow, this.reward_per_token.value.asUint64(), PRECISION);
    const pending: uint64 = accrued > rec.rewardDebt.asUint64() ? accrued - rec.rewardDebt.asUint64() : 0;

    if (pending > 0) {
      const fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      itxn
        .assetTransfer({
          xferAsset: this.reward_asset_id.value.asUint64(),
          assetReceiver: receiver,
          sender: Global.currentApplicationAddress,
          assetAmount: net,
          fee: 0,
        })
        .submit();
    }

    itxn
      .assetTransfer({
        xferAsset: this.staked_asset_id.value.asUint64(),
        assetReceiver: receiver,
        sender: Global.currentApplicationAddress,
        assetAmount: stakeNow,
        fee: 0,
      })
      .submit();

    this.total_staked.value = new Uint64(this.total_staked.value.asUint64() - stakeNow);
    this.num_stakers.value = new Uint64(this.num_stakers.value.asUint64() - 1);
    this.stakers(receiver).delete();

    itxn
      .payment({
        receiver: receiver,
        amount: BOX_FEE - 2000,
        sender: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit();
  }

  private updatePool(): void {
    if (this.contract_state.value === new Uint64(0)) {
      return;
    }

    const now: uint64 = Global.latestTimestamp;
    const end: uint64 = this.end_time.value.asUint64();
    const start: uint64 = this.start_time.value.asUint64();
    const last: uint64 = this.last_update_time.value.asUint64();

    if (now <= last) {
      return;
    }

    const cappedTime: uint64 = now < end ? now : end;
    if (cappedTime <= start) {
      this.last_update_time.value = new Uint64(cappedTime);
      return;
    }

    const effectiveLast: uint64 = last < start ? start : last;
    if (cappedTime <= effectiveLast) {
      this.last_update_time.value = new Uint64(cappedTime);
      return;
    }

    if (this.total_staked.value.asUint64() === 0) {
      this.last_update_time.value = new Uint64(cappedTime);
      return;
    }

    const duration: uint64 = cappedTime - effectiveLast;
    let rewardRate: uint64 = this.reward_rate.value.asUint64();
    const annualReward = mulDivW(this.total_staked.value.asUint64(), this.apr_bps.value.asUint64(), 10_000);
    rewardRate = annualReward / SECONDS_PER_YEAR;

    let reward: uint64 = duration * rewardRate;
    const remaining: uint64 = this.total_rewards.value.asUint64() - this.accrued_rewards.value.asUint64();
    if (reward > remaining) {
      reward = remaining;
    }
    if (reward === 0) {
      this.last_update_time.value = new Uint64(cappedTime);
      return;
    }

    this.accrued_rewards.value = new Uint64(this.accrued_rewards.value.asUint64() + reward);
    const deltaRPT = mulDivW(reward, PRECISION, this.total_staked.value.asUint64());
    this.reward_per_token.value = new Uint64(this.reward_per_token.value.asUint64() + deltaRPT);
    this.last_update_time.value = new Uint64(cappedTime);
  }

  @abimethod({ allowActions: "NoOp" })
  stake(stakeTxn: gtxn.AssetTransferTxn, quantity: uint64, mbrTxn: gtxn.PaymentTxn): void {
    assert(quantity > 0, "Invalid quantity");
    assert(this.contract_state.value.asUint64() === 1, "Pool is inactive");
    assert(Global.latestTimestamp < this.end_time.value.asUint64(), "Pool ended");
    assertMatch(stakeTxn, {
      sender: op.Txn.sender,
      assetReceiver: Global.currentApplicationAddress,
      xferAsset: Asset(this.staked_asset_id.value.asUint64()),
      assetAmount: quantity,
    });

    const exists = this.stakers(op.Txn.sender).exists;
    if (!exists) {
      assertMatch(mbrTxn, {
        sender: op.Txn.sender,
        receiver: Global.currentApplicationAddress,
        amount: BOX_FEE,
      });
    } else {
      // if the box record alreay exists, repay the box fee
      itxn
        .payment({
          receiver: op.Txn.sender,
          amount: mbrTxn.amount,
          sender: Global.currentApplicationAddress,
          fee: 0,
        })
        .submit();
    }

    this.updatePool();

    const prevStake: uint64 = exists ? this.stakers(op.Txn.sender).value.stake.asUint64() : 0;
    const prevDebt: uint64 = exists ? this.stakers(op.Txn.sender).value.rewardDebt.asUint64() : 0;
    const accrued = mulDivW(prevStake, this.reward_per_token.value.asUint64(), PRECISION);
    const pending: uint64 = accrued > prevDebt ? accrued - prevDebt : 0;

    if (pending > 0) {
      const fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      itxn
        .assetTransfer({
          xferAsset: this.reward_asset_id.value.asUint64(),
          assetReceiver: op.Txn.sender,
          sender: Global.currentApplicationAddress,
          assetAmount: net,
          fee: 0,
        })
        .submit();
    }

    const newStake: uint64 = prevStake + quantity;
    this.total_staked.value = new Uint64(this.total_staked.value.asUint64() + quantity);

    const newDebt = mulDivW(newStake, this.reward_per_token.value.asUint64(), PRECISION);
    this.stakers(op.Txn.sender).value = new StakeInfoRecord({
      stake: new Uint64(newStake),
      rewardDebt: new Uint64(newDebt),
    });

    if (!exists) {
      this.num_stakers.value = new Uint64(this.num_stakers.value.asUint64() + 1);
    }
  }

  @abimethod({ allowActions: "NoOp" })
  claimRewards(): void {
    assert(this.stakers(op.Txn.sender).exists, "No stake found for user");
    assert(this.contract_state.value.asUint64() === 1, "Pool is inactive");
    const staker = clone(this.stakers(op.Txn.sender).value);
    assert(staker.stake.asUint64() > 0, "No stake");

    this.updatePool();

    const accrued = mulDivW(staker.stake.asUint64(), this.reward_per_token.value.asUint64(), PRECISION);
    const pending: uint64 = accrued > staker.rewardDebt.asUint64() ? accrued - staker.rewardDebt.asUint64() : 0;

    if (pending > 0) {
      const fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      itxn
        .assetTransfer({
          xferAsset: this.reward_asset_id.value.asUint64(),
          assetReceiver: op.Txn.sender,
          sender: Global.currentApplicationAddress,
          assetAmount: net,
          fee: 0,
        })
        .submit();
    }

    const newDebt = mulDivW(staker.stake.asUint64(), this.reward_per_token.value.asUint64(), PRECISION);
    this.stakers(op.Txn.sender).value = new StakeInfoRecord({
      stake: staker.stake,
      rewardDebt: new Uint64(newDebt),
    });
  }

  @abimethod({ allowActions: "NoOp" })
  unstake(quantity: uint64): void {
    assert(this.stakers(op.Txn.sender).exists, "No stake found for user");
    const rec = clone(this.stakers(op.Txn.sender).value);
    const stakeNow: uint64 = rec.stake.asUint64();
    assert(stakeNow > 0, "No stake");

    this.updatePool();

    const amountToWithdraw: uint64 = quantity === 0 ? stakeNow : quantity;
    assert(stakeNow >= amountToWithdraw, "Unstake amount exceeds balance");

    const accrued = mulDivW(stakeNow, this.reward_per_token.value.asUint64(), PRECISION);
    const pending: uint64 = accrued > rec.rewardDebt.asUint64() ? accrued - rec.rewardDebt.asUint64() : 0;

    if (pending > 0) {
      const fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      itxn
        .assetTransfer({
          xferAsset: this.reward_asset_id.value.asUint64(),
          assetReceiver: op.Txn.sender,
          sender: Global.currentApplicationAddress,
          assetAmount: net,
          fee: 0,
        })
        .submit();
    }

    itxn
      .assetTransfer({
        xferAsset: this.staked_asset_id.value.asUint64(),
        assetReceiver: op.Txn.sender,
        sender: Global.currentApplicationAddress,
        assetAmount: amountToWithdraw,
        fee: 0,
      })
      .submit();

    this.total_staked.value = new Uint64(this.total_staked.value.asUint64() - amountToWithdraw);

    const remaining: uint64 = stakeNow - amountToWithdraw;
    if (remaining === 0) {
      this.stakers(op.Txn.sender).delete();
      this.num_stakers.value = new Uint64(this.num_stakers.value.asUint64() - 1);
      itxn
        .payment({
          receiver: op.Txn.sender,
          amount: BOX_FEE,
          sender: Global.currentApplicationAddress,
          fee: 0,
        })
        .submit();
    } else {
      const newDebt = mulDivW(remaining, this.reward_per_token.value.asUint64(), PRECISION);
      this.stakers(op.Txn.sender).value = new StakeInfoRecord({
        stake: new Uint64(remaining),
        rewardDebt: new Uint64(newDebt),
      });
    }
  }

  @abimethod({ allowActions: "DeleteApplication" })
  deleteApplication(): void {
    assert(op.Txn.sender === this.super_admin_address.value, "Only super admin can delete application");
    assert(this.total_staked.value.asUint64() === 0, "Staked assets still exist");

    itxn
      .assetTransfer({
        xferAsset: this.staked_asset_id.value.asUint64(),
        assetCloseTo: this.admin_address.value,
        assetAmount: 0,
        assetReceiver: Global.currentApplicationAddress,
        fee: 0,
      })
      .submit();

    if (this.staked_asset_id.value !== this.reward_asset_id.value) {
      itxn
        .assetTransfer({
          xferAsset: this.reward_asset_id.value.asUint64(),
          assetCloseTo: this.admin_address.value,
          assetAmount: 0,
          assetReceiver: Global.currentApplicationAddress,
          fee: 0,
        })
        .submit();
    }
  }

  @abimethod({ allowActions: "NoOp" })
  gas(): void {}
}

export abstract class MasterRepoStub extends Contract {
  @abimethod({ allowActions: "NoOp" })
  getPlatformFeeBps(): Uint64 {
    err("stub only");
  }
  @abimethod({ allowActions: "NoOp" })
  getSuperAdminAddress(): Account {
    err("stub only");
  }
}
