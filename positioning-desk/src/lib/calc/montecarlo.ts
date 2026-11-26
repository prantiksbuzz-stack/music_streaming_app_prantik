/** Monte Carlo equity-curve simulation for a trading system. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface MCInput {
  start: number;
  winRate: number; // fraction
  avgWinR: number; // reward multiple on winners
  lossR?: number; // usually 1
  riskPct: number; // fraction of equity risked per trade
  trades: number;
  runs: number;
  compounding?: boolean;
  /** equity level (fraction of start) treated as ruin */
  ruinLevel?: number;
  /** per-trade cost as a fraction of R (charges/slippage) */
  costR?: number;
  seed?: number;
}

export interface MCResult {
  curves: number[][];
  p5: number[];
  p50: number[];
  p95: number[];
  finals: number[];
  maxDrawdowns: number[];
  ruinProb: number;
  medianFinal: number;
  medianMaxDD: number;
  worstMaxDD: number;
  probProfit: number;
  expectancyR: number;
  kelly: number;
  longestLosingStreak: number;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const b = Math.floor(pos);
  const rest = pos - b;
  return sorted[b + 1] !== undefined ? sorted[b] + rest * (sorted[b + 1] - sorted[b]) : sorted[b];
}

export const expectancy = (wr: number, avgWinR: number, lossR = 1, costR = 0) => wr * avgWinR - (1 - wr) * lossR - costR;
/** Kelly fraction of equity to risk for an R-based system */
export const kellyFraction = (wr: number, avgWinR: number) => (avgWinR > 0 ? wr - (1 - wr) / avgWinR : 0);

export function simulate(i: MCInput): MCResult {
  const rnd = mulberry32(i.seed ?? 42);
  const lossR = i.lossR ?? 1;
  const ruinLevel = i.ruinLevel ?? 0.5;
  const costR = i.costR ?? 0;
  const compounding = i.compounding ?? true;
  const curves: number[][] = [];
  const finals: number[] = [];
  const dds: number[] = [];
  let ruined = 0;
  let longest = 0;
  for (let r = 0; r < i.runs; r++) {
    let eq = i.start;
    let peak = eq;
    let maxDD = 0;
    let hitRuin = false;
    let streak = 0;
    const curve = [eq];
    for (let t = 0; t < i.trades; t++) {
      const riskAmt = (compounding ? eq : i.start) * i.riskPct;
      const win = rnd() < i.winRate;
      const rMult = (win ? i.avgWinR : -lossR) - costR;
      eq = Math.max(0, eq + riskAmt * rMult);
      if (win) streak = 0; else { streak++; longest = Math.max(longest, streak); }
      peak = Math.max(peak, eq);
      maxDD = Math.max(maxDD, peak > 0 ? (peak - eq) / peak : 0);
      if (eq <= i.start * ruinLevel) hitRuin = true;
      curve.push(eq);
    }
    if (hitRuin) ruined++;
    curves.push(curve);
    finals.push(eq);
    dds.push(maxDD);
  }
  const p5: number[] = [], p50: number[] = [], p95: number[] = [];
  for (let t = 0; t <= i.trades; t++) {
    const col = curves.map((c) => c[t]).sort((a, b) => a - b);
    p5.push(quantile(col, 0.05));
    p50.push(quantile(col, 0.5));
    p95.push(quantile(col, 0.95));
  }
  const sf = [...finals].sort((a, b) => a - b);
  const sd = [...dds].sort((a, b) => a - b);
  return {
    curves,
    p5,
    p50,
    p95,
    finals,
    maxDrawdowns: dds,
    ruinProb: i.runs ? ruined / i.runs : 0,
    medianFinal: quantile(sf, 0.5),
    medianMaxDD: quantile(sd, 0.5),
    worstMaxDD: sd[sd.length - 1] ?? 0,
    probProfit: i.runs ? finals.filter((f) => f > i.start).length / i.runs : 0,
    expectancyR: expectancy(i.winRate, i.avgWinR, lossR, costR),
    kelly: kellyFraction(i.winRate, i.avgWinR),
    longestLosingStreak: longest,
  };
}

/** Histogram bins helper */
export function histogram(values: number[], bins: number, min?: number, max?: number) {
  const lo = min ?? Math.min(...values);
  const hi = max ?? Math.max(...values);
  const w = (hi - lo) / bins || 1;
  const out = Array.from({ length: bins }, (_, k) => ({ x0: lo + k * w, x1: lo + (k + 1) * w, count: 0 }));
  for (const v of values) {
    const k = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / w)));
    out[k].count++;
  }
  return out;
}
