/** Significant figures kept when rounding data values for display and default ranges. */
const SIGNIFICANT_FIGURES = 3;

/**
 * Rounds to 3 significant figures. `floor`/`ceil` round outwards so a default min/max range
 * never cuts off the data's own extremes.
 */
export function niceNumber(value: number, mode: 'round' | 'floor' | 'ceil' = 'round'): number {
  if (!Number.isFinite(value) || value === 0) return value;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))) - SIGNIFICANT_FIGURES + 1);
  return Number((Math[mode](value / magnitude) * magnitude).toPrecision(12));
}

/** e.g. `-33.9, 'lat'` → `33.9°S` */
export function formatDegrees(value: number, axis: 'lat' | 'lng'): string {
  const [positive, negative] = axis === 'lat' ? ['N', 'S'] : ['E', 'W'];
  return `${niceNumber(Math.abs(value))}°${value < 0 ? negative : positive}`;
}
