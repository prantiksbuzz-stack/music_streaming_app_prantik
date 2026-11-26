import { useMemo, useState } from 'react';
import { Card, Guide, NumberField, PageHeader, Segmented, Stat, Warnings, TextField } from '../components/ui';
import { CapacityBar, ChargesDonut, CostRing, LadderChart, PriceMap, PrintButton, SaveScenario } from '../components/viz';
import { computeMargin } from '../lib/calc/margin';
import { computeSizing, DEFAULT_LADDER, type Side } from '../lib/calc/sizing';
import { roundTrip } from '../lib/calc/charges';
import { money, num, pct } from '../lib/format';
import { useSettings } from '../store';

export default function Intraday() {
  const rates = useSettings((s) => s.rates);
  const [symbol, setSymbol] = useState('STOCK');
  const [margin, setMargin] = useState(19461.3);
  const [leverage, setLeverage] = useState(5);
  const [ltp, setLtp] = useState(277.2);
  const [stop, setStop] = useState(274.4);
  const [riskPct, setRiskPct] = useState(0.01);
  const [side, setSide] = useState<Side>('long');

  const sizing = useMemo(() => computeSizing({ account: margin, riskPct, entry: ltp, stop, side, rounding: 'int', ladder: DEFAULT_LADDER }), [margin, riskPct, ltp, stop, side]);
  const m = useMemo(() => computeMargin({ margin, leverage, ltp, riskQty: sizing.riskPerUnit > 0 ? sizing.rawQty : undefined }), [margin, leverage, ltp, sizing]);
  const qty = m.finalQty;
  const rows = sizing.targets.map((t) => {
    const gross = t.rr * sizing.riskPerUnit * qty;
    const ch = roundTrip('intraday', qty, ltp, t.price, side, rates);
    return { rr: t.rr, price: t.price, gross, charges: ch.total, net: gross - ch.total };
  });
  const oneR = rows.find((x) => x.rr === 1.5) ?? rows[0];
  const slCh = roundTrip('intraday', qty, ltp, stop, side, rates);
  const beMove = qty > 0 ? slCh.total / qty : 0;
  const realRisk = qty * sizing.riskPerUnit + slCh.total;
  const warnings = [...sizing.warnings, ...(m.limitedBy === 'margin' && sizing.rawQty > m.maxShares ? [`Margin caps you at ${m.maxShares} shares, below the ${Math.floor(sizing.rawQty)} your risk budget allows. Your actual risk will be lower.`] : [])];
  const loadExcel = () => { setMargin(19461.3); setLeverage(5); setLtp(277.2); };

  return (
    <div>
      <PageHeader title="Intraday Equity (MIS)" subtitle='Workbook "Sheet2" buying-power calculator, combined with risk sizing and cost drag' icon="intraday" accent="from-amber-500 to-rose-500" actions={<PrintButton />} />
      <Guide steps={[
        'Enter the available margin, the broker MIS leverage for the stock, and the LTP. This is the same as the workbook.',
        'Add a stop and risk %. The final quantity is the smaller of the margin cap and the risk cap.',
        'Check how much of your profit the charges eat, and the move needed just to break even.',
      ]} />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card title="Inputs" action={<button className="text-xs font-bold text-brand" onClick={loadExcel}>Load Excel example</button>}>
          <div className="mb-4"><Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Buy', tone: 'gain' }, { value: 'short', label: 'Sell short', tone: 'loss' }]} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><TextField label="Symbol" value={symbol} onChange={(v) => setSymbol(v.toUpperCase())} /></div>
            <NumberField label="Margin available" prefix="₹" value={margin} onChange={setMargin} step={500} />
            <NumberField label="Leverage" suffix="x" value={leverage} onChange={setLeverage} step={0.5} min={1} max={5} slider tip="SEBI caps intraday equity leverage at 5x (20% margin) for most stocks." analogy="Leverage is a magnifying glass: it makes both your gains and your losses look bigger." />
            <NumberField label="Stock LTP (entry)" prefix="₹" value={ltp} onChange={setLtp} step={0.05} />
            <NumberField label="Stop loss" prefix="₹" value={stop} onChange={setStop} step={0.05} />
            <div className="col-span-2"><NumberField label="Risk per trade (of margin)" percent value={riskPct} onChange={setRiskPct} step={0.0025} min={0.0025} max={0.05} slider /></div>
          </div>
        </Card>

        <div className="space-y-5">
          <Warnings items={warnings} />
          <Card title="Buying power (Sheet2)" subtitle="Margin × leverage, and how much of it the position uses">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Stat label="Buying power" value={m.buyingPower} format={(v) => money(v)} tone="brand" />
              <Stat label="Maximum shares" value={m.maxShares} format={(v) => num(v, 0)} />
              <Stat label="Position value" value={m.positionValue} format={(v) => money(v)} />
              <Stat label="Margin used" value={m.marginUsed} format={(v) => money(v)} />
              <Stat label="Remaining margin" value={m.remainingMargin} format={(v) => money(v)} />
              <Stat label="Unused buying power" value={m.unusedBuyingPower} format={(v) => money(v)} />
            </div>
            <div className="mt-4"><CapacityBar used={m.finalValue} total={m.buyingPower} labels={[`Your position ${money(m.finalValue, 'INR', { compact: true })}`, `Buying power ${money(m.buyingPower, 'INR', { compact: true })}`]} /></div>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat big label="Final quantity" value={qty} format={(v) => num(Math.round(v), 0)} tone="brand" sub={`Limited by ${m.limitedBy}`} />
            <Stat big label="Real risk" value={-realRisk} format={(v) => money(v)} tone="loss" sub={`${pct(margin ? realRisk / margin : 0)} of margin, incl. charges`} />
            <Stat big label="Margin blocked" value={m.finalMargin} format={(v) => money(v)} sub={`${pct(m.utilisation, 0)} utilised`} />
            <Stat big label="Breakeven move" value={beMove} format={(v) => '₹' + num(v, 2)} tone="warn" sub={`${pct(ltp ? beMove / ltp : 0, 3)} just to cover costs`} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Cost drag" subtitle={`Charges as a share of gross profit at ${oneR?.rr ?? 0}R`}>
              <CostRing share={oneR && oneR.gross > 0 ? oneR.charges / oneR.gross : 1} label={`${money(oneR?.charges ?? 0)} of ${money(oneR?.gross ?? 0)} gross`} />
              <div className="mt-4"><ChargesDonut lines={slCh.lines} total={slCh.total} /></div>
            </Card>
            <Card title="Target ladder" subtitle="Gross vs net"><LadderChart rows={rows.map((x) => ({ rr: x.rr, gross: x.gross, net: x.net }))} /></Card>
          </div>
          <Card title="Price map" action={<SaveScenario build={() => qty > 0 ? {
            name: `${symbol} MIS ${side} @ ₹${ltp}`, page: '/intraday', assetClass: 'Intraday', side, riskINR: realRisk, exposureINR: m.finalValue,
            rewardINR: rows[rows.length - 1]?.net ?? 0, rr: 2,
            summary: [{ label: 'Qty', value: String(qty) }, { label: 'Lev', value: `${leverage}x` }, { label: 'Risk', value: money(realRisk) }, { label: 'BE move', value: '₹' + num(beMove) }],
          } : null} />}>
            <PriceMap entry={ltp} stop={stop} targets={sizing.targets} />
          </Card>
        </div>
      </div>
    </div>
  );
}
