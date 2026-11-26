/** Black-Scholes pricing, Greeks, IV solver and multi-leg payoff analytics. */
export type OptType = 'CE' | 'PE';
export type LegSide = 'buy' | 'sell';

export interface Leg {
  id: string;
  type: OptType;
  side: LegSide;
  strike: number;
  premium: number;
  lots: number;
  iv: number; // fraction, e.g. 0.14
}

/** erf via Abramowitz & Stegun 7.1.26 (|err| < 1.5e-7) */
function erf(x: number): number {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}
export const normCdf = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
export const normPdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

export interface BSInput {
  type: OptType;
  S: number;
  K: number;
  /** time to expiry in years */
  T: number;
  r: number;
  sigma: number;
  q?: number;
}

export function bsPrice({ type, S, K, T, r, sigma, q = 0 }: BSInput): number {
  if (T <= 0 || sigma <= 0) return Math.max(0, type === 'CE' ? S - K : K - S);
  const sqT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqT);
  const d2 = d1 - sigma * sqT;
  if (type === 'CE') return S * Math.exp(-q * T) * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2);
  return K * Math.exp(-r * T) * normCdf(-d2) - S * Math.exp(-q * T) * normCdf(-d1);
}

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  /** per calendar day */
  theta: number;
  /** per 1 vol point (1%) */
  vega: number;
  /** per 1% rate change */
  rho: number;
}

export function bsGreeks(i: BSInput): Greeks {
  const { type, S, K, T, r, sigma, q = 0 } = i;
  const price = bsPrice(i);
  if (T <= 0 || sigma <= 0) {
    const itm = type === 'CE' ? S > K : S < K;
    return { price, delta: itm ? (type === 'CE' ? 1 : -1) : 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }
  const sqT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqT);
  const d2 = d1 - sigma * sqT;
  const eq = Math.exp(-q * T);
  const er = Math.exp(-r * T);
  const gamma = (eq * normPdf(d1)) / (S * sigma * sqT);
  const vega = (S * eq * normPdf(d1) * sqT) / 100;
  let delta: number, theta: number, rho: number;
  if (type === 'CE') {
    delta = eq * normCdf(d1);
    theta = (-(S * eq * normPdf(d1) * sigma) / (2 * sqT) - r * K * er * normCdf(d2) + q * S * eq * normCdf(d1)) / 365;
    rho = (K * T * er * normCdf(d2)) / 100;
  } else {
    delta = -eq * normCdf(-d1);
    theta = (-(S * eq * normPdf(d1) * sigma) / (2 * sqT) + r * K * er * normCdf(-d2) - q * S * eq * normCdf(-d1)) / 365;
    rho = (-K * T * er * normCdf(-d2)) / 100;
  }
  return { price, delta, gamma, theta, vega, rho };
}

/** Implied volatility by bisection (robust) — returns fraction or NaN */
export function impliedVol(target: number, base: Omit<BSInput, 'sigma'>): number {
  const intrinsic = Math.max(0, base.type === 'CE' ? base.S - base.K : base.K - base.S);
  if (target <= intrinsic || base.T <= 0) return NaN;
  let lo = 0.0001, hi = 5;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const p = bsPrice({ ...base, sigma: mid });
    if (p > target) hi = mid; else lo = mid;
    if (hi - lo < 1e-6) break;
  }
  return (lo + hi) / 2;
}

const sgn = (s: LegSide) => (s === 'buy' ? 1 : -1);

/** P&L of the whole strategy at expiry for a given spot */
export function payoffAtExpiry(legs: Leg[], S: number, lotSize: number): number {
  return legs.reduce((acc, l) => {
    const intrinsic = Math.max(0, l.type === 'CE' ? S - l.strike : l.strike - S);
    return acc + sgn(l.side) * (intrinsic - l.premium) * l.lots * lotSize;
  }, 0);
}

