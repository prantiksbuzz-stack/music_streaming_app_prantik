/** Renko box sizing — mirrors "Sheet3" of the workbook. */
export type RenkoMarket = 'stock' | 'crypto';

export const RENKO_BASE = {
  /** Stocks: ATR length 5 on a 6-hour box */
  stock: { atrLength: 5, hours: 6, label: 'ATR(5) · 6H box' },
  /** Crypto trades 24x7: ATR length 7 on a 23-hour box */
  crypto: { atrLength: 7, hours: 23, label: 'ATR(7) · 23H box' },
} as const;

export interface RenkoBoxes {
  base: number;
  h1: number;
  m30: number;
  m15: number;
}

export function renkoBoxes(base: number, market: RenkoMarket): RenkoBoxes {
  const h1 = base / RENKO_BASE[market].hours;
  return { base, h1, m30: h1 / 2, m15: h1 / 4 };
}

/** Box size as a % of price — helps compare noise across names */
export const boxPct = (box: number, price?: number) => (price && price > 0 ? box / price : undefined);
