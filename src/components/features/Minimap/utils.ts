import type { Map } from 'maplibre-gl';

export const LONGITUDE_SPAN_DEGREES = 360;

/** Pixel size below which the projected viewport rectangle collapses to a single dot. */
export const MIN_RECTANGLE_PX = 5;

/**
 * Shifts `lng` by whole turns of 360 so it lands within 180 degrees of `referenceLng`.
 *
 * maplibre normalises `unproject`/`getBounds` longitudes into [-180, 180], which breaks any
 * geometry that straddles the antimeridian: a corner at 170 next to one at -170 looks 340 degrees
 * apart. Unwrapping both relative to the viewport centre restores the true 20 degree gap.
 */
export function unwrapLongitude(lng: number, referenceLng: number): number {
  const turns = Math.round((lng - referenceLng) / LONGITUDE_SPAN_DEGREES);
  return lng - turns * LONGITUDE_SPAN_DEGREES;
}

/** Normalises a longitude into [-180, 180]. */
export function normaliseLongitude(lng: number): number {
  return unwrapLongitude(lng, 0);
}

/**
 * Builds a closed polygon ring for the main map's viewport outline.
 *
 * Each corner is unwrapped relative to `centreLng` so the ring never jumps the antimeridian.
 * maplibre accepts longitudes outside [-180, 180] and renders them in the correct world copy,
 * so the outline wraps the short way across the date line.
 */
export function buildViewportRing(
  corners: [number, number][],
  centreLng: number
): [number, number][] {
  const ring = corners.map(
    ([lng, lat]) => [unwrapLongitude(lng, centreLng), lat] as [number, number]
  );
  return [...ring, ring[0]];
}

type BoundsFeature =
  | {
      type: 'Feature';
      geometry: { type: 'Point'; coordinates: [number, number] };
      properties: Record<string, never>;
    }
  | {
      type: 'Feature';
      geometry: { type: 'Polygon'; coordinates: [number, number][][] };
      properties: Record<string, never>;
    };

/**
 * Produces the GeoJSON feature drawn on the minimap to show where the main map is looking:
 * a polygon tracing the four screen corners, or a Point when that rectangle would be tiny.
 */
export function getMainMapBoundsFeature(map: Map, mini?: Map): BoundsFeature {
  const center = map.getCenter();
  const centreLng = center.lng;
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  // Collapse to a dot when the projected rectangle on the minimap canvas is under a few pixels.
  if (mini) {
    const pSW = mini.project([unwrapLongitude(sw.lng, centreLng), sw.lat]);
    const pNE = mini.project([unwrapLongitude(ne.lng, centreLng), ne.lat]);
    const pixelWidth = Math.abs(pNE.x - pSW.x);
    const pixelHeight = Math.abs(pNE.y - pSW.y);

    if (Math.max(pixelWidth, pixelHeight) < MIN_RECTANGLE_PX) {
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [normaliseLongitude(centreLng), center.lat]
        },
        properties: {}
      };
    }
  }

  const containerEl = map.getContainer();
  const w = containerEl.clientWidth || 800;
  const h = containerEl.clientHeight || 600;

  const tl = map.unproject([0, 0]);
  const tr = map.unproject([w, 0]);
  const br = map.unproject([w, h]);
  const bl = map.unproject([0, h]);

  const cornersValid =
    tl &&
    tr &&
    br &&
    bl &&
    !isNaN(tl.lng) &&
    !isNaN(tl.lat) &&
    !isNaN(tr.lng) &&
    !isNaN(tr.lat) &&
    !isNaN(br.lng) &&
    !isNaN(br.lat) &&
    !isNaN(bl.lng) &&
    !isNaN(bl.lat);

  // On a globe the screen corners fall off the sphere at low zoom; fall back to the bounds box.
  const corners: [number, number][] = cornersValid
    ? [
        [tl.lng, tl.lat],
        [tr.lng, tr.lat],
        [br.lng, br.lat],
        [bl.lng, bl.lat]
      ]
    : [
        [sw.lng, ne.lat],
        [ne.lng, ne.lat],
        [ne.lng, sw.lat],
        [sw.lng, sw.lat]
      ];

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [buildViewportRing(corners, centreLng)]
    },
    properties: {}
  };
}
