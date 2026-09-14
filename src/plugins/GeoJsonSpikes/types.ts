/** Self-contained config for the GeoJsonSpikes example plugin (no dependency on the Builder's marker schema). */
export interface GeoJsonSpikesConfig {
  /** The dataset to render as 3D spikes. */
  data: GeoJSON.FeatureCollection;
  /** Numeric feature property driving spike height. Omit for flat (zero-height) spikes. */
  heightProp?: string;
  /** Numeric feature property driving spike colour via `colours`. Omit to use each feature's `fill` property (simplestyle-spec) instead. */
  colourProp?: string;
  /** Colour ramp endpoints for `colourProp`, from `min` to `max`. */
  colours?: [string, string];
  /** Maximum spike height in metres. Default 2,000,000 (2000km). */
  scalar?: number;
  /** Lower bound of `heightProp`/`colourProp`'s value range. Default 0. */
  min?: number;
  /** Upper bound of `heightProp`/`colourProp`'s value range. Default 100. */
  max?: number;
  /** Spike base diameter, in kilometres (`k`) or screen pixels at the equator (`p`). Default 15,000m. */
  pointSize?: { value: number; unit: 'k' | 'p' };
}
