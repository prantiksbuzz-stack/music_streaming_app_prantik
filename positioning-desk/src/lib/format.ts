export type Ccy = 'INR' | 'USD';

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const inr0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function money(n: number, ccy: Ccy = 'INR', opts: { compact?: boolean; sign?: boolean; dp0?: boolean } = {}): string {
  if (!isFinite(n)) return n > 0 ? 'Unlimited' : n < 0 ? '−Unlimited' : '—';
  const sym = ccy === 'INR' ? '₹' : '$';
  const neg = n < 0;
  const a = Math.abs(n);
  let body: string;
  if (opts.compact && ccy === 'INR' && a >= 1e7) body = (a / 1e7).toFixed(2) + ' Cr';
  else if (opts.compact && ccy === 'INR' && a >= 1e5) body = (a / 1e5).toFixed(2) + ' L';
  else if (opts.compact && ccy === 'USD' && a >= 1e6) body = (a / 1e6).toFixed(2) + 'M';
  else body = ccy === 'INR' ? (opts.dp0 ? inr0 : inr).format(a) : usd.format(a);
  const isZero = /^[0.,\s]*$/.test(body.replace(/[A-Za-z]/g, ''));
  const sign = neg && !isZero ? '−' : opts.sign && n > 0 && !isZero ? '+' : '';
  return `${sign}${sym}${body}`;
}

export function num(n: number, dp = 2): string {
  if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: dp, minimumFractionDigits: 0 }).format(n);
}

export function pct(n: number, dp = 2, sign = false): string {
  if (!isFinite(n)) return '—';
  const s = sign && n > 0 ? '+' : '';
  return `${s}${(n * 100).toFixed(dp)}%`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Downloads a CSV; inside a sandboxed frame (where downloads are blocked) copies it to the clipboard instead. */
export async function downloadCSV(filename: string, rows: (string | number)[][]): Promise<'downloaded' | 'copied' | 'failed'> {
  const csv = rows.map((r) => r.map((c) => {
    const s = String(c ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  let framed = true;
  try { framed = window.self !== window.top; } catch { /* cross-origin parent */ }
  if (framed) {
    try { await navigator.clipboard.writeText(csv); return 'copied'; } catch { return 'failed'; }
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