/** Theoretical P&L before expiry (BS mark-to-model) */
export function payoffAtT(legs: Leg[], S: number, lotSize: number, daysLeft: number, r = 0.065): number {
  const T = Math.max(0, daysLeft) / 365;
  return legs.reduce((acc, l) => {
    const v = bsPrice({ type: l.type, S, K: l.strike, T, r, sigma: l.iv });
    return acc + sgn(l.side) * (v - l.premium) * l.lots * lotSize;
  }, 0);
}

export function strategyGreeks(legs: Leg[], S: number, lotSize: number, daysLeft: number, r = 0.065): Greeks {
  const T = Math.max(0, daysLeft) / 365;
  const out: Greeks = { price: 0, delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  for (const l of legs) {
    const g = bsGreeks({ type: l.type, S, K: l.strike, T, r, sigma: l.iv });
    const m = sgn(l.side) * l.lots * lotSize;
    out.price += g.price * m;
    out.delta += g.delta * m;
    out.gamma += g.gamma * m;
    out.theta += g.theta * m;
    out.vega += g.vega * m;
    out.rho += g.rho * m;
  }
  return out;
}

export interface PayoffStats {
  maxProfit: number; // Infinity if unlimited
  maxLoss: number; // -Infinity if unlimited
  breakevens: number[];
  netPremium: number; // + = credit received
  probProfit: number; // lognormal approx at expiry
}

export function analyseStrategy(legs: Leg[], spot: number, lotSize: number, daysLeft: number, iv = 0.14): PayoffStats {
  const strikes = legs.map((l) => l.strike);
  const lo = Math.max(0.01, Math.min(spot, ...strikes) * 0.5);
  const hi = Math.max(spot, ...strikes) * 1.5;
  const N = 1200;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) {
    const S = lo + ((hi - lo) * i) / N;
    xs.push(S);
    ys.push(payoffAtExpiry(legs, S, lotSize));
  }
  // slope at the upper tail decides unlimited profit/loss on the upside
  const callSlope = legs.reduce((a, l) => a + (l.type === 'CE' ? sgn(l.side) * l.lots : 0), 0);
  let maxProfit = Math.max(...ys);
  let maxLoss = Math.min(...ys);
  if (callSlope > 0) maxProfit = Infinity;
  if (callSlope < 0) maxLoss = -Infinity;
  // include S→0 tail exactly
  const atZero = payoffAtExpiry(legs, 0, lotSize);
  maxProfit = Math.max(maxProfit, atZero);
  maxLoss = Math.min(maxLoss, atZero);

  const breakevens: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    if ((ys[i - 1] < 0 && ys[i] >= 0) || (ys[i - 1] > 0 && ys[i] <= 0)) {
      const x = xs[i - 1] + ((0 - ys[i - 1]) * (xs[i] - xs[i - 1])) / (ys[i] - ys[i - 1]);
      if (!breakevens.some((b) => Math.abs(b - x) < (hi - lo) / N * 2)) breakevens.push(x);
    }
  }
  const netPremium = legs.reduce((a, l) => a - sgn(l.side) * l.premium * l.lots * lotSize, 0);

  // probability of profit using lognormal terminal distribution
  const T = Math.max(daysLeft, 0.5) / 365;
  const sd = iv * Math.sqrt(T);
  let prob = 0;
  for (let i = 1; i < xs.length; i++) {
    if (ys[i] > 0) {
      const a = (Math.log(xs[i - 1] / spot) + 0.5 * sd * sd) / sd;
      const b = (Math.log(xs[i] / spot) + 0.5 * sd * sd) / sd;
      prob += normCdf(b) - normCdf(a);
    }
  }
  if (ys[ys.length - 1] > 0) prob += 1 - normCdf((Math.log(hi / spot) + 0.5 * sd * sd) / sd);
  if (ys[0] > 0) prob += normCdf((Math.log(lo / spot) + 0.5 * sd * sd) / sd);
  return { maxProfit, maxLoss, breakevens, netPremium, probProfit: Math.min(1, Math.max(0, prob)) };
}

