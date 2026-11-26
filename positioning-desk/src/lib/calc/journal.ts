export interface Trade {
  id: string;
  date: string; // yyyy-mm-dd
  instrument: string;
  assetClass: AssetClass;
  side: 'long' | 'short';
  entry: number;
  exit: number;
  qty: number;
  /** planned risk in account currency (for R-multiple) */
  risk: number;
  charges: number;
  notes?: string;
}

export type AssetClass = 'Index Options' | 'Stock Options' | 'Equity' | 'Intraday' | 'Crypto' | 'Gold';
export const ASSET_CLASSES: AssetClass[] = ['Index Options', 'Stock Options', 'Equity', 'Intraday', 'Crypto', 'Gold'];

export const tradePnl = (t: Trade) => (t.side === 'long' ? 1 : -1) * (t.exit - t.entry) * t.qty - t.charges;
export const tradeR = (t: Trade) => (t.risk > 0 ? tradePnl(t) / t.risk : 0);

export function journalStats(trades: Trade[]) {
  const pnls = trades.map(tradePnl);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);
  const total = pnls.reduce((a, b) => a + b, 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = -losses.reduce((a, b) => a + b, 0);
  const rs = trades.map(tradeR);
  let eq = 0, peak = 0, maxDD = 0;
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  const curve = sorted.map((t) => {
    eq += tradePnl(t);
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, peak - eq);
    return { date: t.date, equity: eq, instrument: t.instrument };
  });
  const byClass = new Map<string, number>();
  const byDay = new Map<string, number>();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  trades.forEach((t, k) => {
    byClass.set(t.assetClass, (byClass.get(t.assetClass) ?? 0) + pnls[k]);
    const d = days[new Date(t.date + 'T00:00:00').getDay()] ?? '?';
    byDay.set(d, (byDay.get(d) ?? 0) + pnls[k]);
  });
  return {
    count: trades.length,
    total,
    winRate: trades.length ? wins.length / trades.length : 0,
    avgWin: wins.length ? grossWin / wins.length : 0,
    avgLoss: losses.length ? grossLoss / losses.length : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    expectancy: trades.length ? total / trades.length : 0,
    avgR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0,
    rs,
    maxDD,
    curve,
    byClass: [...byClass.entries()].map(([name, value]) => ({ name, value })),
    byDay: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].filter((d) => byDay.has(d)).map((d) => ({ name: d, value: byDay.get(d)! })),
  };
}
