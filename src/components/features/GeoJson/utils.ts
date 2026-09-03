import type { Map as MapLibreMap } from 'maplibre-gl';
import { feature } from 'topojson-client';
import {
  getDivergentContinuousPaletteInterpolator,
  SequentialPalette,
  DivergentPalette,
  ColourMode
} from '@abcnews/palette';
import { interpolateColour, getCustomPaletteInterpolator } from '../../../lib/colours.ts';
import { fetchDownloadObject } from '../../../lib/fetchDownloadObject.ts';
import { isValidUrl } from '../../../lib/marker/utils.ts';
import type { GeoJsonConfig, GeoJsonStyleConfig } from '../../../lib/marker';
import { getSequentialInterpolator } from '../../../lib/sequentialPalette.ts';
import { MAPLIBRE_TWEEN_STATE_KEY, tweenStopsExpression } from '../Tween/utils.ts';
import { THEMES } from './themes.ts';

export { generateGeoJsonSourceId as generateId, getLabelAnchor } from '../layers/layerUtils.ts';

/**
 * Fetches and normalizes GeoJSON or TopoJSON data from either a CMID or a URL.
 *
 * @param source Object containing either a cmid (number or string) or a url (string)
 * @returns GeoJSON feature collection or geometry
 */
export async function fetchGeoJsonData(source: { cmid?: number | string; url?: string }): Promise<any> {
  const { cmid, url } = source;
  let rawData: any;

  if (url) {
    if (!isValidUrl(url)) {
      throw new Error(`Invalid or preview URL provided: ${url}`);
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch GeoJSON from ${url}: ${res.status}`);
    }
    rawData = await res.json();
  } else if (cmid) {
    const id = typeof cmid === 'string' ? Number(cmid) : cmid;
    if (!id || isNaN(id) || id <= 0) {
      throw new Error(`Invalid CMID provided: ${cmid}`);
    }
    rawData = await fetchDownloadObject(id);
  } else {
    throw new Error('Neither CMID nor URL provided for GeoJSON source');
  }

  let geojson: any = rawData;
  if (rawData && rawData.type === 'Topology' && rawData.objects) {
    const key = Object.keys(rawData.objects)[0];
    if (key) {
      geojson = feature(rawData, rawData.objects[key]);
    }
  }

  // Ensure every feature has a defined ID for MapLibre setFeatureState
  if (geojson && geojson.type === 'FeatureCollection' && Array.isArray(geojson.features)) {
    geojson.features.forEach((f: any, index: number) => {
      if (f.id === undefined || f.id === null) {
        f.id = index;
      }
    });
  } else if (geojson && geojson.type === 'Feature') {
    if (geojson.id === undefined || geojson.id === null) {
      geojson.id = 0;
    }
  }

  return geojson;
}

/** Earth equatorial circumference in kilometres */
export const EARTH_CIRCUMFERENCE_KM = 40075;

/** Standard Web Mercator tile size in pixels at zoom 0 */
export const TILE_SIZE_PX = 512;

/**
 * Generates a MapLibre zoom-interpolation expression to scale kilometre-based dimensions (points or lines)
 * so that they maintain constant real-world physical size on the globe across zoom levels.
 *
 * @param valueInKm Width or radius in kilometres
 */
export function getKilometreZoomScaleExpression(valueInKm: number): any {
  const sizeAtZoom0 = (valueInKm / EARTH_CIRCUMFERENCE_KM) * TILE_SIZE_PX;
  return [
    'interpolate',
    ['exponential', 2],
    ['zoom'],
    0,
    sizeAtZoom0,
    22,
    sizeAtZoom0 * Math.pow(2, 22)
  ];
}

export interface GeoJsonFeatureState {
  color: string;
  fillColor: string;
  strokeColor: string;
  outlineColor: string;
  radius: number;
  strokeWidth: number;
  outlineWidth: number;
  opacity: number;
  fillOpacity: number;
  strokeOpacity: number;
}

/**
 * Levels the colour-scale `factor` is snapped to when building class layers
 * ([buildFeatureClasses]). Visually lossless on a ramp; bounds the class count so
 * a continuous choropleth over hundreds of thousands of features still resolves
 * to a small, fixed set of layers.
 */
export const COLOUR_SCALE_STEPS = 24;

/** State applied to a feature that matches no style rule — fully transparent. */
export const HIDDEN_FEATURE_STATE: GeoJsonFeatureState = Object.freeze({
  color: '#00267E',
  fillColor: '#00267E',
  strokeColor: '#00267E',
  outlineColor: '#ffffff',
  radius: 0,
  strokeWidth: 0,
  outlineWidth: 0,
  opacity: 0,
  fillOpacity: 0,
  strokeOpacity: 0
});

/**
 * Creates a colour interpolation function based on the builder's configuration.
 * This serves as the single source of truth for colour scaling across 2D layers
 * and 3D spikes.
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
 * Creates a single style evaluator for computing per-feature style state.
 */
function getSingleStyleEvaluator(
  config: GeoJsonConfig,
  style: GeoJsonStyleConfig,
  quantiseSteps = 0
): (feature: any, index: number) => GeoJsonFeatureState {
  const baseOpacity = style.opacity ?? 1;
  const isOpaque = style.isOpaque ?? false;
  const colourMode = style.colourMode || 'basic';
  const colourConfig = style.colourConfig;
  const colourProp = style.colourProp;

  const interpolator = colourMode === 'scale' ? getPaletteInterpolator(style) : null;
  const min = colourConfig?.min ?? 0;
  const max = colourConfig?.max ?? 100;
  const range = max - min || 1;
  const minColour = colourConfig?.minColour || '#ffffff';
  const maxColour = colourConfig?.maxColour || '#ff0000';

  const basicPreset = THEMES[colourConfig?.basicType || 'normal'] || THEMES.normal;
  const basicColor = colourConfig?.basicType ? basicPreset.color : colourConfig?.basic || basicPreset.color;

  return (feature: any) => {
    const props = feature?.properties || {};

    // 1. Calculate color / fillColor / strokeColor
    let markerColor = basicColor;
    let strokeColor = basicColor;
    let fillColor = basicColor;

    if (colourMode === 'basic') {
      markerColor = basicColor;
      strokeColor = basicColor;
      fillColor = basicColor;
    } else if (colourMode === 'simple') {
      markerColor = props['marker-color'] || props['stroke'] || props['fill'] || props['fill-color'] || '#00267E';
      strokeColor = props['stroke'] || '#00267E';
      fillColor = props['fill'] || props['fill-color'] || '#00267E';
    } else if (colourMode === 'scale') {
      let val = Number(props[colourProp || ''] ?? feature?.cVal ?? 0);
      if (isNaN(val)) val = 0;
      let factor = Math.max(0, Math.min(1, (val - min) / range));
      // Snap to a fixed number of levels so class-layer building stays bounded.
      if (quantiseSteps > 0) factor = Math.round(factor * quantiseSteps) / quantiseSteps;
      let evaluatedColour = '#888888';
      if (interpolator) {
        evaluatedColour = interpolator(factor);
      } else if (val <= min) {
        evaluatedColour = minColour;
      } else if (val >= max) {
        evaluatedColour = maxColour;
      } else {
        evaluatedColour = interpolateColour(minColour, maxColour, factor);
      }
      markerColor = evaluatedColour;
      strokeColor = evaluatedColour;
      fillColor = evaluatedColour;
    }

    // 2. Calculate opacities
    let fillOpacityFactor = basicPreset.fillOpacity;
    let strokeOpacityFactor = basicPreset.strokeOpacity;

    if (colourMode === 'simple') {
      fillOpacityFactor = Number(props['fill-opacity']) || (isOpaque ? 1.0 : 0.5);
      strokeOpacityFactor = Number(props['stroke-opacity']) || 1.0;
    } else if (isOpaque) {
      fillOpacityFactor = 1.0;
    }

    const calculatedFillOpacity = baseOpacity * fillOpacityFactor;
    const calculatedStrokeOpacity = baseOpacity * strokeOpacityFactor;
    const calculatedCircleOpacity =
      colourMode === 'simple' && props['opacity'] !== undefined
        ? baseOpacity * Number(props['opacity'])
        : calculatedFillOpacity;

    // 3. Calculate radius & stroke width
    let radius = basicPreset.radius;
    if (config.pointSize && config.pointSize.unit === 'p') {
      radius = config.pointSize.value;
    } else if (colourMode === 'simple') {
      const sizeProp = props['marker-size'];
      if (sizeProp === 'small') radius = 4;
      else if (sizeProp === 'large') radius = 9;
      else if (sizeProp !== undefined && !isNaN(Number(sizeProp))) radius = Number(sizeProp);
    }

    let strokeWidth = basicPreset.strokeWidth;
    if (config.lineWidth && config.lineWidth.unit === 'p') {
      strokeWidth = config.lineWidth.value;
    } else if (colourMode === 'simple' && props['stroke-width'] !== undefined) {
      strokeWidth = Number(props['stroke-width']) || 2;
    }

    return {
      color: markerColor,
      fillColor,
      strokeColor,
      outlineColor: '#ffffff',
      radius,
      strokeWidth,
      outlineWidth: strokeWidth + 2,
      opacity: calculatedCircleOpacity,
      fillOpacity: calculatedFillOpacity,
      strokeOpacity: calculatedStrokeOpacity
    };
  };
}

/**
 * Returns a function that calculates the styling (colours, opacities, sizes) for a single GeoJSON feature.
 * It checks the feature's properties against each style rule in config.styles in order, using the first rule that matches.
 * If no rules match, the feature is hidden. If no custom styles are configured, it uses the default theme.
 *
 * @param config The GeoJSON layer configuration containing the style rules
 * @returns A function that takes a GeoJSON feature and returns its GeoJsonFeatureState
 */
export function getFeatureStateEvaluator(
  config: GeoJsonConfig,
  opts: { quantiseSteps?: number } = {}
): (feature: any, index: number) => GeoJsonFeatureState {
  const quantiseSteps = opts.quantiseSteps ?? 0;

  // Pre-build rule matching predicates to avoid re-parsing filter arrays on every feature
  const styleRules = (config.styles || []).map(style => {
    const evaluate = getSingleStyleEvaluator(config, style, quantiseSteps);
    const filter = style.filter;

    const matches = (props: Record<string, any>) => {
      // If no filter property is configured, treat this as an unconditional catch-all rule
      if (!filter?.prop || !filter.values?.length) {
        return true;
      }
      const propValue = String(props[filter.prop] ?? '');
      return filter.values.some(expectedValue => String(expectedValue) === propValue);
    };

    return { matches, evaluate };
  });

  const defaultEvaluator = getSingleStyleEvaluator(
    config,
    {
      colourMode: 'basic',
      colourConfig: { basicType: 'normal' },
      opacity: 1,
      isOpaque: false
    },
    quantiseSteps
  );

  return (feature: any, index: number) => {
    const props = feature?.properties || {};

    // Find the first rule whose filter matches the feature properties
    const matchedRule = styleRules.find(rule => rule.matches(props));
    if (matchedRule) {
      return matchedRule.evaluate(feature, index);
    }

    // When style rules are defined but none matched, the feature is filtered out (hidden)
    if (config.styles && config.styles.length > 0) {
      return HIDDEN_FEATURE_STATE;
    }

    // Default fallback when no custom styles are specified
    return defaultEvaluator(feature, index);
  };
}

/**
 * Updates MapLibre feature states on a source for all features in the GeoJSON dataset.
 */
export function applyFeatureStates(
  map: MapLibreMap,
  sourceId: string,
  data: any,
  config: GeoJsonConfig
) {
  if (!map || !map.getSource(sourceId) || !data?.features?.length) return;

  const evaluator = getFeatureStateEvaluator(config);

  data.features.forEach((feat: any, index: number) => {
    const id = feat.id ?? index;
    const state = evaluator(feat, index);
    map.setFeatureState({ source: sourceId, id }, state);
  });
}

/** Property written onto every feature by [buildFeatureClasses]. */
export const FEATURE_CLASS_PROP = '__gjClass';

/** Global-state key the class-layer paint expressions read. Shared with every other feature. */
export const GEOJSON_POSITION_STATE = MAPLIBRE_TWEEN_STATE_KEY;

export interface FeatureClasses {
  /** Number of distinct classes; one layer (set) is added per class. */
  classCount: number;
  /** `classStates[classIndex][panelIndex]` — the class's resolved state in each panel. */
  classStates: GeoJsonFeatureState[][];
}

/**
 * Buckets every feature by the *trajectory* of its resolved style across all
 * panels, writing an integer `__gjClass` onto each feature's properties.
 *
 * Two features that render identically in every panel share a class, so a large
 * dataset collapses to a handful of classes — one static, filter-selected layer
 * each, whose paint interpolates purely over the `gjPos` global-state (no
 * per-feature work at animation time). `colourMode: 'scale'` is quantised so
 * continuous data stays bounded.
 *
 * Mutates `data.features[i].properties.__gjClass`. Pure otherwise.
 *
 * @param perPanelConfigs This item's `GeoJsonConfig` in each panel; `undefined`
 *   for a panel where the item is absent (→ hidden there).
 */
export function buildFeatureClasses(
  data: any,
  perPanelConfigs: (GeoJsonConfig | undefined)[],
  quantiseSteps: number = COLOUR_SCALE_STEPS
): FeatureClasses {
  const features: any[] = data?.type === 'Feature' ? [data] : (data?.features ?? []);

  const evaluators = perPanelConfigs.map(cfg =>
    cfg ? getFeatureStateEvaluator(cfg, { quantiseSteps }) : null
  );

  const keyToIndex = new Map<string, number>();
  const classStates: GeoJsonFeatureState[][] = [];

  features.forEach((feat, i) => {
    const states = evaluators.map(evaluate => (evaluate ? evaluate(feat, i) : HIDDEN_FEATURE_STATE));
    const key = JSON.stringify(states);

    let index = keyToIndex.get(key);
    if (index === undefined) {
      index = classStates.length;
      keyToIndex.set(key, index);
      classStates.push(states);
    }

    if (!feat.properties) feat.properties = {};
    feat.properties[FEATURE_CLASS_PROP] = index;
  });

  return { classCount: classStates.length, classStates };
}

/** Filter that selects only the features assigned to `classIndex`. */
export function classFilterExpression(classIndex: number): any {
  return ['==', ['get', FEATURE_CLASS_PROP], classIndex];
}

/**
 * Builds the paint value for one field of one class layer: a pure
 * `interpolate` over the `gjPos` global-state with one stop per panel, so
 * `map.setGlobalStateProperty('gjPos', fromPanel + easedT)` drives the whole
 * layer with a single per-frame call. A single-panel (builder) class collapses
 * to the constant value.
 */
export function classPaintExpression(
  perPanelStates: GeoJsonFeatureState[],
  field: keyof GeoJsonFeatureState,
  posKey: string = MAPLIBRE_TWEEN_STATE_KEY
): any {
  return tweenStopsExpression(
    perPanelStates.map(state => state[field]),
    posKey
  );
}

/**
 * Creates a colour evaluator function for spikes and custom layers.
 */
export function getColourEvaluator(config: GeoJsonConfig): (feature: any) => string {
  const evaluator = getFeatureStateEvaluator(config);
  return feature => evaluator(feature, 0).color;
}

const MIN_HEIGHT_JANK_FACTOR = 3000;

/**
 * Creates a high-performance height evaluator function for spikes.
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
