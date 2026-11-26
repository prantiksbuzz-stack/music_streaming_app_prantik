/** True when the app runs inside a frame (e.g. a hosted artifact viewer), where print and downloads are blocked. */
export const isFramed = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();

/** Plain hash names (no "#/path") so links survive hosts that only pass simple fragments. */
const RESERVED: Record<string, string> = { '/settings': 'desk-settings' };
export function pathToHash(path: string): string {
  if (path === '/' || path === '') return '';
  return RESERVED[path] ?? path.replace(/^\//, '');
}
export function hashToPath(hash: string): string {
  const h = hash.replace(/^#\/?/, '');
  if (!h) return '/';
  const back = Object.entries(RESERVED).find(([, v]) => v === h);
  return back ? back[0] : '/' + h;
}
