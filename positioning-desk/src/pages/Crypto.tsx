import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Guide, NumberField, PageHeader, Segmented, Stat, Warnings } from '../components/ui';
import { PriceMap, PrintButton, SaveScenario, tipStyle } from '../components/viz';
import { computeCrypto } from '../lib/calc/crypto';
import type { Side } from '../lib/calc/sizing';
import { CRYPTO_SPECS } from '../config/instruments';
import { money, num, pct } from '../lib/format';
import { usePalette } from '../lib/theme';
import { useSettings } from '../store';

type Coin = keyof typeof CRYPTO_SPECS;

export default function Crypto() {
  const p = usePalette();
  const usdinr = useSettings((s) => s.usdinr);
  const [coin, setCoin] = useState<Coin>('BTC');
  const spec = CRYPTO_SPECS[coin];
  const [account, setAccount] = useState(58.82);
  const [riskPct, setRiskPct] = useState(0.1);
  const [leverage, setLeverage] = useState(200);
  const [open, setOpen] = useState(74492);
  const [entry, setEntry] = useState(74493);
  const [stop, setStop] = useState(74493 - 250);
  const [rr, setRr] = useState(2);
  const [band, setBand] = useState(500);
  const [side, setSide] = useState<Side>('long');
  const [mmr, setMmr] = useState(0.005);
  const [fee, setFee] = useState(0.0005);
  const [funding, setFunding] = useState(0.0001);
  const [hold, setHold] = useState(8);

  const switchCoin = (c: Coin) => {
    setCoin(c);
    const s = CRYPTO_SPECS[c];
    setOpen(s.defaultEntry - 1); setEntry(s.defaultEntry); setStop(s.defaultEntry - s.defaultStopGap); setBand(s.band);
  };
  const loadExcel = () => { switchCoin('BTC'); setAccount(58.82); setRiskPct(0.1); setLeverage(200); setOpen(74492); setEntry(74493); setStop(74243); setRr(2); setBand(500); setSide('long'); };

  const c = useMemo(() => computeCrypto({ account, riskPct, leverage, open, entry, stop, rr, side, bandOffset: band, usdinr, mmr, feeRate: fee, fundingRate: funding, holdHours: hold }), [account, riskPct, leverage, open, entry, stop, rr, side, band, usdinr, mmr, fee, funding, hold]);

  const levCurve = useMemo(() => [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 125, 150, 175, 200].map((L) => ({ L, liq: Math.max(0, 1 / L - mmr) * 100 })), [mmr]);
  const ladder = [1, 1.5, 2, 3].map((x) => ({ rr: x, price: entry + c.dir * x * c.slDistance }));

  const inrRows: [string, number][] = [
    ['Account size', account], ['Risk amount', c.riskAmount], ['Position size', c.positionUSD], ['Margin required', c.margin],
    ['Entry price', entry], ['Stop loss', stop], ['Target price', c.targetPrice], ['Gross profit', c.profit], ['Net profit', c.netProfit],
    ['Upper band', c.upperBand], ['Lower band', c.lowerBand],
  ];

  return (
    <div>
      <PageHeader title="BTC / ETH: Leveraged Positioning" subtitle='Workbook "BTC Trade (USD)" sheet, with liquidation, fees, funding and the Indian VDA tax' icon="crypto" accent="from-orange-500 to-amber-400" actions={<PrintButton />} />
      <Guide steps={[
        'Enter your account in USD, risk %, leverage and the entry and stop. Position size = risk ÷ SL%, the same as the workbook.',
        'Check the liquidation meter. If liquidation comes before your stop, your stop is fiction: lower the leverage.',
        'Compare USD and INR. India taxes crypto gains at a flat 30%, with 1% TDS on the sale value and no loss set-off.',
      ]} />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card title="Trade inputs" action={<button className="text-xs font-bold text-brand" onClick={loadExcel}>Load Excel example</button>}>
          <div className="mb-4 flex flex-wrap gap-2">
            <Segmented layoutKey="coin" value={coin} onChange={switchCoin} options={[{ value: 'BTC', label: '₿ BTC' }, { value: 'ETH', label: 'Ξ ETH' }]} />
            <Segmented value={side} onChange={setSide} options={[{ value: 'long', label: 'Long', tone: 'gain' }, { value: 'short', label: 'Short', tone: 'loss' }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Account (USD)" prefix="$" value={account} onChange={setAccount} step={10} hint={`≈ ${money(account * usdinr)}`} />
            <NumberField label="Risk per trade" percent value={riskPct} onChange={setRiskPct} step={0.005} />
            <div className="col-span-2"><NumberField label="Leverage" suffix="x" value={leverage} onChange={setLeverage} min={1} max={200} step={1} slider tip="Exchange leverage. Higher leverage only lowers the margin you post. It does not change the risk at your stop, but it moves liquidation closer." analogy="Leverage is a shorter rope: the same climb, but you hit the ground (liquidation) sooner." /></div>
            <NumberField label="Opening price" prefix="$" value={open} onChange={setOpen} step={1} />
            <NumberField label="Band ± (pts)" value={band} onChange={setBand} step={10} tip="Upper/lower band = open ± this. The workbook uses ±500." />
            <NumberField label="Entry price" prefix="$" value={entry} onChange={setEntry} step={1} />
            <NumberField label="Stop loss" prefix="$" value={stop} onChange={setStop} step={1} />
            <NumberField label="R:R" value={rr} onChange={setRr} step={0.25} suffix="R" />
            <NumberField label="Hold (hours)" value={hold} onChange={setHold} step={1} min={0} />
            <NumberField label="Taker fee / side" percent value={fee} onChange={setFee} step={0.0001} />
            <NumberField label="Funding / 8h" percent value={funding} onChange={setFunding} step={0.00005} />
            <div className="col-span-2"><NumberField label="Maintenance margin" percent value={mmr} onChange={setMmr} step={0.0005} tip="Exchange maintenance margin rate, used to estimate the isolated-margin liquidation price." /></div>
          </div>
        </Card>

        <div className="space-y-5">
          <Warnings items={c.warnings} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat big label="Position size" value={c.positionUSD} format={(v) => money(v, 'USD')} tone="brand" sub={`${num(c.qty, 5)} ${spec.symbol}`} />
            <Stat big label="Margin required" value={c.margin} format={(v) => money(v, 'USD')} sub={`${pct(c.marginPctOfAccount, 1)} of account`} />
            <Stat big label="Risk amount" value={-c.riskAmount} format={(v) => money(v, 'USD')} tone="loss" sub={money(c.inr(c.riskAmount))} />
            <Stat big label="Net profit" value={c.netProfit} format={(v) => money(v, 'USD')} tone="auto" sub={`${money(c.inr(c.netProfit))} · ${num(c.rr, 2)}R`} />
            <Stat label="SL %" value={c.slPct} format={(v) => pct(v, 3)} />
            <Stat label="Target" value={c.targetPrice} format={(v) => '$' + num(v)} tone="gain" sub={pct(c.targetPct, 3, true)} />
            <Stat label="Liquidation" value={c.liquidationPrice} format={(v) => '$' + num(v)} tone={c.stopBeyondLiquidation ? 'loss' : 'warn'} sub={`${pct(c.liqDistancePct, 2)} away`} />
            <Stat label="Max safe leverage" value={c.maxSafeLeverage} format={(v) => (isFinite(v) ? num(Math.floor(v), 0) + 'x' : '—')} tone="brand" sub="Liquidation stays beyond your SL" />
          </div>

          <Card title="Liquidation vs stop" subtitle="Distance to liquidation shrinks as leverage rises. Your stop must sit inside it.">
            <div className="mb-4 mt-8">
              <div className="relative h-10 rounded-xl bg-surface2">
                {(() => {
                  const scale = Math.max(c.slPct, c.liqDistancePct, 0.0001) * 1.25;
                  const sl = (c.slPct / scale) * 100, lq = (c.liqDistancePct / scale) * 100;
                  return (
                    <>
                      <motion.div className="absolute inset-y-0 left-0 rounded-xl" style={{ background: `linear-gradient(90deg, ${p.gain}33, ${p.warn}55)` }} animate={{ width: `${lq}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                      <motion.div className="absolute inset-y-0 w-1 rounded bg-loss" animate={{ left: `${lq}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                      <motion.div className="absolute -top-1 bottom-[-4px] w-1 rounded bg-ink" animate={{ left: `${sl}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                      <motion.span className="absolute -bottom-5 -translate-x-1/2 text-[10px] font-bold" animate={{ left: `${sl}%` }}>SL {pct(c.slPct, 2)}</motion.span>
                      <motion.span className="absolute -top-5 -translate-x-1/2 text-[10px] font-bold text-loss" animate={{ left: `${lq}%` }}>LIQ {pct(c.liqDistancePct, 2)}</motion.span>
                    </>
                  );
                })()}
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">Entry</span>
              </div>
            </div>
            <div className="mt-8 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={levCurve} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={p.line} vertical={false} />
                  <XAxis dataKey="L" type="number" scale="log" domain={[1, 200]} ticks={[1, 2, 5, 10, 20, 50, 100, 200]} tickFormatter={(v) => `${v}x`} tick={{ fill: p.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis scale="log" domain={[0.05, 100]} allowDataOverflow tickFormatter={(v) => `${v}%`} tick={{ fill: p.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={tipStyle(p)} labelFormatter={(v) => `${v}x leverage`} formatter={(v: number) => [`${v.toFixed(2)}%`, 'Liq. distance']} />
                  <ReferenceLine y={Math.max(0.05, c.slPct * 100)} stroke={p.loss} strokeDasharray="5 4" label={{ value: `Your SL ${pct(c.slPct, 2)}`, fill: p.loss, fontSize: 11, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="liq" stroke={p.brand} strokeWidth={2.5} dot={false} animationDuration={900} />
                  <ReferenceDot x={Math.min(200, Math.max(1, leverage))} y={Math.max(0.05, c.liqDistancePct * 100)} r={6} fill={c.stopBeyondLiquidation ? p.loss : p.gain} stroke="none" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="USD ⇄ INR" subtitle={`@ ${usdinr} (change it in the header)`}>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line"><th className="th">Item</th><th className="th text-right">USD</th><th className="th text-right">INR</th></tr></thead>
                <tbody>
                  {inrRows.map(([k, v]) => (
                    <tr key={k} className="border-b border-line/50 last:border-0"><td className="td">{k}</td><td className="td text-right">{money(v, 'USD')}</td><td className="td text-right text-muted">{money(v * usdinr)}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Costs & Indian tax" subtitle="At target">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Exchange fees" value={c.fees} format={(v) => money(v, 'USD')} />
                <Stat label={`Funding (${hold}h)`} value={c.funding} format={(v) => money(v, 'USD')} />
                <Stat label="30% VDA tax" value={c.taxIndia} format={(v) => money(v * usdinr)} tone="warn" />
                <Stat label="1% TDS on sale" value={c.tdsIndia} format={(v) => money(v * usdinr)} tone="warn" sub="Credit claimable in ITR" />
              </div>
              <div className="mt-3 rounded-xl bg-surface2/60 p-3 text-sm">
                Post-tax profit ≈ <b className="text-gain">{money((c.netProfit - c.taxIndia) * usdinr)}</b>. Under section 115BBH, crypto losses cannot be set off against other income.
              </div>
            </Card>
          </div>

          <Card title="Price map" action={<SaveScenario build={() => c.positionUSD > 0 ? {
            name: `${coin} ${side} ${leverage}x @ $${entry}`, page: '/crypto', assetClass: 'Crypto', side,
            riskINR: c.inr(-c.netLoss), exposureINR: c.inr(c.positionUSD), rewardINR: c.inr(c.netProfit), rr: c.rr,
            summary: [{ label: 'Size', value: `${num(c.qty, 5)} ${coin}` }, { label: 'Margin', value: money(c.margin, 'USD') }, { label: 'Liq', value: '$' + num(c.liquidationPrice) }, { label: 'Risk', value: money(c.riskAmount, 'USD') }],
          } : null} />}>
            <PriceMap entry={entry} stop={stop} targets={ladder} tsl={c.liquidationPrice} ccy="USD" tslLabel="LIQ" />
            <p className="mt-1 text-xs text-muted">The amber dashed <b>LIQ</b> marker is the estimated liquidation price.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
