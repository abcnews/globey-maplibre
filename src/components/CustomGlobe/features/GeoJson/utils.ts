import {
  getDivergentContinuousPaletteInterpolator,
  SequentialPalette,
  DivergentPalette,
  ColourMode
} from '@abcnews/palette';
import { interpolateColour, getCustomPaletteInterpolator } from '../../../../lib/colours';
import type { GeoJsonConfig, GeoJsonStyleConfig } from '../../../../lib/marker';
import { getSequentialInterpolator } from '../../../../lib/sequentialPalette';
import { THEMES } from './themes';

export { generateGeoJsonSourceId as generateId, getLabelAnchor } from '../layerUtils';

/**
 * Creates a colour interpolation function based on the builder's configuration.
 * This serves as the single source of truth for colour scaling, ensuring that
 * MapLibre expressions (used for points) and direct evaluation (used for spikes)
 * remain perfectly synchronised.
 *
 * @param style The GeoJSON style configuration
 * @returns An interpolator function for mapping 0-1 values to CSS colours
 */
export function getPaletteInterpolator(style: GeoJsonStyleConfig): ((t: number) => string) | null {
  const { paletteType, paletteVariant, customPalette } = style.colourConfig || {};
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
  if (!config.styles || config.styles.length === 0) return '#888888';

  // If there's only one style and it has no filter, we can keep it simple
  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleColourExpression(config.styles[0], context);
  }

  // Otherwise, we build a case expression
  const caseExpr: any[] = ['case'];

  for (const style of config.styles) {
    const expr = getSingleStyleColourExpression(style, context);

    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];

      caseExpr.push(matchExpr, expr);
    } else {
      // Catch-all style (no filter)
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  // Final fallback if no rules matched
  caseExpr.push('#888888');
  return caseExpr;
}

function getSingleStyleColourExpression(style: GeoJsonStyleConfig, context: 'fill' | 'stroke' | 'marker'): any {
  if (style.colourMode === 'override') {
    const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
    if (preset) return preset.color;
    return style.colourConfig?.override || '#ff0000';
  }

  if (style.colourMode === 'simple') {
    if (context === 'marker') {
      return [
        'coalesce',
        ['get', 'marker-color'],
        ['get', 'stroke'],
        ['get', 'fill'],
        ['get', 'fill-color'],
        '#00267E'
      ];
    }
    if (context === 'stroke') {
      return ['coalesce', ['get', 'stroke'], '#00267E'];
    }
    return ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#00267E'];
  }

  if (style.colourMode === 'scale' && style.colourProp) {
    const min = style.colourConfig?.min ?? 0;
    const max = style.colourConfig?.max ?? 100;
    const interpolator = getPaletteInterpolator(style);

    if (interpolator) {
      const stops: any[] = [];
      const numStops =
        style.colourConfig?.paletteType === 'custom' ? style.colourConfig?.customPalette?.length || 5 : 5;
      for (let i = 0; i < numStops; i++) {
        const t = i / (numStops - 1);
        const val = min + t * (max - min);

        // Sample the shared interpolator to generate discrete stops for the GL layer
        stops.push(val, (interpolator as any)(t));
      }

      return ['interpolate', ['linear'], ['get', style.colourProp], ...stops];
    }

    const minColour = style.colourConfig?.minColour || '#ffffff';
    const maxColour = style.colourConfig?.maxColour || '#ff0000';

    return ['interpolate', ['linear'], ['get', style.colourProp], min, minColour, max, maxColour];
  }

  return '#888888';
}

/**
 * Creates a high-performance colour evaluator function.
 * This hoists configuration lookups and interpolator creation out of the evaluation logic.
 */
/**
 * Creates a high-performance colour evaluator function.
 * This hoists configuration lookups and interpolator creation out of the evaluation logic.
 */
