import type { DecodedGrid } from './types.ts';

/** Longitude span treated as "wraps the whole globe" — allows a missing half-cell. */
const FULL_GLOBE_SPAN = 359;

/** Moves the first `shift` columns of every row to the end. */
function rollColumns(values: Float32Array, width: number, height: number, shift: number): Float32Array {
  const rolled = new Float32Array(values.length);
  Array.from({ length: height }).forEach((_, row) => {
    const start = row * width;
    rolled.set(values.subarray(start + shift, start + width), start);
    rolled.set(values.subarray(start, start + shift), start + width - shift);
  });
  return rolled;
}

/**
 * Brings longitudes within −180…180, which the renderer expects.
 *
 * Some data (e.g. climate reanalysis) uses 0…360. A global grid is rolled so the antimeridian is
 * at the edge (otherwise half of it sits past 180°, where an image source wraps it awkwardly);
 * a regional grid entirely east of 180° is just shifted by −360°.
 */
export function normaliseGrid(grid: DecodedGrid): DecodedGrid {
  const { width, height, values } = grid;
  const [west, south, east, north] = grid.bounds;
  const span = east - west;
  const cellWidth = span / width;

  // Global grid starting at/after 0° with columns past 180°: roll so it spans −180…180.
  if (span >= FULL_GLOBE_SPAN && east > 180 + cellWidth / 2) {
    const shift = Math.round((180 - west) / cellWidth);
    const newWest = west + shift * cellWidth - 360;
    return {
      ...grid,
      values: rollColumns(values, width, height, shift),
      bounds: [newWest, south, newWest + span, north]
    };
  }

  // Regional grid entirely in the 180…360 range.
  if (west >= 180) return { ...grid, bounds: [west - 360, south, east - 360, north] };

  return grid;
}
