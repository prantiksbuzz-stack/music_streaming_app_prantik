import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { usePalette, draw } from '../lib/theme';
import { money, num, pct, type Ccy } from '../lib/format';
import { Icon } from './Icon';
import { useScenarios, type Scenario } from '../store';
import type { ChargeLine } from '../lib/calc/charges';

/* ---------- Semi-circular gauge ---------- */
export function RiskGauge({ value, max, label, format = (v) => pct(v), size = 200, caption }: { value: number; max: number; label: string; format?: (v: number) => string; size?: number; caption?: string }) {
  const p = usePalette();
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const color = frac < 0.5 ? p.gain : frac < 0.85 ? p.warn : p.loss;
  const r = 80, cx = 100, cy = 95;
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const angle = Math.PI * (1 - frac);
  const nx = cx + (r - 22) * Math.cos(angle);
  const ny = cy - (r - 22) * Math.sin(angle);
  return (
    <div className="flex flex-col items-center" style={{ maxWidth: size }}>
      <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`${label}: ${format(value)} of ${format(max)}`}>
        <path d={arc} stroke={p.line} strokeWidth={16} fill="none" strokeLinecap="round" />
        <motion.path d={arc} stroke={color} strokeWidth={16} fill="none" strokeLinecap="round" {...draw(0, frac || 0.001, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })} />
        <motion.line x1={cx} y1={cy} stroke={p.ink} strokeWidth={3} strokeLinecap="round" initial={false} animate={{ x2: nx, y2: ny }} transition={{ type: 'spring', stiffness: 120, damping: 14 }} />
        <circle cx={cx} cy={cy} r={6} fill={p.ink} />
      </svg>
      <div className="-mt-1 text-center">
        <div className="text-xl font-bold tnum" style={{ color }}>{format(value)}</div>
        <div className="label">{label}</div>
        {caption && <div className="text-[11px] text-muted">{caption}</div>}
      </div>
    </div>
  );
}

/* ---------- Horizontal price map: stop → entry → targets ---------- */
export function PriceMap({ entry, stop, targets, tsl, ccy = 'INR', dp = 2, tslLabel = 'TSL' }: { entry: number; stop: number; targets: { rr: number; price: number }[]; tsl?: number; ccy?: Ccy; dp?: number; tslLabel?: string }) {
  const p = usePalette();
  const pts = [entry, stop, ...targets.map((t) => t.price), ...(tsl !== undefined && isFinite(tsl) ? [tsl] : [])].filter(isFinite);
  if (!pts.length || entry <= 0 || entry === stop) return <div className="grid h-28 place-items-center text-sm text-muted">Enter a valid entry and stop to see the map</div>;
  let lo = Math.min(...pts), hi = Math.max(...pts);
  const pad = (hi - lo) * 0.06 || 1;
  lo -= pad; hi += pad;
  const W = 600, L = 20, R = 580;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (R - L);
  const last = targets[targets.length - 1]?.price ?? entry;
  const fmt = (v: number) => (ccy === 'INR' ? '₹' : '$') + num(v, dp);
  return (
    <svg viewBox={`0 0 ${W} 118`} className="w-full" role="img" aria-label="Price map from stop loss to targets">
      <line x1={L} x2={R} y1={60} y2={60} stroke={p.line} strokeWidth={10} strokeLinecap="round" />
      <motion.rect y={55} height={10} rx={5} fill={p.loss} initial={{ width: 0, x: x(entry) }} animate={{ x: Math.min(x(stop), x(entry)), width: Math.abs(x(entry) - x(stop)) }} transition={{ duration: 0.7 }} opacity={0.85} />
      <motion.rect y={55} height={10} rx={5} fill={p.gain} initial={{ width: 0, x: x(entry) }} animate={{ x: Math.min(x(last), x(entry)), width: Math.abs(x(last) - x(entry)) }} transition={{ duration: 0.8, delay: 0.1 }} opacity={0.85} />
      {(() => {
        // greedy label placement: try above, then below; drop text that would collide
        const last = { top: -1e9, bottom: -1e9 };
        const reserved = { top: [x(stop)], bottom: [x(entry)] };
        const free = (row: 'top' | 'bottom', px: number, gap: number) => px - last[row] >= gap && reserved[row].every((r) => Math.abs(r - px) >= gap * 0.8);
        return targets.map((t, k) => {
          const px = x(t.price);
          let row: 'top' | 'bottom' | null = null;
          let showPrice = true;
          if (free('top', px, 62)) row = 'top';
          else if (free('bottom', px, 62)) row = 'bottom';
          else if (free('top', px, 30)) { row = 'top'; showPrice = false; }
          else if (free('bottom', px, 30)) { row = 'bottom'; showPrice = false; }
          if (row) last[row] = px;
          return (
            <motion.g key={t.rr} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + k * 0.07 }}>
              <title>{`${t.rr}R target ${fmt(t.price)}`}</title>
              <circle cx={px} cy={60} r={5} fill={p.surface} stroke={p.gain} strokeWidth={2.5} />
              {row && <text x={px} y={row === 'bottom' ? 98 : 40} textAnchor="middle" fontSize="11" fontWeight="700" fill={p.gain}>{t.rr}R</text>}
              {row && showPrice && <text x={px} y={row === 'bottom' ? 111 : 27} textAnchor="middle" fontSize="10" fill={p.muted}>{fmt(t.price)}</text>}
            </motion.g>
          );
        });
      })()}
      <g>
        <line x1={x(stop)} x2={x(stop)} y1={44} y2={76} stroke={p.loss} strokeWidth={3} />
        <text x={x(stop)} y={14} textAnchor="middle" fontSize="11" fontWeight="700" fill={p.loss}>SL {fmt(stop)}</text>
      </g>
      <g>
        <rect x={x(entry) - 4} y={44} width={8} height={32} rx={3} fill={p.brand} />
        <text x={x(entry)} y={92} textAnchor="middle" fontSize="11" fontWeight="700" fill={p.brand}>Entry</text>
      </g>
      {tsl !== undefined && isFinite(tsl) && (
        <motion.g initial={false} animate={{ x: 0 }}>
          <line x1={x(tsl)} x2={x(tsl)} y1={48} y2={72} stroke={p.warn} strokeWidth={2.5} strokeDasharray="4 3" />
          <text x={x(tsl)} y={Math.abs(x(tsl) - x(entry)) < 40 ? 106 : 84} textAnchor="middle" fontSize="10" fontWeight="700" fill={p.warn}>{tslLabel}</text>
        </motion.g>
      )}
    </svg>
  );
}