export type PresetKey =
  | 'long_call' | 'long_put' | 'short_call' | 'short_put'
  | 'bull_call_spread' | 'bear_put_spread' | 'bull_put_spread' | 'bear_call_spread'
  | 'long_straddle' | 'short_straddle' | 'long_strangle' | 'short_strangle'
  | 'iron_condor' | 'iron_butterfly';

export const PRESETS: { key: PresetKey; label: string; view: string }[] = [
  { key: 'long_call', label: 'Long Call', view: 'Bullish' },
  { key: 'long_put', label: 'Long Put', view: 'Bearish' },
  { key: 'short_call', label: 'Short Call', view: 'Bearish / neutral' },
  { key: 'short_put', label: 'Short Put', view: 'Bullish / neutral' },
  { key: 'bull_call_spread', label: 'Bull Call Spread', view: 'Moderately bullish' },
  { key: 'bear_put_spread', label: 'Bear Put Spread', view: 'Moderately bearish' },
  { key: 'bull_put_spread', label: 'Bull Put Spread', view: 'Bullish, credit' },
  { key: 'bear_call_spread', label: 'Bear Call Spread', view: 'Bearish, credit' },
  { key: 'long_straddle', label: 'Long Straddle', view: 'Big move expected' },
  { key: 'short_straddle', label: 'Short Straddle', view: 'Range-bound' },
  { key: 'long_strangle', label: 'Long Strangle', view: 'Big move, cheaper' },
  { key: 'short_strangle', label: 'Short Strangle', view: 'Range-bound, wider' },
  { key: 'iron_condor', label: 'Iron Condor', view: 'Range-bound, defined risk' },
  { key: 'iron_butterfly', label: 'Iron Butterfly', view: 'Pin near ATM, defined risk' },
];

let _id = 0;
const nid = () => `leg${++_id}${Date.now().toString(36)}`;

/** Build a preset with theoretical premiums from BS */
export function buildPreset(key: PresetKey, spot: number, step: number, daysLeft: number, iv: number, r = 0.065): Leg[] {
  const atm = Math.round(spot / step) * step;
  const T = Math.max(daysLeft, 0.25) / 365;
  const mk = (type: OptType, side: LegSide, strike: number): Leg => ({
    id: nid(),
    type,
    side,
    strike,
    lots: 1,
    iv,
    premium: Math.max(0.05, Math.round(bsPrice({ type, S: spot, K: strike, T, r, sigma: iv }) * 20) / 20),
  });
  const w = step * 2;
  switch (key) {
    case 'long_call': return [mk('CE', 'buy', atm)];
    case 'long_put': return [mk('PE', 'buy', atm)];
    case 'short_call': return [mk('CE', 'sell', atm)];
    case 'short_put': return [mk('PE', 'sell', atm)];
    case 'bull_call_spread': return [mk('CE', 'buy', atm), mk('CE', 'sell', atm + w)];
    case 'bear_put_spread': return [mk('PE', 'buy', atm), mk('PE', 'sell', atm - w)];
    case 'bull_put_spread': return [mk('PE', 'sell', atm), mk('PE', 'buy', atm - w)];
    case 'bear_call_spread': return [mk('CE', 'sell', atm), mk('CE', 'buy', atm + w)];
    case 'long_straddle': return [mk('CE', 'buy', atm), mk('PE', 'buy', atm)];
    case 'short_straddle': return [mk('CE', 'sell', atm), mk('PE', 'sell', atm)];
    case 'long_strangle': return [mk('CE', 'buy', atm + w), mk('PE', 'buy', atm - w)];
    case 'short_strangle': return [mk('CE', 'sell', atm + w), mk('PE', 'sell', atm - w)];
    case 'iron_condor': return [mk('PE', 'buy', atm - 2 * w), mk('PE', 'sell', atm - w), mk('CE', 'sell', atm + w), mk('CE', 'buy', atm + 2 * w)];
    case 'iron_butterfly': return [mk('PE', 'buy', atm - w), mk('PE', 'sell', atm), mk('CE', 'sell', atm), mk('CE', 'buy', atm + w)];
  }
}
