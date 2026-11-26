import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Card, Guide, NumberField, PageHeader, Segmented, Stat, TextField, Pill } from '../components/ui';
import { Icon } from '../components/Icon';
import { tipStyle } from '../components/viz';
import { ASSET_CLASSES, journalStats, tradePnl, tradeR, type AssetClass, type Trade } from '../lib/calc/journal';
import { histogram } from '../lib/calc/montecarlo';
import { downloadCSV, money, num, parseCSV, pct, uid } from '../lib/format';
import { usePalette } from '../lib/theme';
import { useJournal } from '../store';

const today = () => new Date().toISOString().slice(0, 10);

export default function Journal() {
  const p = usePalette();
  const { trades, add, remove, replace } = useJournal();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Omit<Trade, 'id'>>({ date: today(), instrument: 'NIFTY 26000 CE', assetClass: 'Index Options', side: 'long', entry: 100, exit: 130, qty: 65, risk: 1300, charges: 60, notes: '' });
  const s = useMemo(() => journalStats(trades), [trades]);
  const rHist = useMemo(() => (trades.length ? histogram(s.rs, 10, Math.min(-2, ...s.rs), Math.max(3, ...s.rs)) : []), [s, trades.length]);

  const demo = () => {
    const ins: [string, AssetClass, number][] = [['NIFTY CE', 'Index Options', 65], ['BANKNIFTY PE', 'Index Options', 30], ['TCS', 'Equity', 10], ['SBIN', 'Intraday', 200], ['BTCUSD', 'Crypto', 1], ['XAUUSD', 'Gold', 1]];
    const out: Trade[] = [];
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let k = 0; k < 40; k++) {
      const [name, cls, q] = ins[Math.floor(rnd() * ins.length)];
      const win = rnd() < 0.48;
      const risk = 1000;
      const pnl = win ? risk * (0.8 + rnd() * 2.2) : -risk * (0.4 + rnd() * 0.7);
      const d = new Date(2026, 9, 1 + k); if (d.getDay() === 0) d.setDate(d.getDate() + 1); if (d.getDay() === 6) d.setDate(d.getDate() + 2);
      out.push({ id: uid(), date: d.toISOString().slice(0, 10), instrument: name, assetClass: cls, side: rnd() > 0.3 ? 'long' : 'short', entry: 100, exit: 100 + pnl / q * (1), qty: q, risk, charges: 40 });
      out[out.length - 1].exit = out[out.length - 1].side === 'long' ? 100 + (pnl + 40) / q : 100 - (pnl + 40) / q;
    }
    replace(out);
  };
  const exportCsv = () => downloadCSV('trade-journal.csv', [['date', 'instrument', 'assetClass', 'side', 'entry', 'exit', 'qty', 'risk', 'charges', 'pnl', 'R', 'notes'],
    ...trades.map((t) => [t.date, t.instrument, t.assetClass, t.side, t.entry, t.exit, t.qty, t.risk, t.charges, tradePnl(t).toFixed(2), tradeR(t).toFixed(2), t.notes ?? ''])]);
  const importCsv = async (file: File) => {
    const rows = parseCSV(await file.text());
    const body = rows[0]?.[0]?.toLowerCase() === 'date' ? rows.slice(1) : rows;
    const parsed: Trade[] = body.map((c) => ({ id: uid(), date: c[0], instrument: c[1], assetClass: (ASSET_CLASSES.includes(c[2] as AssetClass) ? c[2] : 'Equity') as AssetClass, side: (c[3] === 'short' ? 'short' : 'long') as Trade['side'], entry: +c[4] || 0, exit: +c[5] || 0, qty: +c[6] || 0, risk: +c[7] || 0, charges: +c[8] || 0, notes: c[11] })).filter((t) => t.date && t.instrument);
    if (parsed.length) replace([...parsed, ...trades]);
  };
  const pnlPreview = tradePnl({ ...f, id: 'x' });

  return (
    <div>
      <PageHeader title="Trade Journal" subtitle="What you measure, you can improve: win rate, expectancy, R-multiples, and where you make or lose money" icon="journal" accent="from-sky-500 to-indigo-500" actions={<>
        <button className="btn-ghost" onClick={exportCsv} disabled={!trades.length}><Icon name="download" className="h-4 w-4" />CSV</button>
        <button className="btn-ghost" onClick={() => file.current?.click()}><Icon name="upload" className="h-4 w-4" />Import</button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
      </>} />
      <Guide steps={[
        'Log every trade with the risk you planned. R-multiple = P&L ÷ planned risk, so 2R means you made twice what you risked.',
        'After 30 or more trades your win rate and average R start to mean something. Feed them into the Risk Lab.',
        'Use the asset-class and weekday bars to find where your edge lives, and where it leaks.',
      ]} />

      <Card className="mb-5" title="Add trade" subtitle={<>P&L preview: <b className={pnlPreview >= 0 ? 'text-gain' : 'text-loss'}>{money(pnlPreview)}</b> · {num(f.risk > 0 ? pnlPreview / f.risk : 0, 2)}R</>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div><label className="label mb-1 block" htmlFor="jd">Date</label><input id="jd" type="date" className="field" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="col-span-2 md:col-span-1 xl:col-span-2"><TextField label="Instrument" value={f.instrument} onChange={(v) => setF({ ...f, instrument: v })} /></div>
          <div><label className="label mb-1 block" htmlFor="jc">Class</label><select id="jc" className="field" value={f.assetClass} onChange={(e) => setF({ ...f, assetClass: e.target.value as AssetClass })}>{ASSET_CLASSES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><span className="label mb-1 block">Side</span><Segmented size="sm" value={f.side} onChange={(v) => setF({ ...f, side: v })} options={[{ value: 'long', label: 'Long', tone: 'gain' }, { value: 'short', label: 'Short', tone: 'loss' }]} /></div>
          <NumberField label="Entry" value={f.entry} onChange={(v) => setF({ ...f, entry: v })} step={0.05} />
          <NumberField label="Exit" value={f.exit} onChange={(v) => setF({ ...f, exit: v })} step={0.05} />
          <NumberField label="Qty" value={f.qty} onChange={(v) => setF({ ...f, qty: v })} />
          <NumberField label="Planned risk" value={f.risk} onChange={(v) => setF({ ...f, risk: v })} />
          <NumberField label="Charges" value={f.charges} onChange={(v) => setF({ ...f, charges: v })} />
          <div className="col-span-2 md:col-span-3 xl:col-span-5"><TextField label="Notes / setup" value={f.notes ?? ''} onChange={(v) => setF({ ...f, notes: v })} placeholder="Breakout, VWAP reclaim, news…" /></div>
          <div className="col-span-2 flex items-end gap-2 md:col-span-1 xl:col-span-1">
            <button className="btn-primary w-full" onClick={() => add(f)}><Icon name="plus" className="h-4 w-4" />Log</button>
          </div>
        </div>
        {!trades.length && <button className="mt-3 text-xs font-bold text-brand" onClick={demo}>Load 40 demo trades to explore the analytics</button>}
      </Card>

      {trades.length > 0 && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Stat big label="Net P&L" value={s.total} format={(v) => money(v, 'INR', { compact: true })} tone="auto" sub={`${s.count} trades`} />
            <Stat big label="Win rate" value={s.winRate} format={(v) => pct(v, 1)} tone="brand" />
            <Stat big label="Avg R" value={s.avgR} format={(v) => num(v, 2) + 'R'} tone="auto" />
            <Stat big label="Profit factor" value={s.profitFactor} format={(v) => (isFinite(v) ? num(v, 2) : '∞')} tone={s.profitFactor >= 1 ? 'gain' : 'loss'} tip="Gross wins ÷ gross losses. Above 1.5 is healthy." />
            <Stat big label="Expectancy" value={s.expectancy} format={(v) => money(v)} tone="auto" sub="per trade" />
            <Stat big label="Max drawdown" value={-s.maxDD} format={(v) => money(v, 'INR', { compact: true })} tone="loss" />
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Card title="Equity curve">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.curve}>
                    <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.brand} stopOpacity={0.4} /><stop offset="1" stopColor={p.brand} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke={p.line} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: p.muted, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={30} />
                    <YAxis tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => money(v, 'INR', { compact: true, dp0: true })} />
                    <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => money(v)} />
                    <ReferenceLine y={0} stroke={p.muted} />
                    <Area dataKey="equity" stroke={p.brand} strokeWidth={2.5} fill="url(#eq)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="R-multiple distribution">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rHist.map((b) => ({ name: `${b.x0.toFixed(1)}`, count: b.count, mid: (b.x0 + b.x1) / 2 }))}>
                    <CartesianGrid stroke={p.line} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: p.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                    <Tooltip contentStyle={tipStyle(p)} cursor={{ fill: p.surface2 }} labelFormatter={(v) => `From ${v}R`} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} animationDuration={800}>{rHist.map((b, k) => <Cell key={k} fill={(b.x0 + b.x1) / 2 >= 0 ? p.gain : p.loss} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            {([['P&L by asset class', s.byClass], ['P&L by weekday', s.byDay]] as const).map(([title, data]) => (
              <Card key={title} title={title}>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data as { name: string; value: number }[]} layout="vertical" margin={{ left: 10, right: 10 }}>
                      <CartesianGrid stroke={p.line} horizontal={false} />
                      <XAxis type="number" tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => money(v, 'INR', { compact: true, dp0: true })} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => money(v)} cursor={{ fill: p.surface2 }} />
                      <ReferenceLine x={0} stroke={p.muted} />
                      <Bar dataKey="value" radius={4} animationDuration={800}>{(data as { value: number }[]).map((d, k) => <Cell key={k} fill={d.value >= 0 ? p.gain : p.loss} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>
          <Card title="Trades" action={<button className="btn-ghost text-xs" onClick={() => { if (confirm('Delete all journal entries?')) replace([]); }}>Clear all</button>}>
            <div className="-mx-4 max-h-[480px] overflow-auto sm:mx-0">
              <table className="w-full min-w-[760px]">
                <thead className="sticky top-0 bg-surface"><tr className="border-b border-line"><th className="th">Date</th><th className="th">Instrument</th><th className="th">Class</th><th className="th">Side</th><th className="th">Entry → Exit</th><th className="th">Qty</th><th className="th">P&L</th><th className="th">R</th><th className="th"></th></tr></thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {[...trades].sort((a, b) => b.date.localeCompare(a.date)).map((t) => {
                      const pl = tradePnl(t);
                      return (
                        <motion.tr key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-line/60">
                          <td className="td text-muted">{t.date}</td>
                          <td className="td font-bold">{t.instrument}{t.notes && <div className="text-[11px] font-normal text-muted">{t.notes}</div>}</td>
                          <td className="td"><Pill>{t.assetClass}</Pill></td>
                          <td className="td"><Pill tone={t.side === 'long' ? 'gain' : 'loss'}>{t.side}</Pill></td>
                          <td className="td">{num(t.entry)} → {num(t.exit)}</td>
                          <td className="td">{num(t.qty, 4)}</td>
                          <td className={`td font-bold ${pl >= 0 ? 'text-gain' : 'text-loss'}`}>{money(pl)}</td>
                          <td className="td">{num(tradeR(t), 2)}R</td>
                          <td className="td"><button aria-label="Delete trade" className="text-muted hover:text-loss" onClick={() => remove(t.id)}><Icon name="trash" className="h-4 w-4" /></button></td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