/* ---------- R ladder chart ---------- */
export function LadderChart({ rows, ccy = 'INR' }: { rows: { rr: number; gross: number; net?: number }[]; ccy?: Ccy }) {
  const p = usePalette();
  const data = rows.map((r) => ({ name: `${r.rr}R`, Gross: r.gross, ...(r.net !== undefined ? { Net: r.net } : {}) }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={p.line} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: p.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: p.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={64} tickFormatter={(v) => money(v, ccy, { compact: true, dp0: true })} />
          <Tooltip cursor={{ fill: p.surface2 }} contentStyle={tipStyle(p)} formatter={(v: number) => money(v, ccy)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Gross" fill={p.brand2} radius={[6, 6, 0, 0]} animationDuration={700} />
          {rows[0]?.net !== undefined && <Bar dataKey="Net" fill={p.gain} radius={[6, 6, 0, 0]} animationDuration={900} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export const tipStyle = (p: ReturnType<typeof usePalette>) => ({
  background: p.surface, border: `1px solid ${p.line}`, borderRadius: 12, fontSize: 12, color: p.ink, fontFamily: 'inherit',
});

/* ---------- Charges donut ---------- */
export function ChargesDonut({ lines, total, ccy = 'INR' }: { lines: ChargeLine[]; total: number; ccy?: Ccy }) {
  const p = usePalette();
  const data = lines.filter((l) => l.value > 0);
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[160px_1fr]">
      <div className="relative mx-auto h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data.length ? data : [{ label: 'none', value: 1 }]} dataKey="value" nameKey="label" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none" animationDuration={800}>
              {(data.length ? data : [{}]).map((_, k) => <Cell key={k} fill={data.length ? p.series[k % p.series.length] : p.line} />)}
            </Pie>
            {data.length > 0 && <Tooltip contentStyle={tipStyle(p)} formatter={(v: number) => money(v, ccy)} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[10px] font-bold uppercase text-muted">Total</div>
            <div className="text-sm font-bold tnum">{money(total, ccy)}</div>
          </div>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {lines.map((l) => {
          const k = data.indexOf(l);
          return (
            <li key={l.key} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: k >= 0 ? p.series[k % p.series.length] : p.line }} />
                {l.label}
              </span>
              <span className="tnum text-muted">{money(l.value, ccy)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Ring: share of profit eaten by costs ---------- */
export function CostRing({ share, label }: { share: number; label: string }) {
  const p = usePalette();
  const s = Math.max(0, Math.min(1, isFinite(share) ? share : 1));
  const r = 42, c = 2 * Math.PI * r;
  const color = s < 0.1 ? p.gain : s < 0.25 ? p.warn : p.loss;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
        <circle cx={50} cy={50} r={r} stroke={p.line} strokeWidth={10} fill="none" />
        <motion.circle cx={50} cy={50} r={r} stroke={color} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - s) }} transition={{ duration: 0.9 }} />
      </svg>
      <div>
        <div className="text-2xl font-bold tnum" style={{ color }}>{isFinite(share) ? pct(share, 1) : '100%+'}</div>
        <div className="text-xs text-muted">{label}</div>
      </div>
    </div>
  );
}

/* ---------- Horizontal capacity bar ---------- */
export function CapacityBar({ used, total, labels }: { used: number; total: number; labels: [string, string] }) {
  const p = usePalette();
  const f = total > 0 ? Math.min(1, used / total) : 0;
  return (
    <div>
      <div className="h-4 w-full overflow-hidden rounded-full bg-surface2">
        <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${p.brand}, ${p.brand2})` }} initial={{ width: 0 }} animate={{ width: `${f * 100}%` }} transition={{ duration: 0.8 }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{labels[0]}</span>
        <span>{labels[1]}</span>
      </div>
    </div>
  );
}

/* ---------- Save scenario ---------- */
export function SaveScenario({ build }: { build: () => Omit<Scenario, 'id' | 'createdAt'> | null }) {
  const add = useScenarios((s) => s.add);
  const [saved, setSaved] = useState(false);
  return (
    <button
      className="btn-primary"
      onClick={() => {
        const s = build();
        if (!s) return;
        add(s);
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(saved)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="inline-flex items-center gap-2">
          <Icon name={saved ? 'spark' : 'save'} className="h-4 w-4" />
          {saved ? 'Saved to dashboard' : 'Save scenario'}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function PrintButton() {
  return (
    <button className="btn-ghost" onClick={() => window.print()}>
      <Icon name="print" className="h-4 w-4" /> PDF
    </button>
  );
}
