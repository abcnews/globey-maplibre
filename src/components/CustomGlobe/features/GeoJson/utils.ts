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
 * Creates a high-performance colour evaluator function.
 * This hoists configuration lookups and interpolator creation out of the evaluation logic.
 */
export function getColourEvaluator(config: GeoJsonConfig): (feature: { cVal: any }) => string {
  const mode = config.colourMode;
  const colourConfig = config.colourConfig;

  // Simple Mode
  if (mode === 'simple') {
    return (feature) => feature.cVal || '#888888';
  }

  // Override Mode
  if (mode === 'override') {
    const override = colourConfig?.override || '#ff0000';
    return () => override;
  }

  // Scale (Continuous) Mode
  if (mode === 'scale') {
    const min = colourConfig?.min ?? 0;
    const max = colourConfig?.max ?? 100;
    const range = max - min || 1;
    const interpolator = getPaletteInterpolator(config);
    const minColour = colourConfig?.minColour || '#ffffff';
    const maxColour = colourConfig?.maxColour || '#ff0000';

    return (feature) => {
      const val = Number(feature.cVal);
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
    return (feature) => {
      const val = feature.cVal;
      if (val === 'primary') return '#1f77b4';
      if (val === 'secondary') return '#ff7f0e';
      if (val === 'tertiary') return '#2ca02c';
      return '#888888';
    };
  }

  return () => '#888888';
}


/**
 * Transforms a list of pre-processed features into a list of rendered points.
 * This is the final step in the spike rendering pipeline.
 */
export function getProcessedFeatures(
  config: GeoJsonConfig,
  features: { coords: [number, number]; hVal: number; cVal: any }[]
): { coords: [number, number]; height: number; colour: string }[] {
  if (!features) return [];

  // Hoist evaluators and configuration
  const colourEvaluator = getColourEvaluator(config);
  const heightEvaluator = getHeightEvaluator(config);

  return features.map(feature => ({
    coords: feature.coords,
    height: heightEvaluator(feature),
    colour: colourEvaluator(feature)
  }));
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


const MIN_HEIGHT_JANK_FACTOR = 3000;


/**
 * Creates a high-performance height evaluator function.
 * This hoists configuration lookups out of the evaluation logic.
 */
export function getHeightEvaluator(config: GeoJsonConfig): (feature: { hVal: number }) => number {
  const spikeConfig = config.spike;
  if (!spikeConfig?.heightProp) return () => 0;

  const min = spikeConfig.min ?? 0;
  const max = spikeConfig.max ?? 100;
  const scalar = spikeConfig.scalar ?? 2000000;
  const range = max - min || 1;

  return (feature) => {
    const val = feature.hVal;
    const factor = Math.max(0, Math.min(1, (val - min) / range));
    return Math.max(MIN_HEIGHT_JANK_FACTOR, factor * scalar);
  };
}

// getLabelAnchor removed, now imported from layerUtils
