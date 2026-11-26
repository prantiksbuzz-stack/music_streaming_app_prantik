import { computeSizing, floorTo } from './sizing';
import { computeMargin } from './margin';
import { renkoBoxes } from './renko';
import { computeCrypto } from './crypto';
import { computeGold } from './forex';
import { computeCharges, equityTax } from './charges';
import { bsPrice, bsGreeks, impliedVol, payoffAtExpiry, analyseStrategy, buildPreset, type Leg } from './options';
import { simulate, expectancy, kellyFraction } from './montecarlo';
import { journalStats, type Trade } from './journal';
import { money } from '../format';

const close = (a: number, b: number, dp = 2) => expect(a).toBeCloseTo(b, dp);

describe('Excel: Nifty Options sheet', () => {
  const r = computeSizing({ account: 3300, riskPct: 0.08, entry: 44.6, stop: 41, lotSize: 65, rounding: 'lot', extreme: 9, customRR: 2 });
  it('sizes to whole lots with FLOOR(risk/rpu, lot)', () => {
    close(r.riskBudget, 264);
    close(r.riskPerUnit, 3.6);
    close(r.slPct, 0.080717, 5);
    expect(r.qty).toBe(65);
    expect(r.lots).toBe(1);
    close(r.investment, 2899);
  });
  it('builds the R target ladder', () => {
    expect(r.targets.map((t) => t.rr)).toEqual([1.1, 1.2, 1.3, 1.5, 2]);
    close(r.targets[0].price, 48.56);
    close(r.targets[0].pct, 0.088789, 5);
    close(r.targets[0].profit, 257.4);
    close(r.targets[4].price, 51.8);
    close(r.targets[4].profit, 468);
  });
  it('reproduces TSL, P&L at TSL, max loss and breakeven win rate', () => {
    close(r.tsl, 5.4);
    close(r.pnlAtTsl, -2548);
    close(r.maxInitialLoss, -234);
    close(r.breakevenWinRate, 1 / 3, 6);
    expect(r.warnings.some((w) => w.includes('Highest price is below entry'))).toBe(true);
  });
  it('handles Excel float noise in FLOOR', () => {
    expect(floorTo(130 / 65 * 65, 65)).toBe(130);
  });
});

describe('Excel: Indian Market sheet', () => {
  it('matches the sheet (fractional) and floors when asked', () => {
    const raw = computeSizing({ account: 10000, riskPct: 0.02, entry: 458, stop: 440, rounding: 'none', extreme: 464 });
    close(raw.riskBudget, 200);
    close(raw.riskPerUnit, 18);
    close(raw.qty, 11.1111, 3);
    close(raw.investment, 5088.89);
    close(raw.tsl, 446);
    close(raw.pnlAtTsl, -133.33);
    const whole = computeSizing({ account: 10000, riskPct: 0.02, entry: 458, stop: 440, rounding: 'int' });
    expect(whole.qty).toBe(11);
    close(whole.investment, 5038);
  });
  it('supports short trades', () => {
    const s = computeSizing({ account: 10000, riskPct: 0.02, entry: 458, stop: 476, side: 'short', rounding: 'int' });
    expect(s.qty).toBe(11);
    close(s.targets[4].price, 422);
    close(s.targets[4].profit, 396);
  });
  it('flags a stop on the wrong side', () => {
    const s = computeSizing({ account: 10000, riskPct: 0.02, entry: 458, stop: 470 });
    expect(s.qty).toBe(0);
    expect(s.warnings.length).toBeGreaterThan(0);
  });
});

describe('Excel: Sheet2 intraday margin', () => {
  it('matches buying power maths', () => {
    const m = computeMargin({ margin: 19461.3, leverage: 5, ltp: 277.2 });
    close(m.buyingPower, 97306.5);
    expect(m.maxShares).toBe(351);
    close(m.positionValue, 97297.2);
    close(m.marginUsed, 19459.44);
    close(m.remainingMargin, 1.86);
    close(m.unusedBuyingPower, 9.3);
  });
  it('caps by risk quantity', () => {
    const m = computeMargin({ margin: 19461.3, leverage: 5, ltp: 277.2, riskQty: 120.7 });
    expect(m.finalQty).toBe(120);
    expect(m.limitedBy).toBe('risk');
  });
});

describe('Excel: Sheet3 Renko', () => {
  it('stock 6H box', () => {
    const b = renkoBoxes(35, 'stock');
    close(b.h1, 5.8333, 3);
    close(b.m30, 2.9167, 3);
  });
  it('crypto 23H box', () => {
    const b = renkoBoxes(2500, 'crypto');
    close(b.h1, 108.696, 2);
    close(b.m30, 54.348, 2);
  });
});

describe('Excel: BTC Trade (USD)', () => {
  const usdinr = 5438.788359 / 58.82;
  const c = computeCrypto({ account: 58.82, riskPct: 0.1, leverage: 200, open: 74492, entry: 74493, stop: 74493 - 250, rr: 2, bandOffset: 500, usdinr, mmr: 0.005 });
  it('reproduces sizing', () => {
    close(c.riskAmount, 5.882, 4);
    close(c.slPct, 0.003356, 5);
    close(c.positionUSD, 1752.66, 1);
    close(c.qty, 0.023527, 5);
    close(c.margin, 8.763, 2);
    close(c.targetPct, 0.006712, 5);
    close(c.profit, 11.764, 2);
    close(c.inr(c.riskAmount), 543.88, 1);
    close(c.inr(c.positionUSD), 162060.66, 0);
    close(c.inr(c.profit), 1087.76, 1);
    expect(c.upperBand).toBe(74992);
    expect(c.lowerBand).toBe(73992);
  });
  it('derives the target from RR (sheet hard-codes +750 = 3R)', () => {
    close(c.targetPrice, 74993);
    const fixed = computeCrypto({ account: 58.82, riskPct: 0.1, leverage: 200, open: 74492, entry: 74493, stop: 74243, rr: 2, targetPrice: 74493 + 750, usdinr });
    close(fixed.rr, 3);
  });
  it('warns that 200x liquidates before the stop', () => {
    expect(c.stopBeyondLiquidation).toBe(true);
    expect(Math.floor(c.maxSafeLeverage)).toBe(119);
    const safe = computeCrypto({ account: 58.82, riskPct: 0.1, leverage: 50, open: 74492, entry: 74493, stop: 74243, rr: 2, usdinr });
    expect(safe.stopBeyondLiquidation).toBe(false);
  });
});

