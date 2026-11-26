import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState, lazy, Suspense } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Icon } from './components/Icon';
import { Segmented } from './components/ui';
import { NAV } from './nav';
import { useSettings } from './store';
import Dashboard from './pages/Dashboard';

const IndexOptions = lazy(() => import('./pages/Options').then((m) => ({ default: m.IndexOptionsPage })));
const StockOptions = lazy(() => import('./pages/Options').then((m) => ({ default: m.StockOptionsPage })));
const Equity = lazy(() => import('./pages/Equity'));
const Intraday = lazy(() => import('./pages/Intraday'));
const Crypto = lazy(() => import('./pages/Crypto'));
const Gold = lazy(() => import('./pages/Gold'));
const Renko = lazy(() => import('./pages/Renko'));
const RiskLab = lazy(() => import('./pages/RiskLab'));
const Journal = lazy(() => import('./pages/Journal'));
const Settings = lazy(() => import('./pages/Settings'));

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  let lastGroup = '';
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => {
        const header = n.group !== lastGroup ? n.group : null;
        lastGroup = n.group;
        return (
          <div key={n.to}>
            {header && <div className="label mb-1 mt-4 px-3 first:mt-1">{header}</div>}
            <NavLink
              to={n.to}
              end={n.to === '/'}
              onClick={onNavigate}
              className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${isActive ? 'text-brand' : 'text-muted hover:bg-surface2 hover:text-ink'}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-brand/10" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <Icon name={n.icon} className="relative h-[18px] w-[18px]" />
                  <span className="relative">{n.label}</span>
                </>
              )}
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <motion.div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand2 text-white shadow-lg" whileHover={{ rotate: 8, scale: 1.05 }}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l5-6 4 3 7-9" /></svg>
      </motion.div>
      <div className={`leading-tight ${compact ? 'hidden sm:block' : ''}`}>
        <div className="text-[15px] font-bold">Positioning Desk</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted">India · Global</div>
      </div>
    </div>
  );
}

export default function App() {
  const { theme, setTheme, mode, setMode, usdinr, set } = useSettings();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-line bg-surface/80 backdrop-blur lg:block">
        <div className="border-b border-line p-4"><Brand /></div>
        <Sidebar />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-line bg-surface lg:hidden" initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
              <div className="flex items-center justify-between border-b border-line p-4"><Brand /><button aria-label="Close menu" onClick={() => setOpen(false)}><Icon name="close" /></button></div>
              <Sidebar onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5 sm:gap-3 lg:px-8">
            <button className="btn-ghost px-2.5 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
            <div className="lg:hidden"><Brand compact /></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <label className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs sm:flex" title="Used to convert USD instruments to INR">
                <span className="font-bold text-muted">USDINR</span>
                <input aria-label="USD to INR rate" type="number" step="0.01" className="w-16 bg-transparent font-bold outline-none tnum" value={usdinr} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) set({ usdinr: v }); }} />
              </label>
              <Segmented size="sm" layoutKey="mode" value={mode} onChange={setMode} options={[{ value: 'guided', label: 'Guided' }, { value: 'pro', label: 'Pro' }]} />
              <motion.button whileTap={{ rotate: 90, scale: 0.9 }} className="btn-ghost px-2.5" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
              </motion.button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
              <Suspense fallback={<div className="grid h-64 place-items-center text-muted">Loading…</div>}>
                <Routes location={location}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/index-options" element={<IndexOptions />} />
                  <Route path="/stock-options" element={<StockOptions />} />
                  <Route path="/equity" element={<Equity />} />
                  <Route path="/intraday" element={<Intraday />} />
                  <Route path="/crypto" element={<Crypto />} />
                  <Route path="/gold" element={<Gold />} />
                  <Route path="/renko" element={<Renko />} />
                  <Route path="/risk-lab" element={<RiskLab />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
      </div>
    </div>
  );
}

function Footer() {
  const guided = useSettings((s) => s.mode === 'guided');
  return (
    <footer className={`mt-10 border-t border-line pt-4 text-muted ${guided ? 'text-xs' : 'text-[11px]'}`}>
      <p>
        <b>Disclaimer:</b> Positioning Desk is an educational risk-management calculator. It is not investment advice and not a SEBI-registered research or advisory service.
        Trading in derivatives, leveraged crypto and CFDs carries substantial risk. SEBI studies have found that most individual F&amp;O traders lose money.
        Charge rates, lot sizes and tax rules are editable defaults: verify them with your broker's contract note and the exchange circulars.
      </p>
      <p className="mt-2">Font: Trebuchet MS · All data is entered by you and stays in this browser.</p>
    </footer>
  );
}
