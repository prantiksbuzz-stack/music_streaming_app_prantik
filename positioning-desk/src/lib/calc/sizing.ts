/**
 * Core risk-based position sizing.
 * Mirrors the "Nifty Options" and "Indian Market" sheets of Risk_Management_Calculator.xlsx,
 * extended with short-side support and validation.
 */
export type Side = 'long' | 'short';
export type Rounding = 'lot' | 'int' | 'none';

export const DEFAULT_LADDER = [1.1, 1.2, 1.3, 1.5, 2.0];

export interface SizingInput {
  account: number;
  /** Risk as a fraction, e.g. 0.02 = 2% */
  riskPct: number;
  entry: number;
  stop: number;
  side?: Side;
  lotSize?: number;
  rounding?: Rounding;
  /** Highest price since entry (long) or lowest price since entry (short) — used for trailing SL */
  extreme?: number;
  ladder?: number[];
  customRR?: number;
}

export interface TargetRow {
  rr: number;
  price: number;
  pct: number;
  profit: number;
}

export interface SizingResult {
  dir: 1 | -1;
  riskBudget: number;
  riskPerUnit: number;
  slPct: number;
  rawQty: number;
  qty: number;
  lots: number;
  investment: number;
  actualRisk: number;
  actualRiskPct: number;
  unusedRisk: number;
  maxInitialLoss: number;
  targets: TargetRow[];
  tsl: number;
  pnlAtTsl: number;
  breakevenWinRate: number;
  customRR: number;
  warnings: string[];
}

export const dirOf = (side: Side = 'long'): 1 | -1 => (side === 'long' ? 1 : -1);

export function riskPerUnit(entry: number, stop: number, side: Side = 'long'): number {
  return dirOf(side) * (entry - stop);
}

/** Excel FLOOR(value, significance) for positive numbers */
export function floorTo(value: number, step: number): number {
  if (!isFinite(value) || step <= 0) return 0;
  // small epsilon protects against binary float noise (e.g. 130/65 = 1.9999999)
  return Math.floor(value / step + 1e-9) * step;
}

export const breakevenWinRate = (rr: number): number => (rr > -1 ? 1 / (1 + rr) : 0);

export function targetLadder(entry: number, rpu: number, qty: number, side: Side, ladder: number[]): TargetRow[] {
  const d = dirOf(side);
  return ladder.map((rr) => {
    const price = entry + d * rr * rpu;
    return {
      rr,
      price,
      pct: entry ? (d * (price - entry)) / entry : 0,
      profit: d * (price - entry) * qty,
    };
  });
}

export function computeSizing(input: SizingInput): SizingResult {
  const {
    account,
    riskPct,
    entry,
    stop,
    side = 'long',
    lotSize = 1,
    rounding = 'int',
    ladder = DEFAULT_LADDER,
    customRR = 2,
  } = input;
  const d = dirOf(side);
  const warnings: string[] = [];
  const rpuRaw = riskPerUnit(entry, stop, side);
  const valid = rpuRaw > 0 && entry > 0;
  if (entry > 0 && !(rpuRaw > 0)) {
    warnings.push(
      side === 'long'
        ? 'Stop loss must be below the entry price for a long trade.'
        : 'Stop loss must be above the entry price for a short trade.',
    );
  }
  const rpu = valid ? rpuRaw : 0;
  const riskBudget = Math.max(0, account * riskPct);
  const rawQty = valid ? riskBudget / rpu : 0;
  let qty = rawQty;
  if (rounding === 'lot') qty = floorTo(rawQty, Math.max(1, lotSize));
  else if (rounding === 'int') qty = Math.floor(rawQty + 1e-9);

  if (valid && rounding === 'lot' && qty === 0) {
    warnings.push(
      `Risk budget is too small for even 1 lot (needs ${(rpu * lotSize).toFixed(2)} of risk, budget is ${riskBudget.toFixed(2)}).`,
    );
  }
  const investment = qty * entry;
  if (investment > account && account > 0) {
    warnings.push('Position value is larger than the account: this needs leverage or margin.');
  }

  const extreme = input.extreme ?? entry;
  if (input.extreme !== undefined && valid) {
    if (side === 'long' && extreme < entry) warnings.push('Highest price is below entry: the trailing SL will sit under your original stop.');
    if (side === 'short' && extreme > entry) warnings.push('Lowest price is above entry: the trailing SL will sit over your original stop.');
  }
  const tsl = extreme - d * rpu;
  const actualRisk = qty * rpu;

  return {
    dir: d,
    riskBudget,
    riskPerUnit: rpu,
    slPct: valid ? rpu / entry : 0,
    rawQty,
    qty,
    lots: lotSize > 0 ? qty / lotSize : 0,
    investment,
    actualRisk,
    actualRiskPct: account > 0 ? actualRisk / account : 0,
    unusedRisk: riskBudget - actualRisk,
    maxInitialLoss: -actualRisk,
    targets: targetLadder(entry, rpu, qty, side, ladder),
    tsl,
    pnlAtTsl: d * (tsl - entry) * qty,
    breakevenWinRate: breakevenWinRate(customRR),
    customRR,
    warnings,
  };
}
