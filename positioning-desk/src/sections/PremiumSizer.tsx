import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, NumberField, Segmented, Stat, Warnings, Pill } from '../components/ui';
import { LadderChart, PriceMap, SaveScenario, ChargesDonut } from '../components/viz';
import { computeSizing, DEFAULT_LADDER, breakevenWinRate, type Side } from '../lib/calc/sizing';
import { computeCharges } from '../lib/calc/charges';
import { money, num, pct } from '../lib/format';
import { useSettings } from '../store';
import type { AssetClass } from '../lib/calc/journal';

export interface PremiumSizerProps {
  name: string;
  lotSize: number;
  assetClass: AssetClass;
  page: string;
}

/** Mirrors the "Nifty Options" sheet: lot-floored sizing on option premium. */
export function PremiumSizer({ name, lotSize, assetClass, page }: PremiumSizerProps) {
  const rates = useSettings((s) => s.rates);
  const [account, setAccount] = useState(3300);
  const [riskPct, setRiskPct] = useState(0.08);
  const [entry, setEntry] = useState(44.6);
  const [stop, setStop] = useState(41);
  const [extreme, setExtreme] = useState(44.6);
  const [customRR, setCustomRR] = useState(2);
  const [side, setSide] = useState<Side>('long');
  const [ladder, setLadder] = useState<number[]>(DEFAULT_LADDER);

  const r = useMemo(
    () => computeSizing({ account, riskPct, entry, stop, side, lotSize, rounding: 'lot', extreme, ladder, customRR }),
    [account, riskPct, entry, stop, side, lotSize, extreme, ladder, customRR],
  );

  const rows = r.targets.map((t) => {
    const buy = side === 'long' ? entry : t.price;
    const sell = side === 'long' ? t.price : entry;
    const ch = computeCharges({ segment: 'options', buyValue: r.qty * buy, sellValue: r.qty * sell, rates });
    return { ...t, charges: ch.total, net: t.profit - ch.total };
  });
  const slCharges = computeCharges({ segment: 'options', buyValue: r.qty * (side === 'long' ? entry : stop), sellValue: r.qty * (side === 'long' ? stop : entry), rates });
  const costR = r.actualRisk > 0 ? slCharges.total / r.actualRisk : 0;
  const beAfterCosts = (1 + costR) / (1 + customRR);
  const loadExcel = () => { setAccount(3300); setRiskPct(0.08); setEntry(44.6); setStop(41); setExtreme(9); setCustomRR(2); setSide('long'); setLadder(DEFAULT_LADDER); };

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <Card title="Trade inputs" subtitle={`${name} · lot size ${lotSize}`} action={<button className="text-xs font-bold text-brand" onClick={loadExcel}>Load Excel example</button>}>
        <div className="mb-4"><Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Buy option', tone: 'gain' }, { value: 'short', label: 'Sell option', tone: 'loss' }]} /></div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Account size" prefix="₹" value={account} onChange={setAccount} step={100} min={0} tip="Capital you are allocating to trading." analogy="Think of this as the whole tank of fuel. You never pour the whole tank into a single trip." />
          <NumberField label="Risk per trade" percent value={riskPct} onChange={setRiskPct} step={0.0025} tip="Fraction of the account you accept losing if the stop is hit." analogy="Like a seat belt setting: 1–2% keeps you safe through a crash, while 8% (the workbook example) is racing without one." />
          <NumberField label="Entry premium" prefix="₹" value={entry} onChange={setEntry} step={0.05} min={0} />
          <NumberField label="Stop-loss premium" prefix="₹" value={stop} onChange={setStop} step={0.05} min={0} tip="Premium at which you exit for a loss." />
          <NumberField label={side === 'long' ? 'Highest premium' : 'Lowest premium'} prefix="₹" value={extreme} onChange={setExtreme} step={0.05} tip="Best price seen since entry. The trailing SL is this minus the initial risk per unit." analogy="A ratchet: it only clicks forward as price moves your way, and it never slips back." />
          <NumberField label="Custom R:R" value={customRR} onChange={setCustomRR} step={0.1} min={0} suffix="R" />
        </div>
        <div className="mt-4">
          <span className="label">Target ladder (R multiples)</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[1, 1.1, 1.2, 1.3, 1.5, 2, 2.5, 3, 4, 5].map((v) => {
              const on = ladder.includes(v);
              return (
                <motion.button whileTap={{ scale: 0.9 }} key={v} onClick={() => setLadder((l) => (on ? l.filter((x) => x !== v) : [...l, v].sort((a, b) => a - b)))} className={`rounded-lg px-2.5 py-1 text-xs font-bold ${on ? 'bg-brand text-white dark:text-[#0b0f1f]' : 'bg-surface2 text-muted'}`}>
                  {v}R
                </motion.button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="space-y-5">
        <Warnings items={r.warnings} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat big label="Quantity" value={r.qty} format={(v) => num(Math.round(v), 0)} tone="brand" sub={`${num(r.lots, 0)} lot(s) × ${lotSize}`} tip="FLOOR(risk budget ÷ risk per unit, lot size): exactly as the workbook does it." />
          <Stat big label="Investment" value={r.investment} format={(v) => money(v)} sub={`${pct(account ? r.investment / account : 0, 1)} of account`} delay={0.05} />
          <Stat big label="Risk budget" value={r.riskBudget} format={(v) => money(v)} sub={`Used ${money(r.actualRisk)} · unused ${money(r.unusedRisk)}`} delay={0.1} />
          <Stat big label="Max initial loss" value={r.maxInitialLoss} format={(v) => money(v)} tone="loss" sub={`${pct(r.actualRiskPct)} of account`} delay={0.15} />
          <Stat label="Risk / unit" value={r.riskPerUnit} format={(v) => '₹' + num(v)} />
          <Stat label="Stop-loss %" value={r.slPct} format={(v) => pct(v)} />
          <Stat label="Trailing SL" value={r.tsl} format={(v) => '₹' + num(v)} tone="warn" sub={`P&L at TSL ${money(r.pnlAtTsl)}`} />
          <Stat label="Breakeven win rate" value={r.breakevenWinRate} format={(v) => pct(v, 1)} sub={`at ${customRR}R · ${pct(beAfterCosts, 1)} after costs`} tip="1 ÷ (1 + R:R). The minimum win rate you need to not lose money at this reward-to-risk." analogy="Like a cricket strike rate: hit bigger shots (higher R) and you can afford to get out more often." />
        </div>

        <Card title="Price map" subtitle="Stop, entry, trailing stop and targets on one scale" delay={0.05}>
          <PriceMap entry={entry} stop={stop} targets={r.targets} tsl={r.tsl} />
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Target ladder" subtitle="Gross vs net of F&O charges" delay={0.1}>
            <LadderChart rows={rows.map((x) => ({ rr: x.rr, gross: x.profit, net: x.net }))} />
          </Card>
          <Card title="Charges if the stop is hit" subtitle={`Round trip · ${num(r.qty, 0)} qty`} delay={0.15}>
            <ChargesDonut lines={slCharges.lines} total={slCharges.total} />
          </Card>
        </div>

        <Card title="Targets table" delay={0.2} action={<SaveScenario build={() => r.qty > 0 ? {
          name: `${name} ${side === 'long' ? 'Buy' : 'Sell'} @ ₹${entry}`, page, assetClass, side,
          riskINR: r.actualRisk + slCharges.total, exposureINR: r.investment, rewardINR: rows[rows.length - 1]?.net ?? 0, rr: ladder[ladder.length - 1] ?? 0,
          summary: [{ label: 'Qty', value: `${r.qty} (${r.lots} lot)` }, { label: 'Entry/SL', value: `₹${entry} / ₹${stop}` }, { label: 'Risk', value: money(r.actualRisk) }, { label: 'Best target', value: rows.length ? `₹${num(rows[rows.length - 1].price)}` : '—' }],
        } : null} />}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[520px]">
              <thead><tr className="border-b border-line"><th className="th">R:R</th><th className="th">Target</th><th className="th">Target %</th><th className="th">Gross profit</th><th className="th">Charges</th><th className="th">Net</th><th className="th">BE win%</th></tr></thead>
              <tbody>
                {rows.map((t, k) => (
                  <motion.tr key={t.rr} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.04 }} className="border-b border-line/60 last:border-0">
                    <td className="td"><Pill tone="brand">{t.rr}R</Pill></td>
                    <td className="td font-bold">₹{num(t.price)}</td>
                    <td className="td text-gain">{pct(t.pct)}</td>
                    <td className="td">{money(t.profit)}</td>
                    <td className="td text-muted">{money(t.charges)}</td>
                    <td className={`td font-bold ${t.net >= 0 ? 'text-gain' : 'text-loss'}`}>{money(t.net)}</td>
                    <td className="td text-muted">{pct(breakevenWinRate(t.rr), 1)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
