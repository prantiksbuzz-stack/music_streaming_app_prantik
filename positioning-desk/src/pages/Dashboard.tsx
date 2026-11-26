import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Pill, Stat } from '../components/ui';
import { Icon } from '../components/Icon';
import { RiskGauge, tipStyle } from '../components/viz';
import { NAV } from '../nav';
import { money, num, pct } from '../lib/format';
import { usePalette } from '../lib/theme';
import { useJournal, useScenarios, useSettings } from '../store';
import { journalStats } from '../lib/calc/journal';

const AUDIT = [
  ['BTC sheet', 'Stop is hard-coded at entry − 250 and target at entry + 750 (3R), while the R:R cell says 2, so the target price and the profit disagree. The app derives the target from R:R.'],
  ['BTC sheet', 'At 200x leverage the liquidation is ≈0.0% from entry (0.5% MMR), so the $250 stop can never fill. The app warns you and shows the maximum safe leverage (≈119x).'],
  ['Indian Market', 'Position size comes out fractional (11.11 shares). The app floors it to whole shares and keeps an "Excel exact" toggle.'],
  ['Nifty Options', 'Highest price of 9 is below the entry of 44.6, so the trailing SL goes negative (₹5.40). The app validates it.'],
  ['All sheets', 'Long-only formulas. The app adds a Long/Short toggle everywhere.'],
  ['All sheets', 'No brokerage, STT, GST or stamp duty. The app adds a full Indian charges engine, plus crypto fees, funding and tax.'],
];

