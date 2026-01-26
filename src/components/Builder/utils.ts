import type { maplibregl } from '../mapLibre/index';

/**
 * Triggers a map.flyTo event and let the builder know it should update the
 * state with the new coords.
 */
export function safeFlyTo(map: maplibregl.Map, options: any) {
  map.flyTo(options, { builderInitiated: true });
}

/**
 * Triggers a map.fitBounds event and let the builder know it should update the
 * state with the new coords.
 */
export function safeFitBounds(
  map: maplibregl.Map,
  bounds: [number, number][] | [[number, number], [number, number]],
  options: any
) {
  map.fitBounds(bounds as any, options, { builderInitiated: true });
}
