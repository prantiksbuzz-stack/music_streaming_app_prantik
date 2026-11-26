import { Card, NumberField, PageHeader } from '../components/ui';
import { SEGMENT_LABEL, DEFAULT_RATES, type Segment, type SegmentRates } from '../config/charges';
import { INDEX_SPECS } from '../config/instruments';
import { useSettings, useScenarios, useJournal, useRenko } from '../store';

const FIELDS: { key: keyof SegmentRates; label: string; pct?: boolean; step: number }[] = [
  { key: 'brokerageCap', label: 'Brokerage ₹/order', step: 1 },
  { key: 'brokeragePct', label: 'Brokerage %', pct: true, step: 0.0001 },
  { key: 'sttBuy', label: 'STT buy', pct: true, step: 0.0001 },
  { key: 'sttSell', label: 'STT sell', pct: true, step: 0.0001 },
  { key: 'exchange', label: 'Exchange txn', pct: true, step: 0.000001 },
  { key: 'stampBuy', label: 'Stamp (buy)', pct: true, step: 0.00001 },
  { key: 'dpPerSell', label: 'DP ₹/sell', step: 0.5 },
];

export default function Settings() {
  const s = useSettings();
  const clearScen = useScenarios((x) => x.clear);
  const clearJ = useJournal((x) => x.replace);
  const resetRenko = useRenko((x) => x.reset);
  const setSeg = (seg: Segment, key: keyof SegmentRates, v: number) =>
    s.set({ rates: { ...s.rates, segments: { ...s.rates.segments, [seg]: { ...s.rates.segments[seg], [key]: v } } } });

  return (
    <div>
      <PageHeader title="Settings" subtitle="Defaults, lot sizes and charge rates. Everything saves in this browser." icon="settings" accent="from-slate-500 to-slate-700" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Account defaults">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Capital (INR)" prefix="₹" value={s.capitalINR} onChange={(v) => s.set({ capitalINR: v })} step={10000} />
            <NumberField label="Capital (USD)" prefix="$" value={s.capitalUSD} onChange={(v) => s.set({ capitalUSD: v })} step={100} />
            <NumberField label="USDINR" value={s.usdinr} onChange={(v) => v > 0 && s.set({ usdinr: v })} step={0.01} />
            <NumberField label="Max portfolio heat" percent value={s.maxHeatPct} onChange={(v) => s.set({ maxHeatPct: v })} step={0.005} tip="Most capital you allow at risk across all open positions together. 4–8% is typical." analogy="Like the weight limit on a lift: each passenger may be fine, but together they can snap the cable." />
          </div>
        </Card>
        <Card title="Index lot sizes" subtitle="NSE revises these periodically. Check the latest circular.">
          <div className="grid grid-cols-2 gap-3">
            {INDEX_SPECS.map((sp) => (
              <NumberField key={sp.key} label={sp.label} value={s.lotSizes[sp.key] ?? sp.lotSize} onChange={(v) => s.set({ lotSizes: { ...s.lotSizes, [sp.key]: Math.max(1, Math.round(v)) } })} />
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5" title="Charge rates" subtitle={`Defaults as of ${DEFAULT_RATES.asOf} (STT on F&O as revised in Budget 2026-27). GST ${s.rates.gst * 100}% on brokerage + exchange + SEBI. SEBI ₹${s.rates.sebiPerCrore}/crore.`}
        action={<button className="btn-ghost text-xs" onClick={() => s.set({ rates: DEFAULT_RATES })}>Restore defaults</button>}>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="w-full min-w-[880px]">
            <thead><tr className="border-b border-line"><th className="th">Segment</th>{FIELDS.map((f) => <th key={f.key} className="th">{f.label}</th>)}</tr></thead>
            <tbody>
              {(Object.keys(SEGMENT_LABEL) as Segment[]).map((seg) => (
                <tr key={seg} className="border-b border-line/60 last:border-0">
                  <td className="td font-bold">{SEGMENT_LABEL[seg]}<div className="text-[10px] font-normal text-muted">brokerage: {s.rates.segments[seg].brokerageMode}</div></td>
                  {FIELDS.map((f) => {
                    const v = s.rates.segments[seg][f.key] as number;
                    return (
                      <td key={f.key} className="td">
                        <input aria-label={`${SEGMENT_LABEL[seg]} ${f.label}`} type="number" className="field w-24" step={f.pct ? f.step * 100 : f.step}
                          value={f.pct ? +(v * 100).toFixed(6) : v}
                          onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setSeg(seg, f.key, f.pct ? n / 100 : n); }} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">Percent fields are entered as %: for example, 0.1 means 0.1% of turnover.</p>
      </Card>

      <Card className="mt-5" title="Data">
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => confirm('Remove all saved scenarios?') && clearScen()}>Clear scenarios</button>
          <button className="btn-ghost" onClick={() => confirm('Remove all journal trades?') && clearJ([])}>Clear journal</button>
          <button className="btn-ghost" onClick={resetRenko}>Reset Renko watchlist</button>
          <button className="btn-ghost" onClick={() => confirm('Reset all settings?') && s.reset()}>Reset settings</button>
        </div>
      </Card>
    </div>
  );
}
