/**
 * Indian statutory + discount-broker charge rates.
 * As of 1 April 2026 (STT on F&O revised in Union Budget 2026-27).
 * All values are editable from the Settings page — verify with your broker's contract note.
 */
export type Segment = 'delivery' | 'intraday' | 'futures' | 'options';

export interface SegmentRates {
  /** brokerage as a fraction of turnover per order (0 = flat only) */
  brokeragePct: number;
  /** flat/max brokerage per executed order, ₹ */
  brokerageCap: number;
  /** 'flat' = always brokerageCap; 'min' = min(cap, pct × value); 'zero' = free */
  brokerageMode: 'flat' | 'min' | 'zero';
  sttBuy: number;
  sttSell: number;
  exchange: number; // NSE transaction charges, both sides
  stampBuy: number;
  dpPerSell: number; // ₹ per scrip on delivery sell
}

export interface ChargeRates {
  asOf: string;
  sebiPerCrore: number; // ₹10 per crore
  gst: number; // 18%
  segments: Record<Segment, SegmentRates>;
}

export const DEFAULT_RATES: ChargeRates = {
  asOf: '2026-04-01',
  sebiPerCrore: 10,
  gst: 0.18,
  segments: {
    delivery: { brokeragePct: 0, brokerageCap: 0, brokerageMode: 'zero', sttBuy: 0.001, sttSell: 0.001, exchange: 0.0000297, stampBuy: 0.00015, dpPerSell: 15.34 },
    intraday: { brokeragePct: 0.0003, brokerageCap: 20, brokerageMode: 'min', sttBuy: 0, sttSell: 0.00025, exchange: 0.0000297, stampBuy: 0.00003, dpPerSell: 0 },
    futures: { brokeragePct: 0.0003, brokerageCap: 20, brokerageMode: 'min', sttBuy: 0, sttSell: 0.0005, exchange: 0.0000173, stampBuy: 0.00002, dpPerSell: 0 },
    options: { brokeragePct: 0, brokerageCap: 20, brokerageMode: 'flat', sttBuy: 0, sttSell: 0.0015, exchange: 0.0003503, stampBuy: 0.00003, dpPerSell: 0 },
  },
};

export const SEGMENT_LABEL: Record<Segment, string> = {
  delivery: 'Equity Delivery',
  intraday: 'Equity Intraday',
  futures: 'Futures',
  options: 'Options',
};
