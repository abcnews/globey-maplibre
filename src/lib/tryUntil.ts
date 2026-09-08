/**
 * Runs `attempt` on an interval until it returns a truthy value or the timeout
 * is hit. Use it for MapLibre work that has to wait for the style / a source to
 * become ready, where a single `once('styledata')` is unreliable (it can fire
 * before the style can accept the change, or be removed before it fires).
 *
 * Returns a `cancel()` that stops further attempts.
 *
 * @example
 *   const cancel = tryUntil(() => {
 *     if (!map.isStyleLoaded()) return false;
 *     addLayers();
 *     return map.getLayer('landcover-ice-fill') != null;
 *   }, { label: 'MapVector addLayers' });
 */
export function tryUntil(
  attempt: () => boolean,
  {
    label = 'tryUntil',
    intervalMs = 150,
    timeoutMs = 20000,
    log = true
  }: { label?: string; intervalMs?: number; timeoutMs?: number; log?: boolean } = {}
): () => void {
  const startedAt = Date.now();
  let tries = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let done = false;

  const stop = () => {
    done = true;
    if (timer !== undefined) clearTimeout(timer);
  };

  const run = () => {
    if (done) return;
    tries += 1;

    let ok = false;
    try {
      ok = attempt();
    } catch (e) {
      if (log) console.warn(`[globey] ${label}: attempt ${tries} threw`, e);
    }

    if (ok) {
      if (log) console.info(`[globey] ${label}: satisfied after ${tries} tries / ${Date.now() - startedAt}ms`);
      stop();
      return;
    }

    if (Date.now() - startedAt >= timeoutMs) {
      if (log) console.info(`[globey] ${label}: gave up after ${tries} tries / ${Date.now() - startedAt}ms`);
      stop();
      return;
    }

    timer = setTimeout(run, intervalMs);
  };

  run();
  return stop;
}
