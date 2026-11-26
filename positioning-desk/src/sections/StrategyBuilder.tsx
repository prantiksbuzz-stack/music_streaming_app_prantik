import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, NumberField, Stat, Pill, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import { SaveScenario, tipStyle } from '../components/viz';
import { analyseStrategy, buildPreset, payoffAtExpiry, payoffAtT, PRESETS, strategyGreeks, type Leg, type PresetKey } from '../lib/calc/options';
import { computeCharges } from '../lib/calc/charges';
import { money, num, pct, uid } from '../lib/format';
import { usePalette } from '../lib/theme';
import { useSettings } from '../store';
import type { AssetClass } from '../lib/calc/journal';

export interface BuilderProps {
  name: string;
  lotSize: number;
  step: number;
  defaultSpot: number;
  defaultIV: number;
  assetClass: AssetClass;
  page: string;
}

export function StrategyBuilder({ name, lotSize, step, defaultSpot, defaultIV, assetClass, page }: BuilderProps) {
  const p = usePalette();
  const rates = useSettings((s) => s.rates);
  const [spot, setSpot] = useState(defaultSpot);
  const [dte, setDte] = useState(7);
  const [iv, setIv] = useState(defaultIV);
  const [rate, setRate] = useState(0.065);
  const [preset, setPreset] = useState<PresetKey>('bull_call_spread');
  const [legs, setLegs] = useState<Leg[]>(() => buildPreset('bull_call_spread', defaultSpot, step, 7, defaultIV));
  const [viewDays, setViewDays] = useState(7);

  // reset when underlying changes
  useEffect(() => {
    setSpot(defaultSpot);
    setIv(defaultIV);
    setLegs(buildPreset(preset, defaultSpot, step, dte, defaultIV));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, defaultSpot, step]);
  useEffect(() => setViewDays((v) => Math.min(v, dte)), [dte]);

  const applyPreset = (k: PresetKey) => { setPreset(k); setLegs(buildPreset(k, spot, step, dte, iv, rate)); };
  const updateLeg = (id: string, patch: Partial<Leg>) => setLegs((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const stats = useMemo(() => analyseStrategy(legs, spot, lotSize, dte, iv), [legs, spot, lotSize, dte, iv]);
  const greeks = useMemo(() => strategyGreeks(legs, spot, lotSize, viewDays, rate), [legs, spot, lotSize, viewDays, rate]);

  const data = useMemo(() => {
    const strikes = legs.map((l) => l.strike);
    const range = Math.max(spot * 0.06, (Math.max(...strikes, spot) - Math.min(...strikes, spot)) * 0.9);
    const lo = Math.min(...strikes, spot) - range * 0.6;
    const hi = Math.max(...strikes, spot) + range * 0.6;
    const pts = 120;
    return Array.from({ length: pts + 1 }, (_, k) => {
      const S = lo + ((hi - lo) * k) / pts;
      const e = payoffAtExpiry(legs, S, lotSize);
      return { S: Math.round(S), expiry: e, now: payoffAtT(legs, S, lotSize, viewDays, rate) };
    });
  }, [legs, spot, lotSize, viewDays, rate]);

  const ys = data.map((d) => d.expiry);
  const yMax = Math.max(...ys, 0), yMin = Math.min(...ys, 0);
  const off = yMax - yMin > 0 ? yMax / (yMax - yMin) : 0.5;

  const premiumTurnover = legs.reduce((a, l) => a + l.premium * l.lots * lotSize, 0);
  const charges = computeCharges({ segment: 'options', buyValue: premiumTurnover, sellValue: premiumTurnover, buyOrders: legs.length, sellOrders: legs.length, rates });
  const capital = stats.maxLoss === -Infinity ? NaN : -stats.maxLoss;

  // heatmap spot × DTE
  const heat = useMemo(() => {
    const cols = [-0.04, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04];
    const rows = Array.from(new Set([dte, Math.round(dte * 0.75), Math.round(dte * 0.5), Math.round(dte * 0.25), 0])).filter((d) => d >= 0);
    const m = rows.map((d) => cols.map((c) => payoffAtT(legs, spot * (1 + c), lotSize, d, rate)));
    const mx = Math.max(1, ...m.flat().map(Math.abs));
    return { cols, rows, m, mx };
  }, [legs, spot, lotSize, dte, rate]);

  const heatColor = (v: number, mx: number) => {
    const a = Math.min(1, Math.abs(v) / mx);
    return v >= 0 ? `color-mix(in srgb, ${p.gain} ${Math.round(a * 85 + 8)}%, transparent)` : `color-mix(in srgb, ${p.loss} ${Math.round(a * 85 + 8)}%, transparent)`;
  };

  return (
    <div className="space-y-5">
      <Card title="Market & strategy" subtitle={`${name} · lot ${lotSize} · strike step ${step}`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <NumberField label="Spot" value={spot} onChange={setSpot} step={step / 2} />
          <NumberField label="Days to expiry" value={dte} onChange={(v) => setDte(Math.max(0, Math.round(v)))} step={1} min={0} max={60} slider />
          <NumberField label="Implied vol" percent value={iv} onChange={setIv} step={0.005} min={0.01} tip="Annualised IV used for theoretical premiums and the T+n curve. India VIX is a good guide for NIFTY." />
          <NumberField label="Risk-free rate" percent value={rate} onChange={setRate} step={0.0025} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PRESETS.map((s) => (
            <motion.button key={s.key} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={() => applyPreset(s.key)} title={s.view}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${preset === s.key ? 'border-brand bg-brand text-white dark:text-[#0b0f1f]' : 'border-line bg-surface2/60 text-muted hover:text-ink'}`}>
              {s.label}
            </motion.button>
          ))}
        </div>
      </Card>

      <Card title="Legs" subtitle="Edit strikes, premiums, lots and IV. Premiums are prefilled from Black-Scholes, so overwrite them with live LTPs." action={
        <button className="btn-ghost text-xs" onClick={() => setLegs((ls) => [...ls, { id: uid(), type: 'CE', side: 'buy', strike: Math.round(spot / step) * step, premium: 100, lots: 1, iv }])}><Icon name="plus" className="h-4 w-4" />Add leg</button>
      }>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[640px]">
            <thead><tr className="border-b border-line"><th className="th">Side</th><th className="th">Type</th><th className="th">Strike</th><th className="th">Premium</th><th className="th">Lots</th><th className="th">IV %</th><th className="th"></th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {legs.map((l) => (
                  <motion.tr key={l.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="border-b border-line/60">
                    <td className="td"><Segmented size="sm" value={l.side} onChange={(v) => updateLeg(l.id, { side: v })} options={[{ value: 'buy', label: 'B', tone: 'gain' }, { value: 'sell', label: 'S', tone: 'loss' }]} /></td>
                    <td className="td"><Segmented size="sm" value={l.type} onChange={(v) => updateLeg(l.id, { type: v })} options={[{ value: 'CE', label: 'CE' }, { value: 'PE', label: 'PE' }]} /></td>
                    <td className="td"><input aria-label="Strike" type="number" step={step} className="field w-28" value={l.strike} onChange={(e) => updateLeg(l.id, { strike: +e.target.value })} /></td>
                    <td className="td"><input aria-label="Premium" type="number" step={0.05} className="field w-24" value={l.premium} onChange={(e) => updateLeg(l.id, { premium: +e.target.value })} /></td>
                    <td className="td"><input aria-label="Lots" type="number" min={1} className="field w-20" value={l.lots} onChange={(e) => updateLeg(l.id, { lots: Math.max(1, Math.round(+e.target.value)) })} /></td>
                    <td className="td"><input aria-label="IV" type="number" step={0.5} className="field w-20" value={Math.round(l.iv * 1000) / 10} onChange={(e) => updateLeg(l.id, { iv: +e.target.value / 100 })} /></td>
                    <td className="td"><button aria-label="Remove leg" className="text-muted hover:text-loss" onClick={() => setLegs((ls) => ls.filter((x) => x.id !== l.id))}><Icon name="trash" className="h-4 w-4" /></button></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat big label="Max profit" value={stats.maxProfit} format={(v) => money(v)} tone="gain" />
        <Stat big label="Max loss" value={stats.maxLoss} format={(v) => money(v)} tone="loss" sub={stats.maxLoss === -Infinity ? 'Unlimited risk: hedge it or size it carefully' : undefined} />
        <Stat big label="Net premium" value={stats.netPremium} format={(v) => money(v, 'INR', { sign: true })} tone="auto" sub={stats.netPremium >= 0 ? 'Credit received' : 'Debit paid'} />
        <Stat big label="Prob. of profit" value={stats.probProfit} format={(v) => pct(v, 1)} tone="brand" sub="Lognormal estimate at expiry" tip="Estimated from the IV you entered, assuming no drift." />
      </div>

      <Card title="Payoff diagram" subtitle={`Shaded area: at expiry · Line: T+${dte - viewDays} (${viewDays} day${viewDays === 1 ? '' : 's'} left)`}
        action={<div className="flex flex-wrap gap-1">{stats.breakevens.map((b) => <Pill key={b} tone="warn">BE {num(b, 0)}</Pill>)}</div>}>
        <div className="mb-3 flex items-center gap-3">
          <span className="label whitespace-nowrap">Days left</span>
          <input aria-label="Days left for T+n curve" type="range" min={0} max={dte} value={viewDays} onChange={(e) => setViewDays(+e.target.value)} className="w-full" />
          <span className="w-10 text-right text-sm font-bold tnum">{viewDays}d</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 22, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pl-split" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor={p.gain} stopOpacity={0.45} />
                  <stop offset={off} stopColor={p.gain} stopOpacity={0.08} />
                  <stop offset={off} stopColor={p.loss} stopOpacity={0.08} />
                  <stop offset={1} stopColor={p.loss} stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="pl-stroke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={off} stopColor={p.gain} />
                  <stop offset={off} stopColor={p.loss} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={p.line} vertical={false} />
              <XAxis dataKey="S" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: p.muted, fontSize: 11 }} tickLine={false} axisLine={false} tickCount={8} />
              <YAxis tick={{ fill: p.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v) => money(v, 'INR', { compact: true, dp0: true })} />
              <Tooltip contentStyle={tipStyle(p)} labelFormatter={(v) => `Spot ${num(+v, 0)}`} formatter={(v: number, k) => [money(v), k === 'expiry' ? 'At expiry' : `T+${dte - viewDays}`]} />
              <ReferenceLine y={0} stroke={p.muted} />
              <ReferenceLine x={Math.round(spot)} stroke={p.brand} strokeDasharray="4 4" label={{ value: 'Spot', fill: p.brand, fontSize: 11, position: 'top' }} />
              <Area type="linear" dataKey="expiry" stroke="url(#pl-stroke)" strokeWidth={2.5} fill="url(#pl-split)" animationDuration={700} />
              <Line type="monotone" dataKey="now" stroke={p.brand} strokeWidth={2} dot={false} animationDuration={500} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Card title="Position Greeks" subtitle={`${viewDays} days left · per position`}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Delta" value={greeks.delta} format={(v) => num(v, 1)} sub="₹ P&L per 1-pt move" tip="How much the position gains or loses for a 1-point move in the underlying." analogy="The speedometer: how fast your P&L moves with the market." />
            <Stat label="Gamma" value={greeks.gamma} format={(v) => num(v, 4)} sub="Change in delta per pt" analogy="The accelerator: how quickly the speedometer itself changes." />
            <Stat label="Theta / day" value={greeks.theta} format={(v) => money(v)} tone="auto" analogy="Rent: buyers pay it every day, sellers collect it." />
            <Stat label="Vega / 1% IV" value={greeks.vega} format={(v) => money(v)} tone="auto" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-surface2/60 p-3"><div className="label">Capital at risk</div><div className="mt-1 font-bold tnum">{isNaN(capital) ? 'Unlimited: margin applies' : money(capital)}</div></div>
            <div className="rounded-xl bg-surface2/60 p-3"><div className="label">Est. charges (round trip)</div><div className="mt-1 font-bold tnum">{money(charges.total)}</div></div>
          </div>
          <div className="mt-4"><SaveScenario build={() => ({
            name: `${name} ${PRESETS.find((x) => x.key === preset)?.label ?? 'Custom'}`, page, assetClass, side: greeks.delta >= 0 ? 'long' : 'short',
            riskINR: isNaN(capital) ? Math.abs(stats.netPremium) * 3 : capital + charges.total, exposureINR: premiumTurnover, rewardINR: isFinite(stats.maxProfit) ? stats.maxProfit : 0,
            rr: isFinite(stats.maxProfit) && isFinite(stats.maxLoss) && stats.maxLoss < 0 ? stats.maxProfit / -stats.maxLoss : 0,
            summary: [{ label: 'Legs', value: legs.map((l) => `${l.side === 'buy' ? '+' : '−'}${l.strike}${l.type}`).join(' ') }, { label: 'Max P/L', value: `${money(stats.maxProfit)} / ${money(stats.maxLoss)}` }, { label: 'POP', value: pct(stats.probProfit, 0) }],
          })} /></div>
        </Card>

        <Card title="P&L heatmap" subtitle="Spot move (columns) × days to expiry (rows)">
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[520px] border-separate border-spacing-1 text-[11px]">
              <thead><tr><th className="th px-1">DTE</th>{heat.cols.map((c) => <th key={c} className="th px-1 text-center">{c > 0 ? '+' : ''}{(c * 100).toFixed(0)}%<div className="font-normal normal-case text-muted">{num(spot * (1 + c), 0)}</div></th>)}</tr></thead>
              <tbody>
                {heat.rows.map((d, ri) => (
                  <tr key={d}>
                    <td className="px-1 font-bold text-muted">{d}d</td>
                    {heat.m[ri].map((v, ci) => (
                      <motion.td key={ci} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (ri * heat.cols.length + ci) * 0.008 }}
                        className="rounded-md px-1 py-2 text-center font-bold tnum" style={{ background: heatColor(v, heat.mx) }} title={money(v)}>
                        {money(v, 'INR', { compact: true, dp0: true })}
                      </motion.td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
