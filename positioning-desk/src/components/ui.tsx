import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { useSettings } from '../store';

/* ---------- Card ---------- */
export function Card({ children, className = '', delay = 0, title, action, subtitle }: { children: ReactNode; className?: string; delay?: number; title?: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`card p-4 sm:p-5 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[15px] font-bold leading-tight">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

/* ---------- AnimatedNumber ---------- */
export function AnimatedNumber({ value, format, className = '' }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(isFinite(value) ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  const [out, setOut] = useState(() => format(value));
  useEffect(() => text.on('change', (v) => setOut(v)), [text]);
  useEffect(() => {
    if (!isFinite(value)) { setOut(format(value)); return; }
    const c = animate(mv, value, { duration: 0.6, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span className={`tnum ${className}`}>{out}</span>;
}

/* ---------- Tooltip ---------- */
export function InfoTip({ text, analogy }: { text: string; analogy?: string }) {
  const [open, setOpen] = useState(false);
  const guided = useSettings((s) => s.mode === 'guided');
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" aria-label="More info" onClick={() => setOpen((o) => !o)} className="text-muted hover:text-brand">
        <Icon name="info" className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-5 z-50 w-60 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-left text-xs normal-case tracking-normal text-ink shadow-xl"
          >
            <span className="block font-normal">{text}</span>
            {analogy && guided && (
              <span className="mt-2 block rounded-lg bg-brand/10 p-2 font-normal text-brand">💡 {analogy}</span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ---------- Number input with optional slider ---------- */
export function NumberField({
  label, value, onChange, step = 1, min, max, prefix, suffix, slider, tip, analogy, percent, hint, disabled,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
  prefix?: string; suffix?: string; slider?: boolean; tip?: string; analogy?: string;
  /** value stored as fraction, displayed as % */
  percent?: boolean; hint?: string; disabled?: boolean;
}) {
  const id = useId();
  const shown = percent ? round(value * 100, 6) : value;
  const [draft, setDraft] = useState<string>(String(shown));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(shown)); }, [shown]);
  const commit = (s: string) => {
    const n = parseFloat(s);
    if (!isNaN(n)) onChange(percent ? n / 100 : n);
  };
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={id} className="label">{label}</label>
        {tip && <InfoTip text={tip} analogy={analogy} />}
      </div>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          disabled={disabled}
          className={`field ${prefix ? 'pl-7' : ''} ${suffix || percent ? 'pr-9' : ''}`}
          value={draft}
          step={percent ? step * 100 : step}
          min={min !== undefined ? (percent ? min * 100 : min) : undefined}
          max={max !== undefined ? (percent ? max * 100 : max) : undefined}
          onFocus={() => (focused.current = true)}
          onBlur={() => { focused.current = false; setDraft(String(shown)); }}
          onChange={(e) => { setDraft(e.target.value); commit(e.target.value); }}
        />
        {(suffix || percent) && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{percent ? '%' : suffix}</span>}
      </div>
      {slider && min !== undefined && max !== undefined && (
        <input
          aria-label={`${label} slider`}
          type="range"
          className="mt-2 w-full"
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
      )}
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

export function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="label mb-1 block">{label}</label>
      <input id={id} className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------- Segmented control ---------- */
export function Segmented<T extends string>({ options, value, onChange, size = 'md', layoutKey }: { options: { value: T; label: ReactNode; tone?: 'gain' | 'loss' }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md'; layoutKey?: string }) {
  const lid = useId();
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface2/70 p-1" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        const tone = o.tone === 'gain' ? 'bg-gain' : o.tone === 'loss' ? 'bg-loss' : 'bg-brand';
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative rounded-lg font-bold transition-colors ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} ${active ? 'text-white dark:text-[#0b0f1f]' : 'text-muted hover:text-ink'}`}
          >
            {active && <motion.span layoutId={`seg-${layoutKey ?? lid}`} className={`absolute inset-0 rounded-lg ${tone}`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Stat tile ---------- */
export function Stat({ label, value, format, tone, sub, tip, analogy, big, delay = 0 }: {
  label: string; value: number; format: (n: number) => string; tone?: 'gain' | 'loss' | 'warn' | 'brand' | 'auto'; sub?: ReactNode; tip?: string; analogy?: string; big?: boolean; delay?: number;
}) {
  const t = tone === 'auto' ? (value > 0 ? 'gain' : value < 0 ? 'loss' : undefined) : tone;
  const color = t === 'gain' ? 'text-gain' : t === 'loss' ? 'text-loss' : t === 'warn' ? 'text-warn' : t === 'brand' ? 'text-brand' : 'text-ink';
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-xl border border-line bg-surface2/50 p-3"
    >
      <div className="flex items-center gap-1.5">
        <span className="label">{label}</span>
        {tip && <InfoTip text={tip} analogy={analogy} />}
      </div>
      <div className={`mt-1 font-bold ${big ? 'text-2xl' : 'text-lg'} ${color}`}>
        <AnimatedNumber value={value} format={format} />
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </motion.div>
  );
}

/* ---------- Warnings ---------- */
export function Warnings({ items }: { items: string[] }) {
  return (
    <AnimatePresence initial={false}>
      {items.map((w) => (
        <motion.div
          key={w}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mb-2 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{w}</span>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, icon, actions, accent = 'from-brand to-brand2' }: { title: string; subtitle: string; icon: string; actions?: ReactNode; accent?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}
        >
          <Icon name={icon} className="h-6 w-6" />
        </motion.div>
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 no-print">{actions}</div>}
    </div>
  );
}

/* ---------- Guided-mode step strip ---------- */
export function Guide({ steps }: { steps: string[] }) {
  const guided = useSettings((s) => s.mode === 'guided');
  return (
    <AnimatePresence initial={false}>
      {guided && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <ol className="mb-5 grid gap-2 sm:grid-cols-3">
            {steps.map((s, k) => (
              <motion.li
                key={k}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * k }}
                className="flex gap-3 rounded-xl border border-brand/25 bg-brand/5 p-3 text-sm"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-white dark:text-[#0b0f1f]">{k + 1}</span>
                <span>{s}</span>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 35 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? 'right-0.5' : 'left-0.5'}`} />
      </button>
      <span className="text-muted">{label}</span>
    </label>
  );
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'gain' | 'loss' | 'warn' | 'brand' | 'muted' }) {
  const c = { gain: 'bg-gain/15 text-gain', loss: 'bg-loss/15 text-loss', warn: 'bg-warn/15 text-warn', brand: 'bg-brand/15 text-brand', muted: 'bg-surface2 text-muted' }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${c}`}>{children}</span>;
}

/** Two-step button: first click arms it, second click within 3s runs the action (no browser confirm dialogs). */
export function ConfirmButton({ label, confirmLabel = 'Click again to confirm', onConfirm, className = 'btn-ghost' }: { label: ReactNode; confirmLabel?: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);
  return (
    <button className={`${className} ${armed ? '!border-loss !text-loss' : ''}`} onClick={() => { if (armed) { setArmed(false); onConfirm(); } else setArmed(true); }}>
      {armed ? confirmLabel : label}
    </button>
  );
}
