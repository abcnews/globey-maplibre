let timerCount = 0;

/**
 * Wraps work in `console.time`/`console.timeEnd` in dev only, so slow parsing or rendering shows
 * up in the console. A no-op in production builds and in tests. Labels are numbered so
 * overlapping calls (e.g. two layers loading at once) don't share one timer.
 */
export function timed<T>(label: string, work: () => T): T {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return work();

  const timerLabel = `[gridded] ${label} #${++timerCount}`;
  const end = () => console.timeEnd(timerLabel);
  console.time(timerLabel);

  let isAsync = false;
  try {
    const result = work();
    if (!(result instanceof Promise)) return result;
    isAsync = true;
    return result.finally(end) as T;
  } finally {
    if (!isAsync) end();
  }
}
