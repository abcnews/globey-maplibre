import {
  getSequentialContinuousPaletteInterpolator,
  getDivergentContinuousPaletteInterpolator,
  SequentialPalette,
  DivergentPalette,
  ColourMode
} from '@abcnews/palette';
import { getSequentialInterpolator, SEQUENTIAL_PALETTE_OFFSET_PCT } from '../../../../lib/sequentialPalette';
import { interpolateColour, getCustomPaletteInterpolator } from '../../../../lib/colours';
import type { GeoJsonConfig } from '../../../../lib/marker';

export { generateGeoJsonSourceId as generateId, getLabelAnchor } from '../layerUtils';


/**
 * Creates a colour interpolation function based on the builder's configuration.
 * This serves as the single source of truth for colour scaling, ensuring that
 * MapLibre expressions (used for points) and direct evaluation (used for spikes)
 * remain perfectly synchronised.
 *
 * @param config The GeoJSON configuration defined in the builder
 * @returns An interpolator function for mapping 0-1 values to CSS colours
 */
export function getPaletteInterpolator(config: GeoJsonConfig): ((t: number) => string) | null {
  const { paletteType, paletteVariant, customPalette } = config.colourConfig || {};
  if (!paletteType) return null;

  if (paletteType === 'sequential' && paletteVariant) {
    if (Object.values(SequentialPalette).includes(paletteVariant as any)) {
      return getSequentialInterpolator(paletteVariant as SequentialPalette, ColourMode.Light);
    }
  } else if (paletteType === 'divergent' && paletteVariant) {
    const variant = DivergentPalette[paletteVariant as keyof typeof DivergentPalette];
    if (variant) {
      return getDivergentContinuousPaletteInterpolator(variant, ColourMode.Light);
    }
  } else if (paletteType === 'custom' && customPalette) {
    return getCustomPaletteInterpolator(customPalette);
  }

  return null;
}

/**
 * Maps GeoJSON configuration to a MapLibre styling expression.
 * This is used for layers rendered natively by MapLibre (Fill, Line, Circle)
 * to offload style evaluation to the GPU.
 */
export function getColourExpression(config: GeoJsonConfig, context: 'fill' | 'stroke' | 'marker'): any {
  if (config.colourMode === 'override') {
    return config.colourConfig?.override || '#ff0000';
  }

  if (config.colourMode === 'simple') {
    if (context === 'stroke') {
      return ['coalesce', ['get', 'stroke'], '#555555'];
    }
    if (context === 'marker') {
      return ['coalesce', ['get', 'marker-color'], ['get', 'stroke'], ['get', 'fill'], ['get', 'fill-color'], '#7e7e7e'];
    }
    return ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#555555'];
  }

  if (config.colourMode === 'scale' && config.colourProp) {
    const min = config.colourConfig?.min ?? 0;
    const max = config.colourConfig?.max ?? 100;
    const interpolator = getPaletteInterpolator(config);

    if (interpolator) {
      const stops: any[] = [];
      const numStops = config.colourConfig?.paletteType === 'custom' ? config.colourConfig?.customPalette?.length || 5 : 5;
      for (let i = 0; i < numStops; i++) {
        const t = i / (numStops - 1);
        const val = min + t * (max - min);

        // Sample the shared interpolator to generate discrete stops for the GL layer
        stops.push(val, (interpolator as any)(t));
      }

      return ['interpolate', ['linear'], ['get', config.colourProp], ...stops];
    }

    const minColour = config.colourConfig?.minColour || '#ffffff';
    const maxColour = config.colourConfig?.maxColour || '#ff0000';

    return ['interpolate', ['linear'], ['get', config.colourProp], min, minColour, max, maxColour];
  }

  if (config.colourMode === 'class') {
    const prop = config.colourProp || 'class';
    return ['match', ['get', prop], 'primary', '#1f77b4', 'secondary', '#ff7f0e', 'tertiary', '#2ca02c', '#888888'];
  }

  return '#888888';
}

/**
 * Direct evaluation of a feature's colour based on its properties and the builder configuration.
 * Used for custom layers (like Three.js spikes) where MapLibre expressions cannot be used.
 *
 * @returns A CSS-compatible colour string
 */
/**
 * Direct evaluation of a feature's colour based on its properties and the builder configuration.
 * @returns A CSS-compatible colour string
 */