export function getColourEvaluator(config: GeoJsonConfig): (feature: any) => string {
  if (!config.styles || config.styles.length === 0) return () => '#888888';

  const evaluators = config.styles.map(style => ({
    filter: style.filter,
    evaluate: getSingleStyleColourEvaluator(style)
  }));

  return feature => {
    for (const { filter, evaluate } of evaluators) {
      if (filter?.prop && filter.values) {
        const val = String(feature.properties?.[filter.prop]);
        if (filter.values.includes(val)) {
          return evaluate(feature);
        }
      } else {
        // Catch-all
        return evaluate(feature);
      }
    }
    return '#888888';
  };
}

function getSingleStyleColourEvaluator(style: GeoJsonStyleConfig): (feature: any) => string {
  const mode = style.colourMode;
  const colourConfig = style.colourConfig;

  // Simple Mode
  if (mode === 'simple') {
    return feature => feature.cVal || '#888888';
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
    const interpolator = getPaletteInterpolator(style);
    const minColour = colourConfig?.minColour || '#ffffff';
    const maxColour = colourConfig?.maxColour || '#ff0000';

    return feature => {
      let val = Number(feature.cVal);
      if (style.colourProp && feature.properties) {
        val = Number(feature.properties[style.colourProp]);
      }

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
  if (config.lineWidth) {
    const { value, unit } = config.lineWidth;
    if (unit === 'p') {
      return value;
    }
    if (unit === 'k') {
      return [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        0,
        (value / 40075) * 512,
        22,
        (value / 40075) * 512 * Math.pow(2, 22)
      ];
    }
  }

  if (!config.styles || config.styles.length === 0) return 2;

  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleStrokeWidthExpression(config.styles[0]);
  }

  const caseExpr: any[] = ['case'];
  for (const style of config.styles) {
    const expr = getSingleStyleStrokeWidthExpression(style);
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, expr);
    } else {
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  caseExpr.push(2);
  return caseExpr;
}

function getSingleStyleStrokeWidthExpression(style: GeoJsonStyleConfig): any {
  if (style.colourMode === 'simple') {
    return ['coalesce', ['get', 'stroke-width'], 2];
  }
  const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
  if (preset) return preset.strokeWidth;
  return 2;
}

/**
 * Calculates a MapLibre radius expression.
 * Supports absolute pixel values or real-world kilometre scaling that
 * adjusts dynamically with zoom level to maintain geographic size.
 */
export function getCircleRadiusExpression(config: GeoJsonConfig): any {
  if (config.pointSize) {
    const { value, unit } = config.pointSize;
    if (unit === 'p') {
      return value;
    }
    if (unit === 'k') {
      return [
        'interpolate',
        ['exponential', 2],
        ['zoom'],
        0,
        (value / 40075) * 512,
        22,
        (value / 40075) * 512 * Math.pow(2, 22)
      ];
    }
  }

  if (!config.styles || config.styles.length === 0) return THEMES.normal.radius;

  // Simple case for one style
  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleCircleRadiusExpression(config.styles[0]);
  }

  const caseExpr: any[] = ['case'];
  for (const style of config.styles) {
    const expr = getSingleStyleCircleRadiusExpression(style);
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, expr);
    } else {
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  caseExpr.push(6);
  return caseExpr;
}

function getSingleStyleCircleRadiusExpression(style: GeoJsonStyleConfig): any {
  if (style.colourMode === 'simple') {
    return [
      'match',
      ['get', 'marker-size'],
      'small',
      4,
      'large',
      9,
      ['coalesce', ['to-number', ['get', 'marker-size']], 6]
    ];
  }
  const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
  if (preset) return preset.radius;
  return THEMES.normal.radius;
}

export function getCircleOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);

  if (!config.styles || config.styles.length === 0) return ['*', baseOpacity, THEMES.normal.fillOpacity];

  // If one style with no filter, keep it simple
  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleCircleOpacityExpression(config.styles[0], baseOpacity);
  }

  const caseExpr: any[] = ['case'];
  for (const style of config.styles) {
    const expr = getSingleStyleCircleOpacityExpression(style, 1); // Pass 1 as base, we multiply by baseOpacity at the end
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, expr);
    } else {
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  // Final fallback (hidden if no rules match)
  caseExpr.push(THEMES.normal.fillOpacity); // Default circle factor
  return ['*', baseOpacity, caseExpr];
}

