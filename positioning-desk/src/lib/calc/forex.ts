/** XAUUSD (spot gold CFD) sizing. Price quoted in USD per troy ounce. */
import { dirOf, floorTo, type Side } from './sizing';

export interface GoldInput {
  account: number; // USD
  riskPct: number;
  entry: number;
  stop: number;
  rr: number;
  leverage: number;
  side?: Side;
  contractSize?: number; // oz per standard lot (default 100)
  lotStep?: number; // default 0.01
  swapPerLotPerNight?: number; // USD, negative = cost
  nights?: number;
  commissionPerLot?: number; // round-turn USD
  usdinr: number;
}

export interface GoldResult {
  dir: 1 | -1;
  riskAmount: number;
  distance: number;
  slPct: number;
  rawLots: number;
  lots: number;
  ounces: number;
  notional: number;
  margin: number;
  valuePerPoint: number; // $ per $1 move for your size
  pipValuePerLot: number; // $ per 0.01 move per lot
  actualRisk: number;
  targetPrice: number;
  profit: number;
  swap: number;
  commission: number;
  netProfit: number;
  freeMargin: number;
  marginLevel: number;
  warnings: string[];
}

export function computeGold(i: GoldInput): GoldResult {
  const d = dirOf(i.side ?? 'long');
  const contract = i.contractSize ?? 100;
  const step = i.lotStep ?? 0.01;
  const warnings: string[] = [];
  const riskAmount = i.account * i.riskPct;
  const raw = d * (i.entry - i.stop);
  const distance = raw > 0 ? raw : 0;
  if (raw <= 0 && i.entry > 0) warnings.push('Stop is on the wrong side of entry.');
  const rawLots = distance > 0 ? riskAmount / (distance * contract) : 0;
  const lots = Number(floorTo(rawLots, step).toFixed(2));
  if (distance > 0 && lots < step) warnings.push(`Risk budget is too small for the minimum ${step} lot at this stop distance.`);
  const ounces = lots * contract;
  const notional = ounces * i.entry;
  const margin = i.leverage > 0 ? notional / i.leverage : 0;
  const actualRisk = ounces * distance;
  const targetPrice = i.entry + d * i.rr * distance;
  const profit = ounces * i.rr * distance;
  const swap = lots * (i.swapPerLotPerNight ?? 0) * (i.nights ?? 0);
  const commission = lots * (i.commissionPerLot ?? 0);
  if (margin > i.account) warnings.push('Margin required is more than your account.');
  return {
    dir: d,
    riskAmount,
    distance,
    slPct: i.entry > 0 ? distance / i.entry : 0,
    rawLots,
    lots,
    ounces,
    notional,
    margin,
    valuePerPoint: ounces,
    pipValuePerLot: contract * 0.01,
    actualRisk,
    targetPrice,
    profit,
    swap,
    commission,
    netProfit: profit + swap - commission,
    freeMargin: i.account - margin,
    marginLevel: margin > 0 ? i.account / margin : Infinity,
    warnings,
  };
}