export function evaluateColour(config: GeoJsonConfig, feature: any): string {
  return getColourEvaluator(config)(feature);
}

/**
 * Creates a high-performance colour evaluator function.
 * This hoists configuration lookups and interpolator creation out of the evaluation logic,
 * making it suitable for use in high-frequency loops.
 *
 * @param config The GeoJSON configuration
 * @returns A function that takes a feature and returns a colour string
 */
export function getColourEvaluator(config: GeoJsonConfig): (feature: any) => string {
  const mode = config.colourMode;
  const prop = config.colourProp;
  const colourConfig = config.colourConfig;

  // Simple Mode
  if (mode === 'simple') {
    return (feature: any) => {
      const props = feature.properties || {};
      return props['marker-color'] || props['stroke'] || props['fill'] || props['fill-color'] || '#888888';
    };
  }

  // Override Mode
  if (mode === 'override') {
    const override = colourConfig?.override || '#ff0000';
    return () => override;
  }

  // Scale (Continuous) Mode
  if (mode === 'scale' && prop) {
    const min = colourConfig?.min ?? 0;
    const max = colourConfig?.max ?? 100;
    const range = max - min || 1;
    const interpolator = getPaletteInterpolator(config);
    const minColour = colourConfig?.minColour || '#ffffff';
    const maxColour = colourConfig?.maxColour || '#ff0000';

    return (feature: any) => {
      const val = Number(feature.properties?.[prop]);
      if (isNaN(val)) return '#888888';

      const factor = Math.max(0, Math.min(1, (val - min) / range));

      if (interpolator) {
        return interpolator(factor);
      }

      if (val <= min) return minColour;
      if (val >= max) return maxColour;
      return interpolateColour(minColour, maxColour, factor);
    };
  }

  // Classification Mode
  if (mode === 'class') {
    const classProp = prop || 'class';
    return (feature: any) => {
      const val = feature.properties?.[classProp];
      if (val === 'primary') return '#1f77b4';
      if (val === 'secondary') return '#ff7f0e';
      if (val === 'tertiary') return '#2ca02c';
      return '#888888';
    };
  }

  return () => '#888888';
}

/**
 * Normalises Point and MultiPoint geometries into a flat array of [lng, lat] pairs.
 */
export function getNormalisedPoints(geometry: any): [number, number][] {
  if (!geometry) return [];
  if (geometry.type === 'Point') {
    return [geometry.coordinates];
  }
  if (geometry.type === 'MultiPoint') {
    return geometry.coordinates;
  }
  // For other types, we could technically extract centroids, but for now we focus on points
  return [];
}

/**
 * Transforms a GeoJSON feature collection into a list of rendered points.
 * This unifies filtering and geometric flattening so that complex types like
 * MultiPoint are handled consistently across custom renderers.
 *
 * This function is optimised by hoisting configuration and evaluators
 * out of the feature loop.
 */
export function getProcessedFeatures(
  config: GeoJsonConfig,
  data: any
): { coords: [number, number]; height: number; colour: string }[] {
  if (!data || !data.features) return [];
  console.time('processFeatures');

  // Hoist evaluators and configuration
  const colourEvaluator = getColourEvaluator(config);
  const heightEvaluator = getHeightEvaluator(config);
  const filterProp = config.filter?.prop;
  const filterValues = config.filter?.values;

  const results: { coords: [number, number]; height: number; colour: string }[] = [];

  data.features.forEach((feature: any) => {
    // 1. Filter Check (hoisted logic)
    if (filterProp && filterValues) {
      const val = String(feature.properties?.[filterProp]);
      if (!filterValues.includes(val)) {
        return;
      }
    }

    // 2. Coordinate Extraction
    const points = getNormalisedPoints(feature.geometry);
    if (points.length === 0) return;

    // 3. Evaluation (using hoisted evaluators)
    const height = heightEvaluator(feature);
    const colour = colourEvaluator(feature);

    // 4. Collect results (one per point in MultiPoint)
    points.forEach(coords => {
      results.push({ coords, height, colour });
    });
  });

  console.timeEnd('processFeatures');

  return results;
}


export function getStrokeWidthExpression(config: GeoJsonConfig): any {
  if (config.colourMode === 'simple') {
    return ['coalesce', ['get', 'stroke-width'], 2];
  }
  return 2;
}

/**
 * Calculates a MapLibre radius expression.
 * Supports absolute pixel values or real-world kilometre scaling that
 * adjusts dynamically with zoom level to maintain geographic size.
 */
