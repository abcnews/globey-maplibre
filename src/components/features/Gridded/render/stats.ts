/**
 * Up to `maxSamples` evenly strided values, skipping no-data (NaN). The histogram only needs
 * the distribution's shape, and binning millions of cells on every render would stall the UI.
 */
export function sampleGridValues(values: Float32Array, maxSamples = 50_000): number[] {
  const stride = Math.max(1, Math.ceil(values.length / maxSamples));
  return Array.from({ length: Math.ceil(values.length / stride) }, (_, index) => values[index * stride]).filter(
    value => !Number.isNaN(value)
  );
}

/** Per-grid cache: the extent is read on every render and by the Builder's file info. */
const extentCache = new WeakMap<Float32Array, [number, number] | null>();

/**
 * [min, max] of all non-NaN values, or undefined when there are none. Cached per array.
 *
 * A plain loop on purpose: this scans every cell of the grid, and a `reduce` returning a new
 * `[min, max]` per cell allocates millions of arrays.
 */
export function gridExtent(values: Float32Array): [number, number] | undefined {
  const cached = extentCache.get(values);
  if (cached !== undefined) return cached ?? undefined;

  let min = Infinity;
  let max = -Infinity;
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (value < min) min = value;
    if (value > max) max = value;
  }

  // NaN never satisfies `<`/`>`, so no-data cells are skipped without a check.
  const extent: [number, number] | null = min <= max ? [min, max] : null;
  extentCache.set(values, extent);
  return extent ?? undefined;
}
