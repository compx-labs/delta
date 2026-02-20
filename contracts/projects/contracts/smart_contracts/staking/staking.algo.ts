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
  last_update_time = GlobalState<Uint64>();
  stake_asset_decimals = GlobalState<Uint64>();
  reward_asset_decimals = GlobalState<Uint64>();
  stake_to_reward_scale_num = GlobalState<Uint64>();
  stake_to_reward_scale_den = GlobalState<Uint64>();

  total_rewards = GlobalState<Uint64>();
  accrued_rewards = GlobalState<Uint64>();
  apr_bps = GlobalState<Uint64>();
  rewards_exhausted = GlobalState<Uint64>();
  rewards_paid = GlobalState<Uint64>();
  initialized = GlobalState<Uint64>();

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
    this.rewards_paid.value = new Uint64(0);
    this.initialized.value = new Uint64(0);
    this.total_staked.value = new Uint64(0);
    this.num_stakers.value = new Uint64(0);
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
    assert(this.initialized.value.asUint64() === 0, "Already initialized");
    assert(this.contract_state.value.asUint64() === 0, "Pool must be inactive");
    assert(this.total_staked.value.asUint64() === 0, "Staked assets still exist");
    assert(this.num_stakers.value.asUint64() === 0, "Stakers exist");
    assert(rewardAmount > 0, "Invalid reward amount");
    assert(duration > 0, "Invalid duration");
    assert(aprBps > 0, "Invalid APR");

    const start: uint64 = startTime === 0 ? Global.latestTimestamp : startTime;
    const end: uint64 = start + duration;
    assert(end > start, "Invalid time range");
    const [stakeDecimals, hasStakeDecimals] = op.AssetParams.assetDecimals(Asset(stakedAssetId));
    assert(hasStakeDecimals, "Invalid staked asset");
    const [rewardDecimals, hasRewardDecimals] = op.AssetParams.assetDecimals(Asset(rewardAssetId));
    assert(hasRewardDecimals, "Invalid reward asset");
    assert(stakeDecimals <= 19 && rewardDecimals <= 19, "Unsupported asset decimals");

    this.staked_asset_id.value = new Uint64(stakedAssetId);
    this.reward_asset_id.value = new Uint64(rewardAssetId);
    this.total_rewards.value = new Uint64(rewardAmount);
    this.reward_rate.value = new Uint64(0);
    this.start_time.value = new Uint64(start);
    this.last_update_time.value = new Uint64(start);
    this.reward_per_token.value = new Uint64(0);
    this.accrued_rewards.value = new Uint64(0);
    this.apr_bps.value = new Uint64(aprBps);
    this.platform_fees_accrued.value = new Uint64(0);
    this.rewards_exhausted.value = new Uint64(0);
    this.rewards_paid.value = new Uint64(0);
    this.initialized.value = new Uint64(1);
    this.stake_asset_decimals.value = new Uint64(stakeDecimals);
    this.reward_asset_decimals.value = new Uint64(rewardDecimals);

    if (rewardDecimals >= stakeDecimals) {
      const diff: uint64 = rewardDecimals - stakeDecimals;
      this.stake_to_reward_scale_num.value = new Uint64(this.pow10(diff));
      this.stake_to_reward_scale_den.value = new Uint64(1);
    } else {
      const diff: uint64 = stakeDecimals - rewardDecimals;
      this.stake_to_reward_scale_num.value = new Uint64(1);
      this.stake_to_reward_scale_den.value = new Uint64(this.pow10(diff));
    }

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
    this.rewards_exhausted.value = new Uint64(0);
  }

  @abimethod({ allowActions: "NoOp" })
  fundMoreRewards(rewardFundingTxn: gtxn.AssetTransferTxn, rewardAmount: uint64): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can fund rewards");
    assert(rewardAmount > 0, "Invalid reward amount");

    assertMatch(rewardFundingTxn, {
      sender: this.admin_address.value,
      assetReceiver: Global.currentApplicationAddress,
      xferAsset: Asset(this.reward_asset_id.value.asUint64()),
      assetAmount: rewardAmount,
    });

    this.total_rewards.value = new Uint64(this.total_rewards.value.asUint64() + rewardAmount);
    this.rewards_exhausted.value = new Uint64(0);
  }

  @abimethod({ allowActions: "NoOp" })
  removeRewards(): void {
    assert(op.Txn.sender === this.admin_address.value, "Only admin can fund rewards");
    assert(this.contract_state.value === new Uint64(0), "Pool must be inactive");

    const available: uint64 = this.total_rewards.value.asUint64() - this.accrued_rewards.value.asUint64();
    assert(available > 0, "No rewards to remove");
    itxn
      .assetTransfer({
        xferAsset: this.reward_asset_id.value.asUint64(),
        assetReceiver: this.admin_address.value,
        sender: Global.currentApplicationAddress,
        assetAmount: available,
        fee: 0,
      })
      .submit();
    this.rewards_exhausted.value = new Uint64(1);
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
    assert(platformFeeResult.asUint64() <= 10_000, "Invalid platform fee");
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

  private updatePool(): void {
    if (this.contract_state.value === new Uint64(0)) {
      return;
    }

    const now: uint64 = Global.latestTimestamp;
    const start: uint64 = this.start_time.value.asUint64();
    const last: uint64 = this.last_update_time.value.asUint64();

    if (now <= last) {
      return;
    }

    if (this.rewards_exhausted.value.asUint64() === 1) {
      this.last_update_time.value = new Uint64(now);
      return;
    }

    const cappedTime: uint64 = now;
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
    const scaledTotalStaked = mulDivW(
      this.total_staked.value.asUint64(),
      this.stake_to_reward_scale_num.value.asUint64(),
      this.stake_to_reward_scale_den.value.asUint64(),
    );
    const annualReward = mulDivW(scaledTotalStaked, this.apr_bps.value.asUint64(), 10_000);
    const rewardRate: uint64 = annualReward / SECONDS_PER_YEAR;
    this.reward_rate.value = new Uint64(rewardRate);

    let reward: uint64 = mulDivW(duration, annualReward, SECONDS_PER_YEAR);
    const remaining: uint64 = this.total_rewards.value.asUint64() - this.accrued_rewards.value.asUint64();
    if (reward > remaining) {
      reward = remaining;
    }
    if (reward === 0) {
      if (remaining === 0) {
        this.rewards_exhausted.value = new Uint64(1);
      }
      this.last_update_time.value = new Uint64(cappedTime);
      return;
    }

    this.accrued_rewards.value = new Uint64(this.accrued_rewards.value.asUint64() + reward);
    const deltaRPT = mulDivW(reward, PRECISION, this.total_staked.value.asUint64());
    this.reward_per_token.value = new Uint64(this.reward_per_token.value.asUint64() + deltaRPT);
    this.last_update_time.value = new Uint64(cappedTime);
    if (this.accrued_rewards.value.asUint64() === this.total_rewards.value.asUint64()) {
      this.rewards_exhausted.value = new Uint64(1);
    }
  }

  @abimethod({ allowActions: "NoOp" })
  stake(stakeTxn: gtxn.AssetTransferTxn, quantity: uint64, mbrTxn: gtxn.PaymentTxn): void {
    assert(quantity > 0, "Invalid quantity");
    assert(this.contract_state.value.asUint64() === 1, "Pool is inactive");
    assert(this.rewards_exhausted.value.asUint64() === 0, "Rewards exhausted");
    assertMatch(stakeTxn, {
      sender: op.Txn.sender,
      assetReceiver: Global.currentApplicationAddress,
      xferAsset: Asset(this.staked_asset_id.value.asUint64()),
      assetAmount: quantity,
    });
    assertMatch(mbrTxn, {
      sender: op.Txn.sender,
      receiver: Global.currentApplicationAddress,
      amount: BOX_FEE,
    });
    const exists = this.stakers(op.Txn.sender).exists;
    if (exists) {
      // if the box record alreay exists, repay the box fee
      itxn
        .payment({
          receiver: op.Txn.sender,
          amount: BOX_FEE,
          sender: Global.currentApplicationAddress,
          fee: 0,
        })
        .submit();
    }

    this.updatePool();

    const prevStake: uint64 = exists ? this.stakers(op.Txn.sender).value.stake.asUint64() : 0;
    const prevDebt: uint64 = exists ? this.stakers(op.Txn.sender).value.rewardDebt.asUint64() : 0;
    const accrued = mulDivW(prevStake, this.reward_per_token.value.asUint64(), PRECISION);
    let pending: uint64 = accrued > prevDebt ? accrued - prevDebt : 0;
    const payable: uint64 = this.accrued_rewards.value.asUint64() - this.rewards_paid.value.asUint64();
    if (pending > payable) {
      pending = payable;
    }

    if (pending > 0) {
      let fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      if (fee > pending) {
        fee = pending;
      }
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      this.rewards_paid.value = new Uint64(this.rewards_paid.value.asUint64() + pending);
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
    let pending: uint64 = accrued > staker.rewardDebt.asUint64() ? accrued - staker.rewardDebt.asUint64() : 0;
    const payable: uint64 = this.accrued_rewards.value.asUint64() - this.rewards_paid.value.asUint64();
    if (pending > payable) {
      pending = payable;
    }

    if (pending > 0) {
      let fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      if (fee > pending) {
        fee = pending;
      }
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      this.rewards_paid.value = new Uint64(this.rewards_paid.value.asUint64() + pending);
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
    let pending: uint64 = accrued > rec.rewardDebt.asUint64() ? accrued - rec.rewardDebt.asUint64() : 0;
    const payable: uint64 = this.accrued_rewards.value.asUint64() - this.rewards_paid.value.asUint64();
    if (pending > payable) {
      pending = payable;
    }

    if (pending > 0) {
      let fee: uint64 = mulDivW(pending, this.platform_fee_bps.value.asUint64(), 10_000);
      if (fee > pending) {
        fee = pending;
      }
      const net: uint64 = pending - fee;
      if (fee > 0) {
        this.platform_fees_accrued.value = new Uint64(this.platform_fees_accrued.value.asUint64() + fee);
      }
      this.rewards_paid.value = new Uint64(this.rewards_paid.value.asUint64() + pending);
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
    assert(this.num_stakers.value.asUint64() === 0, "Stakers exist");

    const stakedBalance = op.AssetHolding.assetBalance(Global.currentApplicationAddress, Asset(this.staked_asset_id.value.asUint64()))[0];
    assert(stakedBalance === 0, "Staked asset balance not empty");

    const rewardBalance = op.AssetHolding.assetBalance(Global.currentApplicationAddress, Asset(this.reward_asset_id.value.asUint64()))[0];
    assert(rewardBalance === 0, "Reward asset balance not empty");

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

  private pow10(exponent: uint64): uint64 {
    let result: uint64 = 1;
    let i: uint64 = 0;
    while (i < exponent) {
      result = result * 10;
      i = i + 1;
    }
    return result;
  }
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
