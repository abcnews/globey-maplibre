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
import type { GeoJsonConfig, GeoJsonFilter } from '../../../lib/marker';
import { getSequentialInterpolator } from '../../../lib/sequentialPalette.ts';
import { THEMES } from './themes.ts';
import type { FeatureCollection } from 'geojson';

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
  return ['interpolate', ['exponential', 2], ['zoom'], 0, sizeAtZoom0, 22, sizeAtZoom0 * Math.pow(2, 22)];
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
 * Creates a colour interpolation function based on the builder's configuration.
 * This serves as the single source of truth for colour scaling across 2D layers
 * and 3D spikes.
 *
 * @param config The GeoJSON layer configuration
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
 * Returns a function that calculates the styling (colours, opacities, sizes) for a single GeoJSON
 * feature, using this layer's single colour mode/filter. Features that don't match the configured
 * filter are hidden (fully transparent) — a layer only ever shows one filtered subset at a time.
 *
 * @param config The GeoJSON layer configuration
 * @returns A function that takes a GeoJSON feature and returns its GeoJsonFeatureState
 */
export function getFeatureStateEvaluator(config: GeoJsonConfig): (feature: any, index: number) => GeoJsonFeatureState {
  const baseOpacity = config.opacity ?? 1;
  const isOpaque = config.isOpaque ?? false;
  const colourMode = config.colourMode || 'basic';
  const colourConfig = config.colourConfig;
  const colourProp = config.colourProp;
  const filter = config.filter;

  const interpolator = colourMode === 'scale' ? getPaletteInterpolator(config) : null;
  const min = colourConfig?.min ?? 0;
  const max = colourConfig?.max ?? 100;
  const range = max - min || 1;
  const minColour = colourConfig?.minColour || '#ffffff';
  const maxColour = colourConfig?.maxColour || '#ff0000';

  const basicPreset = THEMES[colourConfig?.basicType || 'normal'] || THEMES.normal;
  const basicColor = colourConfig?.basicType ? basicPreset.color : colourConfig?.basic || basicPreset.color;

  const matchesFilter = (props: Record<string, any>) => {
    if (!filter?.prop || !filter.values?.length) return true;
    const propValue = String(props[filter.prop] ?? '');
    return filter.values.some(expectedValue => String(expectedValue) === propValue);
  };

  return (feat: any) => {
    const props = feat?.properties || {};

    if (!matchesFilter(props)) return HIDDEN_FEATURE_STATE;

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
      let val = Number(props[colourProp || ''] ?? feat?.cVal ?? 0);
      if (isNaN(val)) val = 0;
      const factor = Math.max(0, Math.min(1, (val - min) / range));
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

/** State applied to a feature that doesn't match the layer's filter — fully transparent. */
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

/** Builds a native MapLibre `filter` expression from a `GeoJsonFilter`, or `undefined` for no filter. */
export function buildFilterExpression(filter?: GeoJsonFilter): any {
  if (!filter?.prop || !filter.values?.length) return undefined;
  return ['in', ['get', filter.prop], ['literal', filter.values]];
}

/** Number of stops sampled from a palette interpolator when building a scale-mode paint expression. */
const SCALE_EXPRESSION_STOPS = 16;

function buildScaleColourExpression(config: GeoJsonConfig): any {
  const { colourProp, colourConfig } = config;
  const min = colourConfig?.min ?? 0;
  const max = colourConfig?.max ?? 100;
  const minColour = colourConfig?.minColour || '#ffffff';
  const maxColour = colourConfig?.maxColour || '#ff0000';
  const propExpr = ['to-number', ['get', colourProp || ''], min];

  const interpolator = getPaletteInterpolator(config);
  if (!interpolator) {
    return ['interpolate', ['linear'], propExpr, min, minColour, max, maxColour];
  }

  const stops = Array.from({ length: SCALE_EXPRESSION_STOPS + 1 }, (_, i) => {
    const t = i / SCALE_EXPRESSION_STOPS;
    return [min + t * (max - min), interpolator(t)];
  });
  return ['interpolate', ['linear'], propExpr, ...stops.flat()];
}

/**
 * Reads a numeric feature property, falling back when it's missing or not a number.
 *
 * `['to-number', ['get', prop], fallback]` is not enough on its own: MapLibre converts a missing
 * property (`null`) to `0` and treats that as a successful conversion, so the fallback is never
 * used and features without the property render with zero opacity/width/radius.
 */
function numericPropExpression(prop: string, fallback: number): any {
  return ['to-number', ['coalesce', ['get', prop], fallback], fallback];
}

/**
 * Builds the native MapLibre paint expression (or constant) for a layer's colour, for the given
 * channel. `fill`/`stroke` differ under `simple` mode (reading distinct GeoJSON simplestyle-spec
 * properties); `marker` is used for point/spike colour.
 */
export function buildColourExpression(config: GeoJsonConfig, channel: 'fill' | 'stroke' | 'marker' = 'marker'): any {
  const { colourMode = 'basic', colourConfig } = config;

  if (colourMode === 'simple') {
    if (channel === 'fill') return ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#00267E'];
    if (channel === 'stroke') return ['coalesce', ['get', 'stroke'], '#00267E'];
    return ['coalesce', ['get', 'marker-color'], ['get', 'stroke'], ['get', 'fill'], ['get', 'fill-color'], '#00267E'];
  }

  if (colourMode === 'scale') return buildScaleColourExpression(config);

  const basicPreset = THEMES[colourConfig?.basicType || 'normal'] || THEMES.normal;
  return colourConfig?.basicType ? basicPreset.color : colourConfig?.basic || basicPreset.color;
}

/** Builds the native MapLibre paint expression (or constant) for a layer's opacity on the given channel. */
export function buildOpacityExpression(config: GeoJsonConfig, channel: 'fill' | 'stroke' | 'circle' = 'fill'): any {
  const { colourMode = 'basic', opacity = 1, isOpaque = false, colourConfig } = config;
  const basicPreset = THEMES[colourConfig?.basicType || 'normal'] || THEMES.normal;

  if (colourMode === 'simple') {
    const prop = channel === 'stroke' ? 'stroke-opacity' : channel === 'circle' ? 'opacity' : 'fill-opacity';
    const fallback = channel === 'stroke' ? 1 : isOpaque ? 1 : 0.5;
    return ['*', opacity, numericPropExpression(prop, fallback)];
  }

  const factor = channel === 'stroke' ? basicPreset.strokeOpacity : isOpaque ? 1 : basicPreset.fillOpacity;
  return opacity * factor;
}

/** Builds the native MapLibre paint expression (or constant) for a point/circle radius. */
export function buildRadiusExpression(config: GeoJsonConfig): any {
  if (config.pointSize?.unit === 'p') return config.pointSize.value;

  const basicPreset = THEMES[config.colourConfig?.basicType || 'normal'] || THEMES.normal;
  if (config.colourMode === 'simple') {
    return [
      'case',
      ['==', ['get', 'marker-size'], 'small'],
      4,
      ['==', ['get', 'marker-size'], 'large'],
      9,
      numericPropExpression('marker-size', basicPreset.radius)
    ];
  }
  return basicPreset.radius;
}

/** Builds the native MapLibre paint expression (or constant) for a stroke/line width. */
export function buildStrokeWidthExpression(config: GeoJsonConfig): any {
  if (config.lineWidth?.unit === 'p') return config.lineWidth.value;

  const basicPreset = THEMES[config.colourConfig?.basicType || 'normal'] || THEMES.normal;
  if (config.colourMode === 'simple') {
    return numericPropExpression('stroke-width', basicPreset.strokeWidth);
  }
  return basicPreset.strokeWidth;
}

/** Adds a fixed amount to a width value that may be a constant or a MapLibre expression. */
export function widthPlus(widthExpr: any, addition: number): any {
  return typeof widthExpr === 'number' ? widthExpr + addition : ['+', widthExpr, addition];
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

export function filterFeaturesType(data: FeatureCollection, featureTypes = ['']) {
  return {
    ...data,
    features: data.features.filter(feature => featureTypes.includes(feature.geometry?.type))
  };
}
