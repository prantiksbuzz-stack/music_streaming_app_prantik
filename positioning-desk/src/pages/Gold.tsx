import { useMemo, useState } from 'react';
import { Card, Guide, NumberField, PageHeader, Segmented, Stat, Warnings } from '../components/ui';
import { LadderChart, PriceMap, PrintButton, RiskGauge, SaveScenario } from '../components/viz';
import { computeGold } from '../lib/calc/forex';
import type { Side } from '../lib/calc/sizing';
import { XAU_SPEC } from '../config/instruments';
import { money, num, pct } from '../lib/format';
import { useSettings } from '../store';

export default function Gold() {
  const usdinr = useSettings((s) => s.usdinr);
  const [account, setAccount] = useState(1000);
  const [riskPct, setRiskPct] = useState(0.01);
  const [entry, setEntry] = useState(XAU_SPEC.defaultEntry);
  const [stop, setStop] = useState(XAU_SPEC.defaultEntry - XAU_SPEC.defaultStopGap);
  const [rr, setRr] = useState(2);
  const [leverage, setLeverage] = useState(100);
  const [contract, setContract] = useState(XAU_SPEC.contractSize);
  const [swap, setSwap] = useState(-6);
  const [nights, setNights] = useState(1);
  const [commission, setCommission] = useState(7);
  const [side, setSide] = useState<Side>('long');

  const g = useMemo(() => computeGold({ account, riskPct, entry, stop, rr, leverage, side, contractSize: contract, swapPerLotPerNight: swap, nights, commissionPerLot: commission, usdinr }), [account, riskPct, entry, stop, rr, leverage, side, contract, swap, nights, commission, usdinr]);
  const targets = [1, 1.5, 2, 3].map((x) => ({ rr: x, price: entry + g.dir * x * g.distance }));
  const ladderRows = targets.map((t) => ({ rr: t.rr, gross: g.ounces * t.rr * g.distance, net: g.ounces * t.rr * g.distance + g.swap - g.commission }));

  return (
    <div>
      <PageHeader title="XAUUSD: Spot Gold" subtitle="Lot sizing from risk, pip and point value, margin, swap and the INR view" icon="gold" accent="from-yellow-500 to-amber-600" actions={<PrintButton />} />
      <Guide steps={[
        '1 standard lot = 100 oz, so a $1 move = $100 per lot and a 0.01 pip = $1 per lot. Check your broker\'s contract size.',
        'Set the stop in dollars from entry. Lots = risk ÷ (stop distance × contract size), rounded down to 0.01.',
        'Watch the margin level and the overnight swap if you hold the trade for several days.',
      ]} />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card title="Trade inputs">
          <div className="mb-4"><Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Buy', tone: 'gain' }, { value: 'short', label: 'Sell', tone: 'loss' }]} /></div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Account (USD)" prefix="$" value={account} onChange={setAccount} step={100} hint={`≈ ${money(account * usdinr)}`} />
            <NumberField label="Risk per trade" percent value={riskPct} onChange={setRiskPct} step={0.0025} />
            <NumberField label="Entry" prefix="$" value={entry} onChange={setEntry} step={0.1} />
            <NumberField label="Stop loss" prefix="$" value={stop} onChange={setStop} step={0.1} />
            <NumberField label="R:R" value={rr} onChange={setRr} step={0.25} suffix="R" />
            <NumberField label="Leverage" suffix="x" value={leverage} onChange={setLeverage} step={10} min={1} />
            <NumberField label="Contract (oz/lot)" value={contract} onChange={setContract} step={1} min={1} />
            <NumberField label="Commission/lot" prefix="$" value={commission} onChange={setCommission} step={0.5} />
            <NumberField label="Swap / lot / night" prefix="$" value={swap} onChange={setSwap} step={0.5} tip="Negative = you pay. Check your broker's swap table." />
            <NumberField label="Nights held" value={nights} onChange={(v) => setNights(Math.max(0, Math.round(v)))} step={1} min={0} />
          </div>
        </Card>
        <div className="space-y-5">
          <Warnings items={g.warnings} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat big label="Lots" value={g.lots} format={(v) => num(v, 2)} tone="brand" sub={`${num(g.ounces, 0)} oz · raw ${num(g.rawLots, 3)}`} />
            <Stat big label="Risk" value={-g.actualRisk} format={(v) => money(v, 'USD')} tone="loss" sub={money(g.actualRisk * usdinr)} />
            <Stat big label="Margin" value={g.margin} format={(v) => money(v, 'USD')} sub={`Notional ${money(g.notional, 'USD', { compact: true })}`} />
            <Stat big label={`Net @ ${rr}R`} value={g.netProfit} format={(v) => money(v, 'USD')} tone="auto" sub={money(g.netProfit * usdinr)} />
            <Stat label="Stop distance" value={g.distance} format={(v) => '$' + num(v)} sub={pct(g.slPct, 3)} />
            <Stat label="$ per $1 move" value={g.valuePerPoint} format={(v) => money(v, 'USD')} />
            <Stat label="Pip value / lot" value={g.pipValuePerLot} format={(v) => money(v, 'USD')} sub="per 0.01 move" />
            <Stat label="Target" value={g.targetPrice} format={(v) => '$' + num(v)} tone="gain" />
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <Card title="Margin usage" subtitle="Margin ÷ equity">
              <div className="flex justify-center"><RiskGauge value={account > 0 ? g.margin / account : 0} max={1} label="Margin used" caption={`Margin level ${isFinite(g.marginLevel) ? num(g.marginLevel * 100, 0) + '%' : '—'}`} /></div>
            </Card>
            <Card title="Profit ladder"><LadderChart ccy="USD" rows={ladderRows} /></Card>
          </div>
          <Card title="Price map" action={<SaveScenario build={() => g.lots > 0 ? {
            name: `XAUUSD ${side} ${g.lots} lot @ $${entry}`, page: '/gold', assetClass: 'Gold', side,
            riskINR: (g.actualRisk + g.commission) * usdinr, exposureINR: g.notional * usdinr, rewardINR: g.netProfit * usdinr, rr,
            summary: [{ label: 'Lots', value: num(g.lots, 2) }, { label: 'Entry/SL', value: `$${entry} / $${stop}` }, { label: 'Risk', value: money(g.actualRisk, 'USD') }, { label: 'Margin', value: money(g.margin, 'USD') }],
          } : null} />}>
            <PriceMap entry={entry} stop={stop} targets={targets} ccy="USD" />
          </Card>
        </div>
      </div>
    </div>
  );
}
