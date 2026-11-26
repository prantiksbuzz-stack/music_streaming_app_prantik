/**
 * Leveraged crypto position sizing (BTC / ETH) — mirrors "BTC Trade (USD)" sheet,
 * extended with liquidation, fees, funding and Indian tax estimates.
 */
import { dirOf, type Side } from './sizing';

export interface CryptoInput {
  account: number; // USD
  riskPct: number; // fraction
  leverage: number;
  open: number;
  entry: number;
  stop: number;
  rr: number;
  side?: Side;
  /** optional explicit target; overrides rr when given */
  targetPrice?: number;
  bandOffset?: number; // points from open
  usdinr: number;
  /** maintenance margin rate, fraction (default 0.5%) */
  mmr?: number;
  /** taker fee per side, fraction */
  feeRate?: number;
  /** funding rate per 8h, fraction */
  fundingRate?: number;
  holdHours?: number;
}

export interface CryptoResult {
  dir: 1 | -1;
  riskAmount: number;
  slDistance: number;
  slPct: number;
  positionUSD: number;
  qty: number;
  margin: number;
  marginPctOfAccount: number;
  rr: number;
  targetPrice: number;
  targetPct: number;
  profit: number;
  upperBand: number;
  lowerBand: number;
  liquidationPrice: number;
  liqDistancePct: number;
  stopBeyondLiquidation: boolean;
  maxSafeLeverage: number;
  fees: number;
  funding: number;
  netProfit: number;
  netLoss: number;
  inr: (usd: number) => number;
  taxIndia: number;
  tdsIndia: number;
  warnings: string[];
}

export function computeCrypto(i: CryptoInput): CryptoResult {
  const side = i.side ?? 'long';
  const d = dirOf(side);
  const mmr = i.mmr ?? 0.005;
  const feeRate = i.feeRate ?? 0.0005;
  const fundingRate = i.fundingRate ?? 0.0001;
  const holdHours = i.holdHours ?? 8;
  const warnings: string[] = [];

  const riskAmount = i.account * i.riskPct;
  const slDistance = Math.abs(i.entry - i.stop);
  const slPct = i.entry > 0 ? slDistance / i.entry : 0;
  const wrongSide = d * (i.entry - i.stop) <= 0;
  if (wrongSide && i.entry > 0) warnings.push(side === 'long' ? 'Stop must be below entry for a long.' : 'Stop must be above entry for a short.');

  const positionUSD = slPct > 0 && !wrongSide ? riskAmount / slPct : 0;
  const qty = i.entry > 0 ? positionUSD / i.entry : 0;
  const margin = i.leverage > 0 ? positionUSD / i.leverage : 0;

  let targetPrice: number;
  let rr: number;
  if (i.targetPrice !== undefined && i.targetPrice > 0) {
    targetPrice = i.targetPrice;
    rr = slDistance > 0 ? (d * (targetPrice - i.entry)) / slDistance : 0;
  } else {
    rr = i.rr;
    targetPrice = i.entry + d * rr * slDistance;
  }
  const targetPct = slPct * rr;
  const profit = positionUSD * targetPct;

  const band = i.bandOffset ?? 500;
  const liqMove = Math.max(0, 1 / Math.max(i.leverage, 1e-9) - mmr);
  const liquidationPrice = i.entry * (1 - d * liqMove);
  const stopBeyondLiquidation = positionUSD > 0 && slPct >= liqMove;
  const maxSafeLeverage = slPct > 0 ? 1 / (slPct + mmr) : Infinity;
  if (stopBeyondLiquidation) {
    warnings.push(
      `At ${i.leverage}x you get liquidated ${(liqMove * 100).toFixed(2)}% away, before your ${(slPct * 100).toFixed(2)}% stop. Keep leverage under ${Math.floor(maxSafeLeverage)}x.`,
    );
  }
  if (margin > i.account) warnings.push('Margin required is more than the account balance: lower the risk or raise leverage.');

  const fees = positionUSD * feeRate * 2;
  const funding = positionUSD * fundingRate * (holdHours / 8);
  const netProfit = profit - fees - funding;
  const netLoss = -(riskAmount + fees + funding);
  const exitValue = qty * targetPrice;
  return {
    dir: d,
    riskAmount,
    slDistance,
    slPct,
    positionUSD,
    qty,
    margin,
    marginPctOfAccount: i.account > 0 ? margin / i.account : 0,
    rr,
    targetPrice,
    targetPct,
    profit,
    upperBand: i.open + band,
    lowerBand: i.open - band,
    liquidationPrice,
    liqDistancePct: liqMove,
    stopBeyondLiquidation,
    maxSafeLeverage,
    fees,
    funding,
    netProfit,
    netLoss,
    inr: (usd: number) => usd * i.usdinr,
    // India VDA: 30% flat on gains (no loss set-off), 1% TDS on transfer value
    taxIndia: Math.max(0, netProfit) * 0.3,
    tdsIndia: exitValue * 0.01,
    warnings,
  };
}
