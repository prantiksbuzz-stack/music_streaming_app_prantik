import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { Card, Guide, PageHeader, Segmented, NumberField } from '../components/ui';
import { Icon } from '../components/Icon';
import { tipStyle, CsvButton } from '../components/viz';
import { renkoBoxes, RENKO_BASE, type RenkoMarket } from '../lib/calc/renko';
import { downloadCSV, num, parseCSV, pct, uid } from '../lib/format';
import { usePalette } from '../lib/theme';
import { useRenko } from '../store';

export default function Renko() {
  const p = usePalette();
  const { rows, upsert, remove, replace, reset } = useRenko();
  const [filter, setFilter] = useState<'all' | RenkoMarket>('all');
  const [q, setQ] = useState('');
  const [quickBase, setQuickBase] = useState(35);
  const [quickMkt, setQuickMkt] = useState<RenkoMarket>('stock');
  const file = useRef<HTMLInputElement>(null);
  const shown = rows.filter((r) => (filter === 'all' || r.market === filter) && r.name.toLowerCase().includes(q.toLowerCase()));
  const quick = renkoBoxes(quickBase, quickMkt);
  const chart = useMemo(() => shown.filter((r) => r.price && r.price > 0).map((r) => ({ name: r.name, pct: (renkoBoxes(r.base, r.market).h1 / r.price!) * 100 })).sort((a, b) => b.pct - a.pct).slice(0, 15), [shown]);

  const exportCsv = () => downloadCSV('renko-box-sizes.csv', [
    ['Name', 'Market', 'Base box', '1H box', '30m box', '15m box', 'Price'],
    ...rows.map((r) => { const b = renkoBoxes(r.base, r.market); return [r.name, r.market, r.base, b.h1.toFixed(4), b.m30.toFixed(4), b.m15.toFixed(4), r.price ?? '']; }),
  ]);
  const importCsv = async (f: File) => {
    const data = parseCSV(await f.text());
    const body = data[0]?.[0]?.toLowerCase() === 'name' ? data.slice(1) : data;
    const parsed = body.map((c) => ({ id: uid(), name: c[0]?.trim() ?? '', market: (c[1]?.trim().toLowerCase() === 'crypto' ? 'crypto' : 'stock') as RenkoMarket, base: parseFloat(c[2]) || 0, price: parseFloat(c[6]) || undefined })).filter((r) => r.name);
    if (parsed.length) replace(parsed);
  };

  return (
    <div>
      <PageHeader title="Renko Box Sizer" subtitle='Workbook "Sheet3": ATR-based box sizes scaled down to lower timeframes' icon="renko" accent="from-fuchsia-500 to-brand" actions={<>
        <CsvButton onExport={exportCsv} />
        <button className="btn-ghost" onClick={() => file.current?.click()}><Icon name="upload" className="h-4 w-4" />Import</button>
        <input ref={file} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
      </>} />
      <Guide steps={[
        'Stocks: read ATR(5) on a 6-hour Renko chart and enter it as the base box. 1H = base ÷ 6, and 30m = 1H ÷ 2.',
        'Crypto trades 24×7: read ATR(7) on a 23-hour box. 1H = base ÷ 23, and 30m = 1H ÷ 2.',
        'Add the current price to see box size as a % of price. That tells you which names are noisier.',
      ]} />

      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card title="Quick convert">
          <div className="mb-3"><Segmented layoutKey="rk-q" value={quickMkt} onChange={setQuickMkt} options={[{ value: 'stock', label: 'Stock · 6H' }, { value: 'crypto', label: 'Crypto · 23H' }]} /></div>
          <NumberField label={`Base box (${RENKO_BASE[quickMkt].label})`} value={quickBase} onChange={setQuickBase} step={0.05} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([['1H', quick.h1], ['30m', quick.m30], ['15m', quick.m15]] as const).map(([k, v], i) => (
              <motion.div key={k} layout className="rounded-xl bg-gradient-to-br from-brand/15 to-brand2/10 p-3 text-center">
                <div className="label">{k}</div>
                <motion.div key={v} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.05 }} className="mt-1 text-xl font-bold tnum">{num(v, 4)}</motion.div>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">15m (1H ÷ 4) is an extra timeframe added in the app. It is not in the workbook.</p>
        </Card>
        <Card title="Noise ranking" subtitle="1H box as a % of price (rows with a price)">
          {chart.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke={p.line} horizontal={false} />
                  <XAxis type="number" tick={{ fill: p.muted, fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(2)}%`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => `${v.toFixed(3)}%`} />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} animationDuration={700}>{chart.map((_, k) => <Cell key={k} fill={p.series[k % 2 ? 1 : 0]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <div className="grid h-56 place-items-center text-center text-sm text-muted">Add prices in the watchlist table below to rank names by noise.</div>}
        </Card>
      </div>

      <Card title={`Watchlist · ${rows.length} names`} subtitle="Pre-filled from your workbook. Edit any cell and it saves in this browser." action={
        <div className="flex gap-2">
          <button className="btn-ghost text-xs" onClick={reset}>Reset</button>
          <button className="btn-primary text-xs" onClick={() => upsert({ id: uid(), name: 'NEW', market: filter === 'crypto' ? 'crypto' : 'stock', base: 10 })}><Icon name="plus" className="h-4 w-4" />Add</button>
        </div>
      }>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented size="sm" layoutKey="rk-f" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'stock', label: 'Stocks' }, { value: 'crypto', label: 'Crypto' }]} />
          <input className="field max-w-[220px]" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search watchlist" />
        </div>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[720px]">
            <thead><tr className="border-b border-line"><th className="th">#</th><th className="th">Name</th><th className="th">Market</th><th className="th">Base box</th><th className="th">1H</th><th className="th">30m</th><th className="th">15m</th><th className="th">Price</th><th className="th">1H %</th><th className="th"></th></tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
                {shown.map((r, k) => {
                  const b = renkoBoxes(r.base, r.market);
                  return (
                    <motion.tr key={r.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} className="border-b border-line/60">
                      <td className="td text-muted">{k + 1}</td>
                      <td className="td"><input aria-label="Name" className="field w-40" value={r.name} onChange={(e) => upsert({ ...r, name: e.target.value.toUpperCase() })} /></td>
                      <td className="td"><Segmented size="sm" value={r.market} onChange={(v) => upsert({ ...r, market: v })} options={[{ value: 'stock', label: '6H' }, { value: 'crypto', label: '23H' }]} /></td>
                      <td className="td"><input aria-label="Base box" type="number" step={0.05} className="field w-24" value={r.base} onChange={(e) => upsert({ ...r, base: +e.target.value })} /></td>
                      <td className="td font-bold">{num(b.h1, 4)}</td>
                      <td className="td">{num(b.m30, 4)}</td>
                      <td className="td text-muted">{num(b.m15, 4)}</td>
                      <td className="td"><input aria-label="Price" type="number" className="field w-24" value={r.price ?? ''} placeholder="—" onChange={(e) => upsert({ ...r, price: e.target.value ? +e.target.value : undefined })} /></td>
                      <td className="td text-muted">{r.price ? pct(b.h1 / r.price, 2) : '—'}</td>
                      <td className="td"><button aria-label="Remove" className="text-muted hover:text-loss" onClick={() => remove(r.id)}><Icon name="trash" className="h-4 w-4" /></button></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
