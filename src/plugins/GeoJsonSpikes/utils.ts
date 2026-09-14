import { interpolateColour } from '../../lib/colours.ts';
import type { GeoJsonSpikesConfig } from './types.ts';

const MIN_HEIGHT_JANK_FACTOR = 3000;
const DEFAULT_COLOUR = '#888888';

/**
 * Creates a height evaluator: a numeric value (from `heightProp`) -> spike height in metres.
 */
export function getHeightEvaluator(config: GeoJsonSpikesConfig): (value: number) => number {
  if (!config.heightProp) return () => 0;

  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const scalar = config.scalar ?? 2000000;
  const range = max - min || 1;

  return value => {
    const factor = Math.max(0, Math.min(1, (value - min) / range));
    return Math.max(MIN_HEIGHT_JANK_FACTOR, factor * scalar);
  };
}

/**
 * Creates a colour evaluator: a GeoJSON feature -> CSS colour string.
 * Falls back to each feature's simplestyle-spec `fill` property when `colourProp` isn't set.
 */
export function getColourEvaluator(config: GeoJsonSpikesConfig): (feature: GeoJSON.Feature) => string {
  const { colourProp, colours = [DEFAULT_COLOUR, DEFAULT_COLOUR], min = 0, max = 100 } = config;

  if (!colourProp) {
    return feature => (feature.properties?.fill as string) || DEFAULT_COLOUR;
  }

  const range = max - min || 1;
  return feature => {
    const raw = Number(feature.properties?.[colourProp]);
    if (isNaN(raw)) return DEFAULT_COLOUR;
    const factor = Math.max(0, Math.min(1, (raw - min) / range));
    return interpolateColour(colours[0], colours[1], factor);
  };
}
