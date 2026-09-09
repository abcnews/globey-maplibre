/**
 * Console logging for the animation-clock plumbing, off in production.
 *
 * Enabled automatically on the dev server, or anywhere by putting `globeydebug`
 * in the query string (`?globeydebug`) — the hash is taken by the marker
 * options, so it can't live there.
 */
const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (window.location.search.includes('globeydebug')) return true;
  return Boolean(import.meta.env?.DEV);
};

const enabled = isDebugEnabled();

/** `debugLog('CustomGlobe', 'wrote clocks', { … })` — a no-op unless enabled. */
export const debugLog = (scope: string, ...args: unknown[]): void => {
  if (!enabled) return;
  console.log(`%c[${scope}]`, 'color:#7aa2f7;font-weight:bold', ...args);
};

/**
 * Logs only when `key`'s summary changes, for things written every frame. Each
 * call site needs its own `key`.
 */
const lastSeen = new Map<string, string>();
export const debugLogOnChange = (scope: string, key: string, summary: string, ...args: unknown[]): void => {
  if (!enabled) return;
  if (lastSeen.get(key) === summary) return;
  lastSeen.set(key, summary);
  debugLog(scope, summary, ...args);
};
