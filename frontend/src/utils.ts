import * as algokit from "@algorandfoundation/algokit-utils";
import { NETWORK_TOKEN, getAlgodServer } from "./constants/constants";
import type { NetworkType } from "./context/networkContext";

// Get the current network from localStorage
function getCurrentNetwork(): NetworkType {
  const stored = localStorage.getItem('orbital-preferred-network');
  return (stored as NetworkType) || 'testnet';
}

export function getAlgod(network?: NetworkType) {
  const currentNetwork = network || getCurrentNetwork();
  
  const algorand = algokit.AlgorandClient.fromConfig({
    algodConfig: {
      server: getAlgodServer(currentNetwork),
      token: NETWORK_TOKEN,
    }
  });
  algorand.setDefaultValidityWindow(1000);

  return algorand.client.algod;
}

export const BASIS_POINTS = 10000n;

export function utilNormBps(totalDeposits: bigint, totalBorrows: bigint, utilCapBps: bigint) {
  if (totalDeposits === 0n) return 0n;
  // capBorrow = floor(D * util_cap_bps / 10_000)
  const capBorrow = (totalDeposits * utilCapBps) / BASIS_POINTS;
  if (capBorrow === 0n) return 0n;
  const cappedB = totalBorrows <= capBorrow ? totalBorrows : capBorrow;
  return (cappedB * BASIS_POINTS) / capBorrow; // 0..10_000
}

/**
 * APR (bps) from normalized utilization for the kinked model.
 * Params: { base_bps, kink_norm_bps, slope1_bps, slope2_bps, max_apr_bps }
 */
export function aprBpsKinked(U_norm_bps: bigint, params: {
  base_bps: bigint,
  kink_norm_bps: bigint,
  slope1_bps: bigint,
  slope2_bps: bigint,
  max_apr_bps: bigint
}) {
  const {
    base_bps,
    kink_norm_bps,
    slope1_bps,
    slope2_bps,
    max_apr_bps = 0n,
  } = params;

  let apr;
  if (U_norm_bps <= kink_norm_bps) {
    // base + slope1 * U / kink
    apr = base_bps + (slope1_bps * U_norm_bps) / kink_norm_bps;
  } else {
    // base + slope1 + slope2 * (U - kink) / (1 - kink)
    const over = U_norm_bps - kink_norm_bps;
    const denom = BASIS_POINTS - kink_norm_bps;
    apr = base_bps + slope1_bps + (slope2_bps * over) / denom;
  }
  if (max_apr_bps > 0n && apr > max_apr_bps) apr = max_apr_bps;
  return apr;
}

export function currentAprBps(state: {
  totalDeposits: bigint
  totalBorrows: bigint
  base_bps: bigint
  util_cap_bps: bigint
  kink_norm_bps: bigint
  slope1_bps: bigint
  slope2_bps: bigint
  max_apr_bps: bigint
  ema_alpha_bps: bigint
  max_apr_step_bps: bigint
  prev_apr_bps: bigint
  util_ema_bps: bigint
  rate_model_type: bigint // 0 = kinked, 1 = fixed-rate fallback
  interest_bps_fallback: bigint // used if rate_model_type is 1
}) {
  const {
    totalDeposits,
    totalBorrows,
    base_bps,
    util_cap_bps,
    kink_norm_bps,
    slope1_bps,
    slope2_bps,
    max_apr_bps = 0n,
    ema_alpha_bps = 0n,
    max_apr_step_bps = 0n,
    prev_apr_bps = 0n,
    util_ema_bps = 0n,
    rate_model_type = 0n,
    interest_bps_fallback = 0n,
  } = state;

  // 1) Utilization (normalized 0..10_000 over the capped band)
  const U_raw = utilNormBps(totalDeposits, totalBorrows, util_cap_bps);

  // 2) Optional EMA smoothing
  let U_used;
  let next_util_ema_bps = util_ema_bps;
  if (ema_alpha_bps === 0n) {
    U_used = U_raw;
  } else {
    // U_smooth = α*U_raw + (1-α)*prev
    const oneMinus = BASIS_POINTS - ema_alpha_bps;
    U_used =
      (ema_alpha_bps * U_raw) / BASIS_POINTS +
      (oneMinus * util_ema_bps) / BASIS_POINTS;
    next_util_ema_bps = U_used;
  }

  // 3) Base APR from selected model
  let apr_bps =
    rate_model_type === 0n
      ? aprBpsKinked(U_used, {
          base_bps,
          kink_norm_bps,
          slope1_bps,
          slope2_bps,
          max_apr_bps,
        })
      : interest_bps_fallback; // fixed-rate fallback if you want it

  // 4) Optional per-step change limiter
  if (max_apr_step_bps > 0n) {
    const prev = prev_apr_bps === 0n ? base_bps : prev_apr_bps;
    const lo = prev > max_apr_step_bps ? prev - max_apr_step_bps : 0n;
    const hi = prev + max_apr_step_bps;
    if (apr_bps < lo) apr_bps = lo;
    if (apr_bps > hi) apr_bps = hi;
  }

  return {
    apr_bps,
    next_prev_apr_bps: apr_bps,
    next_util_ema_bps,
  };
}