export function getCircleRadiusExpression(config: GeoJsonConfig): any {
  if (config.pointSize) {
    const match = config.pointSize.match(/^(\d+(?:\.\d+)?)([pk])$/);
    if (match) {
      const val = Number(match[1]);
      const unit = match[2];
      if (unit === 'p') {
        return val;
      }
      if (unit === 'k') {
        return [
          'interpolate',
          ['exponential', 2],
          ['zoom'],
          0,
          (val / 40075) * 512,
          22,
          (val / 40075) * 512 * Math.pow(2, 22)
        ];
      }
    }
  }

  if (config.colourMode === 'simple') {
    return ['match', ['get', 'marker-size'], 'small', 4, 'large', 9, ['coalesce', ['to-number', ['get', 'marker-size']], 6]];
  }
  return 6;
}

export function getCircleOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);
  if (config.colourMode === 'simple') {
    return ['*', baseOpacity, ['coalesce', ['get', 'opacity'], ['get', 'fill-opacity'], ['get', 'stroke-opacity'], 1.0]];
  }
  return baseOpacity;
}

export function getFillOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);
  if (config.colourMode === 'simple') {
    return ['*', baseOpacity, ['coalesce', ['get', 'fill-opacity'], 0.5]];
  }
  return baseOpacity === 1 ? 0.5 : baseOpacity;
}

export function getStrokeOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);
  if (config.colourMode === 'simple') {
    return ['*', baseOpacity, ['coalesce', ['get', 'stroke-opacity'], 1.0]];
  }
  return baseOpacity;
}

/**
 * Generates a MapLibre expression for opacity.
 * Primarily handles hiding features that are excluded by the builder's filters.
 */
export function getOpacityExpression(config: GeoJsonConfig): any {
  if (config.filter?.prop && config.filter.values) {
    return ['case', ['in', ['to-string', ['get', config.filter.prop]], ['literal', config.filter.values]], 1, 0];
  }
  return 1;
}

/**
 * Direct evaluation of a feature's opacity.
 * Combines builder filters with feature-specific simple properties.
 */
export function evaluateOpacity(config: GeoJsonConfig, feature: any): number {
  const props = feature.properties || {};
  let opacity = 1;

  if (config.filter?.prop && config.filter.values) {
    const val = String(props[config.filter.prop]);
    if (!config.filter.values.includes(val)) {
      opacity = 0;
    }
  }

  if (opacity > 0 && config.colourMode === 'simple') {
    const simpleOpacity = props['stroke-opacity'] ?? props['fill-opacity'] ?? props['opacity'] ?? 1;
    opacity *= Number(simpleOpacity);
  }

  return opacity;
}

/**
 * Extracts the Maki icon ID or numeric symbol for a feature.
 */
export function evaluateSymbol(config: GeoJsonConfig, feature: any): string {
  if (config.colourMode !== 'simple') return '';
  const symbol = feature.properties?.['marker-symbol'];
  if (!symbol) return '';
  return String(symbol);
}

const MIN_HEIGHT_JANK_FACTOR = 3000;

/**
 * Maps a numeric feature property to a 3D spike height.
 * Factors in the configured scalar and min/max bounds from the builder.
 *
 * @returns Height in metres
 */
export function evaluateHeight(config: GeoJsonConfig, feature: any): number {
  return getHeightEvaluator(config)(feature);
}

/**
 * Creates a high-performance height evaluator function.
 * This hoists configuration lookups out of the evaluation logic.
 *
 * @param config The GeoJSON configuration
 * @returns A function that takes a feature and returns a height in metres
 */
export function getHeightEvaluator(config: GeoJsonConfig): (feature: any) => number {
  const spikeConfig = config.spike;
  if (!spikeConfig?.heightProp) return () => 0;

  const prop = spikeConfig.heightProp;
  const min = spikeConfig.min ?? 0;
  const max = spikeConfig.max ?? 100;
  const scalar = spikeConfig.scalar ?? 2000000;
  const range = max - min || 1;

  return (feature: any) => {
    const val = Number(feature.properties?.[prop]);
    if (isNaN(val)) return 0;

    const factor = Math.max(0, Math.min(1, (val - min) / range));
    return Math.max(MIN_HEIGHT_JANK_FACTOR, factor * scalar);
  };
}

// getLabelAnchor removed, now imported from layerUtils
