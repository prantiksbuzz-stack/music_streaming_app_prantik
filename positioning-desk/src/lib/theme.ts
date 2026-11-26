import { useSettings } from '../store';

export interface Palette {
  brand: string; brand2: string; gain: string; loss: string; warn: string;
  ink: string; muted: string; line: string; surface: string; surface2: string;
  series: string[];
}

const LIGHT: Palette = {
  brand: '#4f46e5', brand2: '#0891b2', gain: '#048c62', loss: '#dc2626', warn: '#ca6e04',
  ink: '#0f172a', muted: '#606b82', line: '#e0e5f0', surface: '#ffffff', surface2: '#eff2fa',
  series: ['#4f46e5', '#0891b2', '#d97706', '#db2777', '#059669', '#7c3aed', '#64748b'],
};
const DARK: Palette = {
  brand: '#8c96ff', brand2: '#38bdf8', gain: '#34d399', loss: '#f87171', warn: '#fbbf24',
  ink: '#e5e9f5', muted: '#8e98b2', line: '#262f4c', surface: '#0f1426', surface2: '#161d34',
  series: ['#8c96ff', '#38bdf8', '#fbbf24', '#f472b6', '#34d399', '#c084fc', '#94a3b8'],
};

export const usePalette = (): Palette => (useSettings((s) => s.theme) === 'dark' ? DARK : LIGHT);

/** framer-motion's SVG typings reject pathLength in some versions; this keeps the runtime behaviour typed loosely. */
export const draw = (from: number, to: number, transition?: Record<string, unknown>): object => ({
  initial: { pathLength: from },
  animate: { pathLength: to },
  transition,
});
