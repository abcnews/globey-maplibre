import type { MapLabelsLayer } from './jsonBlob.ts';

/** The middle of Australia as `[lng, lat]`: where a new session starts and the fallback for a new layer's position. */
export const AUSTRALIA_CENTRE: [number, number] = [133.7751, -25.2744];

/** The zoom that shows most of Australia on the globe, used with `AUSTRALIA_CENTRE` for a new session. */
export const AUSTRALIA_ZOOM = 3.5;

/**
 * Validates if a URL is allowed (not a preview URL)
 */
export function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.includes('preview.') && !url.includes('preview-');
}

/**
 * The boolean toggles on a `mapLabels` layer, as distinct from its `id`/`type`/`enabled`
 * bookkeeping fields. Enumerated rather than derived so `hasMapLabels` can't be fooled by
 * a truthy `id` string.
 */
const MAP_LABEL_FLAG_KEYS = [
  'countriesMajor',
  'countriesMedium',
  'countriesMinor',
  'continents',
  'states',
  'cities',
  'towns',
  'oceans',
  'nationalBoundaries',
  'stateBoundaries'
] as const;

export type MapLabelFlags = Pick<MapLabelsLayer, (typeof MAP_LABEL_FLAG_KEYS)[number]>;

export const DEFAULT_MAP_LABELS: MapLabelFlags = {
  countriesMajor: true,
  countriesMedium: true,
  countriesMinor: true,
  continents: false,
  states: false,
  cities: false,
  towns: false,
  oceans: false,
  nationalBoundaries: true,
  stateBoundaries: false
};

/**
 * Determines whether any built-in map labels or boundaries are active.
 */
export function hasMapLabels(labels?: Partial<MapLabelFlags> | null): boolean {
  if (!labels) return false;
  return MAP_LABEL_FLAG_KEYS.some(key => labels[key]);
}
