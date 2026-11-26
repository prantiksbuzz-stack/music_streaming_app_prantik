import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEFAULT_RATES, type ChargeRates } from '../config/charges';
import { DEFAULT_USDINR, INDEX_SPECS } from '../config/instruments';
import type { AssetClass, Trade } from '../lib/calc/journal';
import type { RenkoMarket } from '../lib/calc/renko';
import { uid } from '../lib/format';

const storage = createJSONStorage(() => {
  try {
    const k = '__pd_probe';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export type Mode = 'pro' | 'guided';
export type Theme = 'light' | 'dark';

interface SettingsState {
  theme: Theme;
  mode: Mode;
  usdinr: number;
  maxHeatPct: number;
  capitalINR: number;
  capitalUSD: number;
  lotSizes: Record<string, number>;
  rates: ChargeRates;
  setTheme: (t: Theme) => void;
  setMode: (m: Mode) => void;
  set: (p: Partial<Omit<SettingsState, 'set' | 'setTheme' | 'setMode' | 'reset'>>) => void;
  reset: () => void;
}

const initialTheme = (): Theme => {
  try {
    const t = localStorage.getItem('pd-theme');
    if (t === 'dark' || t === 'light') return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

const settingDefaults = {
  mode: 'guided' as Mode,
  usdinr: DEFAULT_USDINR,
  maxHeatPct: 0.06,
  capitalINR: 100000,
  capitalUSD: 1000,
  lotSizes: Object.fromEntries(INDEX_SPECS.map((s) => [s.key, s.lotSize])),
  rates: DEFAULT_RATES,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: initialTheme(),
      ...settingDefaults,
      setTheme: (theme) => {
        try { localStorage.setItem('pd-theme', theme); } catch { /* ignore */ }
        set({ theme });
      },
      setMode: (mode) => set({ mode }),
      set: (p) => set(p),
      reset: () => set({ ...settingDefaults }),
    }),
    { name: 'pd-settings', storage, version: 1 },
  ),
);

export interface Scenario {
  id: string;
  name: string;
  page: string;
  assetClass: AssetClass;
  side: 'long' | 'short';
  /** ₹ at risk (converted for USD instruments) */
  riskINR: number;
  /** ₹ notional / capital deployed */
  exposureINR: number;
  rewardINR: number;
  rr: number;
  createdAt: number;
  summary: { label: string; value: string }[];
}

interface ScenarioState {
  scenarios: Scenario[];
  compare: string[];
  add: (s: Omit<Scenario, 'id' | 'createdAt'>) => void;
  remove: (id: string) => void;
  toggleCompare: (id: string) => void;
  clear: () => void;
}

export const useScenarios = create<ScenarioState>()(
  persist(
    (set) => ({
      scenarios: [],
      compare: [],
      add: (s) => set((st) => ({ scenarios: [{ ...s, id: uid(), createdAt: Date.now() }, ...st.scenarios].slice(0, 60) })),
      remove: (id) => set((st) => ({ scenarios: st.scenarios.filter((x) => x.id !== id), compare: st.compare.filter((x) => x !== id) })),
      toggleCompare: (id) =>
        set((st) => ({
          compare: st.compare.includes(id) ? st.compare.filter((x) => x !== id) : [...st.compare, id].slice(-3),
        })),
      clear: () => set({ scenarios: [], compare: [] }),
    }),
    { name: 'pd-scenarios', storage, version: 1 },
  ),
);

interface JournalState {
  trades: Trade[];
  add: (t: Omit<Trade, 'id'>) => void;
  remove: (id: string) => void;
  replace: (t: Trade[]) => void;
}

export const useJournal = create<JournalState>()(
  persist(
    (set) => ({
      trades: [],
      add: (t) => set((st) => ({ trades: [{ ...t, id: uid() }, ...st.trades] })),
      remove: (id) => set((st) => ({ trades: st.trades.filter((x) => x.id !== id) })),
      replace: (trades) => set({ trades }),
    }),
    { name: 'pd-journal', storage, version: 1 },
  ),
);

export interface RenkoRow {
  id: string;
  name: string;
  market: RenkoMarket;
  base: number;
  price?: number;
}

/** Seeded from Sheet3 of the workbook */
const SHEET3: [string, number][] = [
  ['AMAGI MEDIA', 35], ['OLA ELECTRIC', 2.5], ['AVANTI FEEDS', 30], ['CITY UNION BANK', 9.5], ['CAPRI GLOBAL', 10],
  ['BAJAJ HINDUSTAN', 0.55], ['YES BANK', 0.75], ['IDEA', 0.4], ['J&K BANK', 10], ['BLUEJET', 30], ['GRANULES', 30],
  ['AKUMS DRUGS', 30], ['LODHA DEV', 50], ['NAUKRI', 50], ['PAYTM', 50], ['GOLDIAM', 25], ['SHIPPING CORP', 10],
  ['ATHER ENERGY', 50], ['JP POWER', 0.5], ['EXIDE', 15], ['TIME TECHNO', 6], ['APTUS VALUE', 10], ['NIFTY 50', 85.75],
  ['JUPITER WAGON', 10],
];
export const RENKO_SEED: RenkoRow[] = [
  ...SHEET3.map(([name, base], k) => ({ id: `s${k}`, name, market: 'stock' as const, base })),
  { id: 'c0', name: 'BTC', market: 'crypto', base: 2500 },
  { id: 'c1', name: 'ETH', market: 'crypto', base: 120 },
];

interface RenkoState {
  rows: RenkoRow[];
  upsert: (r: RenkoRow) => void;
  remove: (id: string) => void;
  replace: (rows: RenkoRow[]) => void;
  reset: () => void;
}

export const useRenko = create<RenkoState>()(
  persist(
    (set) => ({
      rows: RENKO_SEED,
      upsert: (r) => set((st) => ({ rows: st.rows.some((x) => x.id === r.id) ? st.rows.map((x) => (x.id === r.id ? r : x)) : [...st.rows, r] })),
      remove: (id) => set((st) => ({ rows: st.rows.filter((x) => x.id !== id) })),
      replace: (rows) => set({ rows }),
      reset: () => set({ rows: RENKO_SEED }),
    }),
    { name: 'pd-renko', storage, version: 1 },
  ),
);
