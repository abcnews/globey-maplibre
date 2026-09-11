import Geohash from 'latlon-geohash';
import { parse, stringify } from '@abcnews/alternating-case-to-object';
import { GEOHASH_PRECISION } from '../marker/schema.ts';

export interface MarkerLayerOverride {
  /** Layer ID or slug matching the layer in the global JSON blob */
  name: string;
  /** Whether the layer is active or inactive */
  state: 'on' | 'off';
  /** Transition duration in milliseconds for an immediate fade on arrival. If undefined, animation is scroll-tied. */
  duration?: number;
  /** Optional hex colour override without '#' (e.g. 'ff3300') */
  colour?: string;
}

export type BaseStyle = 'satellite' | 'street' | 'dark';

export interface MarkerConfig {
  /** Geographic bounding box [[lng1, lat1], [lng2, lat2], ...] */
  bbox?: [number, number][];
  /** Camera fly-to duration in milliseconds. If undefined, tracking is scroll-tied. */
  cam?: number;
  /** Base map layer style */
  base?: BaseStyle;
  /** Base vector labels toggle */
  labels?: boolean;
  /** Locator inset minimap toggle */
  minimap?: boolean;
  /** Layer overrides for this marker */
  layers?: MarkerLayerOverride[];
}

/**
 * Parses a single layer override string from an ACTO marker token.
 * Format: `<name><on|off>[<duration>ms][<hex>]`
 * Examples:
 * - "fireson" -> { name: "fires", state: "on" }
 * - "fireson2000ms" -> { name: "fires", state: "on", duration: 2000 }
 * - "firesonff3300" -> { name: "fires", state: "on", colour: "ff3300" }
 * - "fireson2000msff3300" -> { name: "fires", state: "on", duration: 2000, colour: "ff3300" }
 * - "firesoff500ms" -> { name: "fires", state: "off", duration: 500 }
 */
export function parseLayerOverride(token: string): MarkerLayerOverride | null {
  if (!token) return null;
  // Matches name, state ('on' or 'off'), optional duration (digits before 'ms'), optional hex colour (3 or 6 hex chars)
  const match = token.match(/^(.+?)(on|off)(?:(\d+)ms)?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})?$/);
  if (!match) return null;

  const [_, name, state, durationStr, colour] = match;
  const result: MarkerLayerOverride = {
    name,
    state: state as 'on' | 'off'
  };

  if (durationStr !== undefined) {
    result.duration = Number(durationStr);
  }

  if (colour) {
    // Normalise 3-char hex to 6-char hex
    result.colour = colour.length === 3
      ? colour.split('').map(c => c + c).join('').toLowerCase()
      : colour.toLowerCase();
  }

  return result;
}

/**
 * Serialises a single MarkerLayerOverride into an ACTO token string.
 */
export function formatLayerOverride(override: MarkerLayerOverride): string {
  const { name, state, duration, colour } = override;
  const durSuffix = duration !== undefined ? `${duration}ms` : '';
  const colSuffix = colour ? colour.replace(/^#/, '').toLowerCase() : '';
  return `${name}${state}${durSuffix}${colSuffix}`;
}

/**
 * Decodes concatenated geohashes into an array of [lng, lat] coordinates.
 */
export function decodeGeohashBounds(hash: string): [number, number][] {
  if (!hash) return [];
  const regex = new RegExp(`.{${GEOHASH_PRECISION}}`, 'g');
  return (hash.match(regex) || []).map(part => {
    const { lat, lon } = Geohash.decode(part);
    return [Number(lon), Number(lat)] as [number, number];
  });
}

/**
 * Encodes an array of [lng, lat] coordinates into concatenated geohashes.
 */
export function encodeGeohashBounds(bounds: [number, number][]): string {
  if (!bounds || bounds.length === 0) return '';
  return bounds.map(([lng, lat]) => Geohash.encode(lat, lng, GEOHASH_PRECISION)).join('');
}

/**
 * Decodes an ACTO marker string into a typed MarkerConfig object.
 *
 * Example input:
 * `BBOXxxxxxxCAM1500msLAYERsatelliteonLAYERfireson2000msff3300LAYERevacoffBASEstreetLABELSonMINIMAPoff`
 * (or with `#mark` / `mark` prefix)
 */
export function decodeMarker(raw: string): MarkerConfig {
  if (!raw) return {};

  // Strip leading hashtag or anchor prefixes if present (e.g. #mark... or mark...)
  let cleanInput = raw.trim().replace(/^#/, '');
  if (cleanInput.startsWith('mark')) {
    cleanInput = cleanInput.slice(4);
  }

  const parsed = parse(cleanInput) as Record<string, any>;
  const config: MarkerConfig = {};

  if (parsed.bbox && typeof parsed.bbox === 'string') {
    config.bbox = decodeGeohashBounds(parsed.bbox);
  }

  if (parsed.cam && typeof parsed.cam === 'string') {
    const camMatch = parsed.cam.match(/^(\d+)ms$/);
    if (camMatch) {
      config.cam = Number(camMatch[1]);
    }
  }

  if (parsed.base && typeof parsed.base === 'string') {
    const baseValue = parsed.base.toLowerCase();
    if (baseValue === 'satellite' || baseValue === 'street' || baseValue === 'dark') {
      config.base = baseValue as BaseStyle;
    }
  }

  if (parsed.labels !== undefined) {
    if (parsed.labels === 'on' || parsed.labels === true) config.labels = true;
    if (parsed.labels === 'off' || parsed.labels === false) config.labels = false;
  }

  if (parsed.minimap !== undefined) {
    if (parsed.minimap === 'on' || parsed.minimap === true) config.minimap = true;
    if (parsed.minimap === 'off' || parsed.minimap === false) config.minimap = false;
  }

  if (parsed.layer) {
    const rawLayers = Array.isArray(parsed.layer) ? parsed.layer : [parsed.layer];
    const layers = rawLayers
      .map((token: any) => parseLayerOverride(String(token)))
      .filter((item: MarkerLayerOverride | null): item is MarkerLayerOverride => item !== null);

    if (layers.length > 0) {
      config.layers = layers;
    }
  }

  return config;
}

/**
 * Encodes a MarkerConfig object into an ACTO marker string.
 *
 * Example output:
 * `BBOXknpp5e9cbbknpp5e9cbbCAM1500msLAYERsatelliteonLAYERfireson2000msff3300BASEstreetLABELSonMINIMAPoff`
 */
export function encodeMarker(config: MarkerConfig): string {
  const actoData: Record<string, any> = {};

  if (config.bbox && config.bbox.length > 0) {
    actoData.bbox = encodeGeohashBounds(config.bbox);
  }

  if (config.cam !== undefined) {
    actoData.cam = `${config.cam}ms`;
  }

  if (config.layers && config.layers.length > 0) {
    const layerTokens = config.layers.map(formatLayerOverride);
    actoData.layer = layerTokens.length === 1 ? layerTokens[0] : layerTokens;
  }

  if (config.base) {
    actoData.base = config.base;
  }

  if (config.labels !== undefined) {
    actoData.labels = config.labels ? 'on' : 'off';
  }

  if (config.minimap !== undefined) {
    actoData.minimap = config.minimap ? 'on' : 'off';
  }

  return stringify(actoData);
}
