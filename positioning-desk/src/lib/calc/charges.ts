import { DEFAULT_RATES, type ChargeRates, type Segment } from '../../config/charges';

export interface ChargesInput {
  segment: Segment;
  buyValue: number; // ₹ turnover on buy side (premium turnover for options)
  sellValue: number;
  /** executed orders on each side (default 1 each) */
  buyOrders?: number;
  sellOrders?: number;
  rates?: ChargeRates;
}

export interface ChargeLine {
  key: string;
  label: string;
  value: number;
}

export interface ChargesResult {
  brokerage: number;
  stt: number;
  exchange: number;
  sebi: number;
  stamp: number;
  gst: number;
  dp: number;
  total: number;
  turnover: number;
  lines: ChargeLine[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function brokerageFor(value: number, orders: number, mode: 'flat' | 'min' | 'zero', pct: number, cap: number) {
  if (value <= 0 || orders <= 0) return 0;
  if (mode === 'zero') return 0;
  if (mode === 'flat') return cap * orders;
  return Math.min(cap * orders, value * pct);
}

export function computeCharges({ segment, buyValue, sellValue, buyOrders = 1, sellOrders = 1, rates = DEFAULT_RATES }: ChargesInput): ChargesResult {
  const s = rates.segments[segment];
  const turnover = buyValue + sellValue;
  const brokerage = brokerageFor(buyValue, buyOrders, s.brokerageMode, s.brokeragePct, s.brokerageCap) +
    brokerageFor(sellValue, sellOrders, s.brokerageMode, s.brokeragePct, s.brokerageCap);
  const stt = buyValue * s.sttBuy + sellValue * s.sttSell;
  const exchange = turnover * s.exchange;
  const sebi = (turnover * rates.sebiPerCrore) / 1e7;
  const stamp = buyValue * s.stampBuy;
  const gst = (brokerage + exchange + sebi) * rates.gst;
  const dp = sellValue > 0 ? s.dpPerSell : 0;
  const total = brokerage + stt + exchange + sebi + stamp + gst + dp;
  const lines: ChargeLine[] = [
    { key: 'brokerage', label: 'Brokerage', value: r2(brokerage) },
    { key: 'stt', label: 'STT', value: r2(stt) },
    { key: 'exchange', label: 'Exchange txn', value: r2(exchange) },
    { key: 'gst', label: 'GST', value: r2(gst) },
    { key: 'stamp', label: 'Stamp duty', value: r2(stamp) },
    { key: 'sebi', label: 'SEBI fee', value: r2(sebi) },
    { key: 'dp', label: 'DP charges', value: r2(dp) },
  ];
  return { brokerage, stt, exchange, sebi, stamp, gst, dp, total, turnover, lines };
}

/** Round-trip charges for a long or short trade between two prices */
export function roundTrip(segment: Segment, qty: number, entry: number, exit: number, side: 'long' | 'short' = 'long', rates?: ChargeRates) {
  const buy = side === 'long' ? entry : exit;
  const sell = side === 'long' ? exit : entry;
  return computeCharges({ segment, buyValue: qty * buy, sellValue: qty * sell, rates });
}

/** Indian equity capital gains (FY 2025-26 onward): STCG 20%, LTCG 12.5% above ₹1.25L exemption */
export function equityTax(gain: number, holdingDays: number, ltcgExemptionLeft = 125000) {
  if (gain <= 0) return { type: holdingDays > 365 ? 'LTCG' : 'STCG', tax: 0, rate: 0 };
  if (holdingDays > 365) {
    const taxable = Math.max(0, gain - ltcgExemptionLeft);
    return { type: 'LTCG' as const, tax: taxable * 0.125 * 1.04, rate: 0.125 };
  }
  return { type: 'STCG' as const, tax: gain * 0.2 * 1.04, rate: 0.2 };
}
