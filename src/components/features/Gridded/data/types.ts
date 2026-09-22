/** A decoded 2D grid, north-up, with longitudes within −180…180. */
export interface DecodedGrid {
  width: number;
  height: number;
  /** Row-major values, row 0 = north. NaN = no data. */
  values: Float32Array;
  /** Outer cell edges, in degrees: [west, south, east, north] */
  bounds: [number, number, number, number];
  /** How rows are spaced: evenly in latitude (4326) or in Web Mercator metres (3857) */
  crs: 4326 | 3857;
  /** Bands in the file, so the Builder can offer a picker */
  bandCount: number;
}