describe('XAUUSD', () => {
  it('sizes lots from risk', () => {
    const g = computeGold({ account: 10000, riskPct: 0.01, entry: 2650, stop: 2640, rr: 2, leverage: 100, usdinr: 90 });
    close(g.rawLots, 0.1);
    close(g.lots, 0.1);
    close(g.ounces, 10);
    close(g.notional, 26500);
    close(g.margin, 265);
    close(g.actualRisk, 100);
    close(g.targetPrice, 2670);
    close(g.profit, 200);
    close(g.pipValuePerLot, 1);
  });
});

describe('Indian charges', () => {
  it('delivery round trip', () => {
    const c = computeCharges({ segment: 'delivery', buyValue: 100000, sellValue: 110000 });
    close(c.stt, 210);
    close(c.exchange, 6.237, 3);
    close(c.sebi, 0.21);
    close(c.stamp, 15);
    close(c.gst, 1.1605, 3);
    close(c.total, 247.947, 2);
  });
  it('options round trip (STT 0.15% sell premium)', () => {
    const c = computeCharges({ segment: 'options', buyValue: 6500, sellValue: 8000 });
    close(c.brokerage, 40);
    close(c.stt, 12);
    close(c.total, 65.406, 2);
  });
  it('intraday brokerage is min(₹20, 0.03%)', () => {
    const c = computeCharges({ segment: 'intraday', buyValue: 20000, sellValue: 20000 });
    close(c.brokerage, 12);
  });
  it('equity tax', () => {
    close(equityTax(10000, 100).tax, 2080);
    close(equityTax(200000, 400).tax, 75000 * 0.125 * 1.04);
  });
});

describe('Black-Scholes', () => {
  const base = { S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 };
  it('prices the textbook example', () => {
    close(bsPrice({ type: 'CE', ...base }), 10.4506, 3);
    close(bsPrice({ type: 'PE', ...base }), 5.5735, 3);
    close(bsGreeks({ type: 'CE', ...base }).delta, 0.6368, 3);
    close(bsGreeks({ type: 'PE', ...base }).delta, -0.3632, 3);
  });
  it('solves implied vol', () => {
    close(impliedVol(10.4506, { type: 'CE', S: 100, K: 100, T: 1, r: 0.05 }), 0.2, 3);
  });
  it('analyses a bull call spread', () => {
    const legs: Leg[] = [
      { id: 'a', type: 'CE', side: 'buy', strike: 24000, premium: 150, lots: 1, iv: 0.14 },
      { id: 'b', type: 'CE', side: 'sell', strike: 24200, premium: 70, lots: 1, iv: 0.14 },
    ];
    close(payoffAtExpiry(legs, 24500, 65), 120 * 65);
    const s = analyseStrategy(legs, 24000, 65, 5);
    close(s.maxProfit, 120 * 65, 0);
    close(s.maxLoss, -80 * 65, 0);
    expect(s.breakevens.length).toBe(1);
    close(s.breakevens[0], 24080, 0);
    close(s.netPremium, -80 * 65);
  });
  it('detects unlimited risk on a short straddle', () => {
    const s = analyseStrategy(buildPreset('short_straddle', 24000, 50, 5, 0.14), 24000, 65, 5);
    expect(s.maxLoss).toBe(-Infinity);
    expect(s.breakevens.length).toBe(2);
  });
});

describe('Monte Carlo', () => {
  it('is deterministic and computes expectancy/Kelly', () => {
    const a = simulate({ start: 100000, winRate: 0.5, avgWinR: 2, riskPct: 0.01, trades: 100, runs: 50, seed: 7 });
    const b = simulate({ start: 100000, winRate: 0.5, avgWinR: 2, riskPct: 0.01, trades: 100, runs: 50, seed: 7 });
    expect(a.medianFinal).toBe(b.medianFinal);
    expect(a.curves.length).toBe(50);
    expect(a.curves[0].length).toBe(101);
    close(expectancy(0.5, 2), 0.5);
    close(kellyFraction(0.5, 2), 0.25);
    expect(a.probProfit).toBeGreaterThan(0.8);
  });
});

describe('Journal', () => {
  it('computes stats', () => {
    const t: Trade[] = [
      { id: '1', date: '2026-11-23', instrument: 'NIFTY', assetClass: 'Index Options', side: 'long', entry: 100, exit: 120, qty: 65, risk: 650, charges: 50 },
      { id: '2', date: '2026-11-24', instrument: 'TCS', assetClass: 'Equity', side: 'short', entry: 4000, exit: 4020, qty: 10, risk: 300, charges: 20 },
    ];
    const s = journalStats(t);
    close(s.total, 1250 - 220);
    close(s.winRate, 0.5);
    close(s.maxDD, 220);
  });
});

describe('format', () => {
  it('never prints a negative zero', () => {
    expect(money(-0.2, 'INR', { dp0: true })).toBe('₹0');
    expect(money(-1234.5)).toBe('−₹1,234.50');
    expect(money(250000, 'INR', { compact: true })).toBe('₹2.50 L');
  });
});