function getSingleStyleCircleOpacityExpression(style: GeoJsonStyleConfig, baseOpacity: any): any {
  if (style.colourMode === 'simple') {
    return [
      '*',
      baseOpacity,
      ['coalesce', ['get', 'opacity'], ['get', 'fill-opacity'], ['get', 'stroke-opacity'], THEMES.normal.fillOpacity]
    ];
  }
  const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
  if (preset) return ['*', baseOpacity, preset.fillOpacity];
  return baseOpacity;
}

export function getFillOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);

  if (!config.styles || config.styles.length === 0) return ['*', baseOpacity, THEMES.normal.fillOpacity];

  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleFillOpacityExpression(config.styles[0], baseOpacity);
  }

  const caseExpr: any[] = ['case'];
  for (const style of config.styles) {
    const expr = getSingleStyleFillOpacityExpression(style, 1);
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, expr);
    } else {
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  // Final fallback
  caseExpr.push(THEMES.normal.fillOpacity);
  return ['*', baseOpacity, caseExpr];
}

function getSingleStyleFillOpacityExpression(style: GeoJsonStyleConfig, baseOpacity: any): any {
  if (style.colourMode === 'simple') {
    return ['*', baseOpacity, ['coalesce', ['get', 'fill-opacity'], 0.5]];
  }
  const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
  if (preset) return ['*', baseOpacity, preset.fillOpacity];
  return baseOpacity === 1 ? THEMES.normal.fillOpacity : baseOpacity;
}

export function getStrokeOpacityExpression(config: GeoJsonConfig): any {
  const baseOpacity = getOpacityExpression(config);

  if (!config.styles || config.styles.length === 0) return baseOpacity;

  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return getSingleStyleStrokeOpacityExpression(config.styles[0], baseOpacity);
  }

  const caseExpr: any[] = ['case'];
  for (const style of config.styles) {
    const expr = getSingleStyleStrokeOpacityExpression(style, 1);
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, expr);
    } else {
      caseExpr.push(expr);
      return caseExpr;
    }
  }

  // Final fallback
  caseExpr.push(1);
  return ['*', baseOpacity, caseExpr];
}

function getSingleStyleStrokeOpacityExpression(style: GeoJsonStyleConfig, baseOpacity: any): any {
  if (style.colourMode === 'simple') {
    return ['*', baseOpacity, ['coalesce', ['get', 'stroke-opacity'], 1.0]];
  }
  const preset = THEMES[style.colourConfig?.overrideType || 'custom'];
  if (preset) return ['*', baseOpacity, preset.strokeOpacity];
  return baseOpacity;
}

/**
 * Generates a MapLibre expression for opacity.
 * Primarily handles hiding features that are excluded by the builder's filters.
 */
export function getOpacityExpression(config: GeoJsonConfig): any {
  if (!config.styles || config.styles.length === 0) return 1;

  // If there's only one style and it has no filter, it's just the opacity
  if (config.styles.length === 1 && !config.styles[0].filter?.prop) {
    return config.styles[0].opacity ?? 1;
  }

  const caseExpr: any[] = ['case'];

  for (const style of config.styles) {
    const opacity = style.opacity ?? 1;
    if (style.filter?.prop && style.filter.values) {
      const propExpr = ['to-string', ['coalesce', ['get', style.filter.prop], '']];
      const matchExpr =
        style.filter.values.length === 1
          ? ['==', propExpr, String(style.filter.values[0])]
          : ['in', propExpr, ['literal', style.filter.values.map(String)]];
      caseExpr.push(matchExpr, opacity);
    } else {
      // Catch-all
      caseExpr.push(opacity);
      return caseExpr;
    }
  }

  // Final fallback (hidden if no rules match)
  caseExpr.push(0);
  return caseExpr;
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

  return feature => {
    const val = feature.hVal;
    const factor = Math.max(0, Math.min(1, (val - min) / range));
    return Math.max(MIN_HEIGHT_JANK_FACTOR, factor * scalar);
  };
}

// getLabelAnchor removed, now imported from layerUtils
