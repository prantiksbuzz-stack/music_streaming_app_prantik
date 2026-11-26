import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Guide, NumberField, PageHeader, Pill, Segmented, Stat, Toggle, Warnings, TextField } from '../components/ui';
import { ChargesDonut, LadderChart, PriceMap, PrintButton, SaveScenario } from '../components/viz';
import { computeSizing, DEFAULT_LADDER, type Side } from '../lib/calc/sizing';
import { equityTax, roundTrip } from '../lib/calc/charges';
import { money, num, pct } from '../lib/format';
import { useSettings } from '../store';

export default function Equity() {
  const rates = useSettings((s) => s.rates);
  const [symbol, setSymbol] = useState('STOCK');
  const [account, setAccount] = useState(10000);
  const [riskPct, setRiskPct] = useState(0.02);
  const [entry, setEntry] = useState(458);
  const [stop, setStop] = useState(440);
  const [extreme, setExtreme] = useState(464);
  const [customRR, setCustomRR] = useState(2);
  const [days, setDays] = useState(45);
  const [side, setSide] = useState<Side>('long');
  const [excelExact, setExcelExact] = useState(false);

  const r = useMemo(() => computeSizing({ account, riskPct, entry, stop, side, rounding: excelExact ? 'none' : 'int', extreme, ladder: DEFAULT_LADDER, customRR }), [account, riskPct, entry, stop, side, excelExact, extreme, customRR]);
  // short delivery isn't possible in Indian cash market: use intraday charges for short
  const seg = side === 'long' ? 'delivery' : 'intraday';
  const rows = r.targets.map((t) => {
    const ch = roundTrip(seg, r.qty, entry, t.price, side, rates);
    const net = t.profit - ch.total;
    const tax = equityTax(net, days);
    return { ...t, charges: ch.total, net, tax: tax.tax, taxType: tax.type, post: net - tax.tax };
  });
  const top = rows[rows.length - 1];
  const topCh = roundTrip(seg, r.qty, entry, top?.price ?? entry, side, rates);
  const slCh = roundTrip(seg, r.qty, entry, stop, side, rates);
  const hpr = r.investment > 0 && top ? top.net / r.investment : 0;
  const cagr = days > 0 && hpr > -1 ? Math.pow(1 + hpr, 365 / days) - 1 : 0;
  const warnings = [...r.warnings, ...(side === 'short' ? ['Indian cash-market shorts must be squared off the same day, so intraday charges are applied. For multi-day shorts, use futures or options.'] : [])];
  const loadExcel = () => { setAccount(10000); setRiskPct(0.02); setEntry(458); setStop(440); setExtreme(464); setCustomRR(2); setSide('long'); setExcelExact(true); };

  return (
    <div>
      <PageHeader title="Indian Equity: Delivery" subtitle='Workbook "Indian Market" sheet with charges, tax and returns' icon="equity" accent="from-emerald-500 to-cyan-500" actions={<PrintButton />} />
      <Guide steps={[
        'Enter your account, risk %, the buy price and a stop below a real support level, not just a round number.',
        'Quantity is risk ÷ (entry − stop). Turn on "Excel exact" to see the fractional figure the workbook shows.',
        'Check net and post-tax profit at each target. STCG (≤ 1 year) is 20% and LTCG is 12.5% above ₹1.25 L, plus cess.',
      ]} />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card title="Trade inputs" action={<button className="text-xs font-bold text-brand" onClick={loadExcel}>Load Excel example</button>}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Long', tone: 'gain' }, { value: 'short', label: 'Short', tone: 'loss' }]} />
            <Toggle checked={excelExact} onChange={setExcelExact} label="Excel exact (fractional qty)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><TextField label="Symbol" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} /></div>
            <NumberField label="Account size" prefix="₹" value={account} onChange={setAccount} step={1000} />
            <NumberField label="Risk per trade" percent value={riskPct} onChange={setRiskPct} step={0.0025} tip="Share of capital lost if the stop is hit." analogy="Position size is how much water you pour, not how big the glass is. Risk % decides the pour." />
            <NumberField label="Entry price" prefix="₹" value={entry} onChange={setEntry} step={0.05} />
            <NumberField label="Stop loss" prefix="₹" value={stop} onChange={setStop} step={0.05} />
            <NumberField label={side === 'long' ? 'Highest price' : 'Lowest price'} prefix="₹" value={extreme} onChange={setExtreme} step={0.05} tip="For the trailing stop-loss: best price since entry minus your initial risk per share." />
            <NumberField label="Custom R:R" value={customRR} onChange={setCustomRR} step={0.1} suffix="R" />
            <div className="col-span-2"><NumberField label="Expected holding (days)" value={days} onChange={(v) => setDays(Math.max(1, Math.round(v)))} min={1} max={730} slider tip="Used for STCG vs LTCG and the annualised return." /></div>
          </div>
        </Card>

        <div className="space-y-5">
          <Warnings items={warnings} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat big label="Shares" value={r.qty} format={(v) => num(v, excelExact ? 2 : 0)} tone="brand" sub={excelExact ? 'Workbook value (fractional)' : `Workbook shows ${num(r.rawQty, 2)}`} />
            <Stat big label="Investment" value={r.investment} format={(v) => money(v)} sub={`${pct(account ? r.investment / account : 0, 1)} of account`} />
            <Stat big label="Max initial loss" value={-(r.actualRisk + slCh.total)} format={(v) => money(v)} tone="loss" sub={`incl. ${money(slCh.total)} charges`} />
            <Stat big label={`Net @ ${top?.rr ?? 0}R`} value={top?.net ?? 0} format={(v) => money(v)} tone="auto" sub={`${pct(hpr)} · ${pct(cagr, 1)} annualised`} />
            <Stat label="Risk / share" value={r.riskPerUnit} format={(v) => '₹' + num(v)} />
            <Stat label="Stop-loss %" value={r.slPct} format={(v) => pct(v)} />
            <Stat label="Trailing SL" value={r.tsl} format={(v) => '₹' + num(v)} tone="warn" sub={`P&L at TSL ${money(r.pnlAtTsl)}`} />
            <Stat label="Breakeven win rate" value={r.breakevenWinRate} format={(v) => pct(v, 1)} sub={`at ${customRR}R`} />
          </div>
          <Card title="Price map"><PriceMap entry={entry} stop={stop} targets={r.targets} tsl={r.tsl} /></Card>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Profit ladder" subtitle="Gross vs net of charges"><LadderChart rows={rows.map((x) => ({ rr: x.rr, gross: x.profit, net: x.net }))} /></Card>
            <Card title={`Charges at ${top?.rr ?? 0}R`} subtitle={side === 'long' ? 'Delivery round trip' : 'Intraday round trip'}><ChargesDonut lines={topCh.lines} total={topCh.total} /></Card>
          </div>
          <Card title="Targets, charges & tax" action={<SaveScenario build={() => r.qty > 0 ? {
            name: `${symbol} ${side} @ ₹${entry}`, page: '/equity', assetClass: 'Equity', side,
            riskINR: r.actualRisk + slCh.total, exposureINR: r.investment, rewardINR: top?.net ?? 0, rr: top?.rr ?? 0,
            summary: [{ label: 'Qty', value: num(r.qty, 2) }, { label: 'Entry/SL', value: `₹${entry} / ₹${stop}` }, { label: 'Risk', value: money(r.actualRisk) }, { label: 'Post-tax @ top', value: money(top?.post ?? 0) }],
          } : null} />}>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead><tr className="border-b border-line"><th className="th">R:R</th><th className="th">Target</th><th className="th">%</th><th className="th">Gross</th><th className="th">Charges</th><th className="th">Net</th><th className="th">Tax</th><th className="th">Post-tax</th></tr></thead>
                <tbody>
                  {rows.map((t, k) => (
                    <motion.tr key={t.rr} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.04 }} className="border-b border-line/60 last:border-0">
                      <td className="td"><Pill tone="brand">{t.rr}R</Pill></td>
                      <td className="td font-bold">₹{num(t.price)}</td>
                      <td className="td text-gain">{pct(t.pct)}</td>
                      <td className="td">{money(t.profit)}</td>
                      <td className="td text-muted">{money(t.charges)}</td>
                      <td className="td">{money(t.net)}</td>
                      <td className="td text-muted">{money(t.tax)} <span className="text-[10px]">{t.taxType}</span></td>
                      <td className={`td font-bold ${t.post >= 0 ? 'text-gain' : 'text-loss'}`}>{money(t.post)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
