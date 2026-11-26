import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, Guide, NumberField, PageHeader, Stat, Toggle } from '../components/ui';
import { RiskGauge, tipStyle } from '../components/viz';
import { histogram, simulate } from '../lib/calc/montecarlo';
import { money, num, pct } from '../lib/format';
import { usePalette, draw } from '../lib/theme';
import { useSettings } from '../store';

export default function RiskLab() {
  const p = usePalette();
  const capital = useSettings((s) => s.capitalINR);
  const [start, setStart] = useState(capital);
  const [winRate, setWinRate] = useState(0.45);
  const [avgR, setAvgR] = useState(1.8);
  const [riskPct, setRiskPct] = useState(0.01);
  const [trades, setTrades] = useState(200);
  const [costR, setCostR] = useState(0.05);
  const [compounding, setCompounding] = useState(true);
  const [seed, setSeed] = useState(42);

  const sim = useMemo(() => simulate({ start, winRate, avgWinR: avgR, riskPct, trades, runs: 100, compounding, costR, seed }), [start, winRate, avgR, riskPct, trades, compounding, costR, seed]);

  // SVG equity curves
  const W = 800, H = 300;
  const all = sim.curves.flat();
  const yMin = Math.min(...all, start * 0.5), yMax = Math.max(...all, start * 1.2);
  const X = (t: number) => (t / trades) * W;
  const Y = (v: number) => H - ((v - yMin) / (yMax - yMin)) * H;
  const path = (c: number[]) => c.map((v, t) => `${t ? 'L' : 'M'}${X(t).toFixed(1)},${Y(v).toFixed(1)}`).join('');

  const ddHist = histogram(sim.maxDrawdowns.map((d) => d * 100), 12, 0, Math.max(5, Math.ceil(Math.max(...sim.maxDrawdowns) * 100)));
  const riskTable = useMemo(() => [0.005, 0.01, 0.02, 0.03, 0.05, 0.1].map((r) => {
    const s = simulate({ start, winRate, avgWinR: avgR, riskPct: r, trades, runs: 300, compounding, costR, seed: 7 });
    return { risk: r, ruin: s.ruinProb, dd: s.medianMaxDD, final: s.medianFinal };
  }), [start, winRate, avgR, trades, compounding, costR]);
  const beCurve = Array.from({ length: 21 }, (_, k) => {
    const rr = 0.5 + k * 0.25;
    return { rr, gross: 100 / (1 + rr), net: (100 * (1 + costR)) / (1 + rr) };
  });

  return (
    <div>
      <PageHeader title="Risk Lab: Monte Carlo" subtitle="Stress-test your system: 100 possible futures from the same edge" icon="risklab" accent="from-violet-500 to-fuchsia-500" />
      <Guide steps={[
        'Enter your real win rate and average winner in R, from the Journal if you keep one.',
        'Change the risk per trade and watch the drawdowns and the risk of ruin rise. The edge stays the same and only the bet size changes.',
        'Pick a risk % where even the 5th-percentile path is something you could live through.',
      ]} />
      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <Card title="System">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <NumberField label="Starting capital" prefix="₹" value={start} onChange={setStart} step={10000} />
            <NumberField label="Win rate" percent value={winRate} onChange={setWinRate} min={0.05} max={0.95} step={0.01} slider />
            <NumberField label="Avg winner (R)" value={avgR} onChange={setAvgR} min={0.2} max={6} step={0.1} slider suffix="R" />
            <NumberField label="Risk per trade" percent value={riskPct} onChange={setRiskPct} min={0.0025} max={0.1} step={0.0025} slider analogy="This is the size of each bet at a fair table. Even a winning system goes broke if every bet is too large." tip="Fraction of equity risked per trade." />
            <NumberField label="Trades" value={trades} onChange={(v) => setTrades(Math.min(1000, Math.max(10, Math.round(v))))} min={20} max={500} step={10} slider />
            <NumberField label="Cost per trade (R)" value={costR} onChange={setCostR} step={0.01} min={0} tip="Charges plus slippage as a fraction of 1R. For example, ₹50 of costs on ₹1,000 of risk = 0.05R." />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Toggle checked={compounding} onChange={setCompounding} label="Compounding" />
            <button className="btn-ghost text-xs" onClick={() => setSeed((s) => s + 1)}>Re-roll</button>
          </div>
        </Card>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat big label="Expectancy" value={sim.expectancyR} format={(v) => num(v, 3) + 'R'} tone="auto" sub={`${money(sim.expectancyR * start * riskPct)} per trade at the start`} tip="Average R won per trade after costs. Below zero, no position sizing can save the system." />
            <Stat big label="Median final" value={sim.medianFinal} format={(v) => money(v, 'INR', { compact: true })} tone={sim.medianFinal >= start ? 'gain' : 'loss'} sub={pct(sim.medianFinal / start - 1, 1, true)} />
            <Stat big label="Median max DD" value={sim.medianMaxDD} format={(v) => pct(v, 1)} tone="warn" sub={`Worst ${pct(sim.worstMaxDD, 1)}`} />
            <Stat big label="Kelly fraction" value={sim.kelly} format={(v) => pct(v, 1)} tone="brand" sub={`Half-Kelly ${pct(Math.max(0, sim.kelly / 2), 1)}`} tip="Theoretical growth-optimal risk. Professionals use ¼ to ½ Kelly because real edges are uncertain." />
          </div>

          <Card title="100 simulated equity curves" subtitle="Faint lines: individual paths · Bold: median · Dashed: 5th / 95th percentile">
            <div className="relative overflow-hidden rounded-xl bg-grid">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-72 w-full" preserveAspectRatio="none" role="img" aria-label="Monte Carlo equity curves">
                <line x1={0} x2={W} y1={Y(start)} y2={Y(start)} stroke={p.muted} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
                <line x1={0} x2={W} y1={Y(start * 0.5)} y2={Y(start * 0.5)} stroke={p.loss} strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
                {sim.curves.map((c, k) => (
                  <motion.path key={`${seed}-${k}`} d={path(c)} fill="none" stroke={c[c.length - 1] >= start ? p.gain : p.loss} strokeOpacity={0.22} strokeWidth={1} vectorEffect="non-scaling-stroke"
                    {...draw(0, 1, { duration: 1.2, delay: k * 0.008, ease: 'easeOut' })} />
                ))}
                <motion.path key={`p5-${seed}`} d={path(sim.p5)} fill="none" stroke={p.warn} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" {...draw(0, 1, { duration: 1.4, delay: 0.4 })} />
                <motion.path key={`p95-${seed}`} d={path(sim.p95)} fill="none" stroke={p.brand2} strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" {...draw(0, 1, { duration: 1.4, delay: 0.4 })} />
                <motion.path key={`p50-${seed}`} d={path(sim.p50)} fill="none" stroke={p.brand} strokeWidth={3} vectorEffect="non-scaling-stroke" {...draw(0, 1, { duration: 1.4, delay: 0.5 })} />
              </svg>
              <div className="absolute left-2 top-2 rounded-lg bg-surface/90 px-2 py-1 text-[11px] text-muted">{money(yMax, 'INR', { compact: true })}</div>
              <div className="absolute bottom-2 left-2 rounded-lg bg-surface/90 px-2 py-1 text-[11px] text-muted">{money(yMin, 'INR', { compact: true })}</div>
              <div className="absolute bottom-2 right-2 rounded-lg bg-surface/90 px-2 py-1 text-[11px] text-loss">Red dotted line = 50% ruin level</div>
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <Card title="Risk of ruin" subtitle="Share of paths that touched −50%">
              <div className="flex justify-center"><RiskGauge value={sim.ruinProb} max={1} label="Probability of ruin" format={(v) => pct(v, 0)} caption={`Prob. of profit ${pct(sim.probProfit, 0)} · longest losing streak ${sim.longestLosingStreak}`} /></div>
            </Card>
            <Card title="Max drawdown distribution">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ddHist.map((b) => ({ name: `${b.x0.toFixed(0)}–${b.x1.toFixed(0)}%`, count: b.count }))}>
                    <CartesianGrid stroke={p.line} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: p.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={tipStyle(p)} cursor={{ fill: p.surface2 }} />
                    <Bar dataKey="count" fill={p.warn} radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="Same edge, different bet size" subtitle="300 runs each">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line"><th className="th">Risk/trade</th><th className="th">Ruin</th><th className="th">Median DD</th><th className="th">Median final</th></tr></thead>
                <tbody>
                  {riskTable.map((r) => (
                    <tr key={r.risk} className={`border-b border-line/50 last:border-0 ${Math.abs(r.risk - riskPct) < 1e-9 ? 'bg-brand/10' : ''}`}>
                      <td className="td font-bold">{pct(r.risk, 1)}</td>
                      <td className={`td ${r.ruin > 0.05 ? 'text-loss font-bold' : 'text-gain'}`}>{pct(r.ruin, 0)}</td>
                      <td className="td">{pct(r.dd, 1)}</td>
                      <td className="td">{money(r.final, 'INR', { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Breakeven win rate vs R:R" subtitle={`With and without ${num(costR, 2)}R of costs`}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={beCurve} margin={{ right: 10 }}>
                    <CartesianGrid stroke={p.line} vertical={false} />
                    <XAxis dataKey="rr" tick={{ fill: p.muted, fontSize: 11 }} tickFormatter={(v) => `${v}R`} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: p.muted, fontSize: 11 }} tickFormatter={(v) => `${v.toFixed(0)}%`} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => `${v.toFixed(1)}%`} labelFormatter={(v) => `${v}R`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={winRate * 100} stroke={p.brand} strokeDasharray="4 4" label={{ value: 'Your win rate', fill: p.brand, fontSize: 11, position: 'insideTopRight' }} />
                    <Line dataKey="gross" name="No costs" stroke={p.brand2} strokeWidth={2} dot={false} />
                    <Line dataKey="net" name="After costs" stroke={p.loss} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