export default function Dashboard() {
  const p = usePalette();
  const { capitalINR, maxHeatPct, mode } = useSettings();
  const { scenarios, compare, remove, toggleCompare } = useScenarios();
  const trades = useJournal((s) => s.trades);
  const js = journalStats(trades);
  const totalRisk = scenarios.reduce((a, s) => a + s.riskINR, 0);
  const totalExposure = scenarios.reduce((a, s) => a + s.exposureINR, 0);
  const heatLimit = capitalINR * maxHeatPct;
  const byClass = Object.entries(scenarios.reduce<Record<string, number>>((m, s) => ({ ...m, [s.assetClass]: (m[s.assetClass] ?? 0) + s.riskINR }), {})).map(([name, value]) => ({ name, value }));
  const compared = scenarios.filter((s) => compare.includes(s.id));
  const tiles = NAV.filter((n) => n.to !== '/' && n.to !== '/settings');

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <motion.div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-brand2/20 blur-3xl" animate={{ x: [0, 40, 0], y: [0, -10, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative grid items-center gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <Pill tone="brand">Risk first · Position second · Profit third</Pill>
            <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
              Size every trade like a professional,{' '}
              <span className="bg-gradient-to-r from-brand to-brand2 bg-clip-text text-transparent">from NIFTY to Bitcoin.</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted">
              One desk for Indian F&amp;O, cash equity, intraday, crypto and gold. Every formula from your risk-management workbook, plus charges, tax, Greeks, liquidation maths and Monte Carlo stress tests.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/index-options" className="btn-primary"><Icon name="index" className="h-4 w-4" />Start with NIFTY options</Link>
              <Link to="/risk-lab" className="btn-ghost"><Icon name="risklab" className="h-4 w-4" />Stress-test my system</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat big label="Capital at risk" value={totalRisk} format={(v) => money(v, 'INR', { compact: true })} tone={totalRisk > heatLimit ? 'loss' : 'brand'} sub={`${scenarios.length} saved setups`} />
            <Stat big label="Heat limit" value={heatLimit} format={(v) => money(v, 'INR', { compact: true })} sub={`${pct(maxHeatPct, 1)} of ${money(capitalINR, 'INR', { compact: true })}`} />
            <Stat big label="Exposure" value={totalExposure} format={(v) => money(v, 'INR', { compact: true })} sub="Notional / premium deployed" />
            <Stat big label="Journal P&L" value={js.total} format={(v) => money(v, 'INR', { compact: true })} tone="auto" sub={trades.length ? `${pct(js.winRate, 0)} win · ${num(js.avgR, 2)}R avg` : 'No trades logged yet'} />
          </div>
        </div>
      </motion.section>

      {/* Calculator tiles */}
      <div>
        <h2 className="label mb-3">Calculators</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t, k) => (
            <motion.div key={t.to} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * k }} whileHover={{ y: -4 }}>
              <Link to={t.to} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-brand/50">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/15 to-brand2/15 text-brand transition-transform group-hover:scale-110">
                  <Icon name={t.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold">{t.label}</div>
                  <div className="truncate text-xs text-muted">{t.blurb}</div>
                </div>
                <span className="ml-auto text-muted transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Portfolio risk board */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Portfolio heat" subtitle="Total risk of saved setups vs your limit">
          <div className="flex justify-center">
            <RiskGauge value={totalRisk} max={heatLimit} label="Capital at risk" format={(v) => money(v, 'INR', { compact: true, dp0: true })} caption={totalRisk > heatLimit ? '⚠ Over your heat limit: trim positions' : `${pct(heatLimit ? totalRisk / heatLimit : 0, 0)} of limit used`} />
          </div>
        </Card>
        <Card title="Risk by asset class">
          {byClass.length ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byClass} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none" animationDuration={800}>
                    {byClass.map((_, k) => <Cell key={k} fill={p.series[k % p.series.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty />}
          <div className="mt-2 flex flex-wrap gap-2">{byClass.map((c, k) => <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.series[k % p.series.length] }} />{c.name}</span>)}</div>
        </Card>
        <Card title="Reward vs risk per setup">
          {scenarios.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scenarios.slice(0, 8).map((s) => ({ name: s.name.slice(0, 14), Risk: -s.riskINR, Reward: s.rewardINR }))} stackOffset="sign">
                  <CartesianGrid stroke={p.line} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: p.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={44} />
                  <YAxis tick={{ fill: p.muted, fontSize: 10 }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => money(v, 'INR', { compact: true, dp0: true })} />
                  <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => money(v)} cursor={{ fill: p.surface2 }} />
                  <Bar dataKey="Reward" stackId="a" fill={p.gain} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Risk" stackId="a" fill={p.loss} radius={[0, 0, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty />}
        </Card>
      </div>

      {/* Scenario list + compare */}
      <Card title="Saved setups" subtitle="Tick up to 3 to compare side by side">
        {scenarios.length === 0 ? <Empty /> : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[720px]">
              <thead><tr className="border-b border-line"><th className="th">Compare</th><th className="th">Setup</th><th className="th">Class</th><th className="th">Risk</th><th className="th">Reward</th><th className="th">R:R</th><th className="th">% capital</th><th className="th"></th></tr></thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {scenarios.map((s) => (
                    <motion.tr key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: 30 }} className="border-b border-line/60">
                      <td className="td"><input type="checkbox" aria-label={`Compare ${s.name}`} checked={compare.includes(s.id)} onChange={() => toggleCompare(s.id)} className="h-4 w-4 accent-[rgb(var(--brand))]" /></td>
                      <td className="td"><Link to={s.page} className="font-bold hover:text-brand">{s.name}</Link><div className="text-[11px] text-muted">{new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div></td>
                      <td className="td"><Pill>{s.assetClass}</Pill></td>
                      <td className="td text-loss">{money(s.riskINR)}</td>
                      <td className="td text-gain">{money(s.rewardINR)}</td>
                      <td className="td">{num(s.rr, 2)}R</td>
                      <td className="td">{pct(capitalINR ? s.riskINR / capitalINR : 0)}</td>
                      <td className="td"><button aria-label="Delete" className="text-muted hover:text-loss" onClick={() => remove(s.id)}><Icon name="trash" className="h-4 w-4" /></button></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        <AnimatePresence>
          {compared.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {compared.map((s, k) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
                    <div className="flex items-center gap-2"><Icon name="compare" className="h-4 w-4 text-brand" /><div className="font-bold">{s.name}</div></div>
                    <dl className="mt-3 space-y-1.5 text-sm">
                      {[...s.summary, { label: 'Total risk (₹, incl. costs)', value: money(s.riskINR) }, { label: 'Net reward (₹)', value: money(s.rewardINR) }, { label: 'Exposure (₹)', value: money(s.exposureINR, 'INR', { compact: true }) }].map((x) => (
                        <div key={x.label} className="flex justify-between gap-2"><dt className="text-muted">{x.label}</dt><dd className="text-right font-bold tnum">{x.value}</dd></div>
                      ))}
                    </dl>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {mode === 'guided' && (
        <Card title="Workbook audit" subtitle="What we found in Risk_Management_Calculator.xlsx, and how the app handles it">
          <ul className="grid gap-2 md:grid-cols-2">
            {AUDIT.map(([where, what], k) => (
              <motion.li key={k} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: k * 0.05 }} className="flex gap-3 rounded-xl border border-line bg-surface2/50 p-3 text-sm">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                <span><b>{where}: </b>{what}</span>
              </motion.li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Empty() {
  return <div className="grid h-40 place-items-center text-center text-sm text-muted"><p>Nothing saved yet.<br />Use <b className="text-ink">Save scenario</b> on any calculator.</p></div>;
}
