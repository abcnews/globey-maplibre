/**
 * Tracing for the tween -> layer pipeline.
 *
 * We are chasing a bug where GeoJSON and vector base layers flash / get
 * removed-and-re-added while scrolling in scroll-tied mode. These probes show
 * which layers churn, how often, and from where.
 *
 * Turn it on in the browser console then reload:
 *
 *   localStorage.tweenDebug = '1'   // events only
 *   localStorage.tweenDebug = '2'   // events + a short stack on layer add/remove
 *
 * Filter the console by "[tweendbg]". Set it back to '' to silence.
 */

/** Force-on without touching localStorage. Leave false for committed code. */
const FORCED_LEVEL = 0;

/** 0 = off, 1 = events, 2 = events + stacks. */
export function tweenDebugLevel(): number {
  if (FORCED_LEVEL) return FORCED_LEVEL;
  try {
    return Number(globalThis.localStorage?.getItem('tweenDebug')) || 0;
  } catch {
    return 0;
  }
}

/**
 * Always-on load-path log. Prefixed `[globey]` so it is easy to filter and to
 * find-and-remove later. Use this while chasing "nothing renders in production"
 * where the gated `tdbg` above would hide the one line you need.
 */
export function glog(scope: string, msg: string, data?: unknown): void {
  const head = `[globey] ${scope}: ${msg}`;
  if (data === undefined) console.info(head);
  else console.info(head, data);
}

const counts: Record<string, number> = {};

/** Log an event with a running per-label count and an optional payload. */
export function tdbg(label: string, data?: unknown): void {
  if (!tweenDebugLevel()) return;
  counts[label] = (counts[label] ?? 0) + 1;
  const head = `[tweendbg] ${label} ×${counts[label]}`;
  if (data === undefined) console.log(head);
  else console.log(head, data);
}

/** Like `tdbg`, but also prints a trimmed stack when level >= 2. */
export function tdbgTrace(label: string, data?: unknown): void {
  const level = tweenDebugLevel();
  if (!level) return;
  tdbg(label, data);
  if (level < 2) return;
  const stack = (new Error().stack ?? '').split('\n').slice(2, 7).join('\n');
  console.log(`[tweendbg]   ${label} <-\n${stack}`);
}

const refIds = new WeakMap<object, number>();
let nextRefId = 1;

/**
 * Stable short id for an object reference. The id stays the same for the life of
 * the reference, so a changing id in the log means a new object was created
 * (which is usually what drives an `$effect` to re-run and tear layers down).
 */
export function refId(value: unknown): string {
  if (value === null || typeof value !== 'object') return String(value);
  let id = refIds.get(value as object);
  if (id === undefined) {
    id = nextRefId++;
    refIds.set(value as object, id);
  }
  return `ref#${id}`;
}
