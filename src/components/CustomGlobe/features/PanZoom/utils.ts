import type { maplibregl } from '../../mapLibre/index';
import type { ViewState, FitMode } from './types';

/** 
 * MapLibre uses a standard web Mercator tile size. 
 * At zoom level 0, the entire world is contained in a single 512x512 pixel square. 
 */
export const WORLD_SIZE_AT_ZOOM_0 = 512;

/** The full range of longitude in degrees. */
export const LONGITUDE_SPAN_DEGREES = 360;

/** 
 * The full vertical range of the Mercator projection is 2π units. 
 * This corresponds to the projected height of the world map.
 */
export const MERCATOR_SPAN_UNITS = 2 * Math.PI;

/** 
 * Small buffer to ensure we don't divide by zero if points are identical. 
 */
export const CALCULATION_EPSILON = 0.0001;

/** 
 * Visual tweak (in pixels) to ensure the globe circle fits nicely within 
 * its container without being perfectly flush with the edges.
 */
export const GLOBE_FIT_PADDING_PX = -20;

/**
 * Calculates the Mercator Y coordinate for a given latitude.
 *
 * @param lat - Latitude in degrees.
 * @returns The vertical position in Mercator units.
 */
export function latToMercator(lat: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

/**
 * Determines the bounding box for an array of geographic points.
 *
 * @param points - Array of [longitude, latitude] pairs.
 * @returns Object containing the min/max extents and the centre point.
 */
export function getBoundingBox(points: [number, number][]) {
  const lats = points.map(p => p[1]);
  const lngs = points.map(p => p[0]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
    centre: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number]
  };
}

/**
 * Calculates the precise centre and zoom for a set of points to fit or fill a container.
 *
 * @param points - Array of [longitude, latitude] coordinates.
 * @param width - Container width in pixels.
 * @param height - Container height in pixels.
 * @param mode - 'fit' to ensure all points are visible, 'fill' to ensure the screen is covered.
 * @returns The calculated centre and zoom level.
 */
export function calculateTargetView(
  points: [number, number][],
  width: number,
  height: number,
  mode: FitMode = 'fit'
): ViewState | null {
  if (!points || points.length === 0) return null;

  const { minLng, maxLng, minLat, maxLat, centre } = getBoundingBox(points);

  // Horizontal span calculation:
  // zoom = log2( (PixelsAvailable * TotalDegreesInWorld) / (PixelsAtZoom0 * DeltaDegrees) )
  const deltaLng = Math.abs(maxLng - minLng) || CALCULATION_EPSILON;
  const zoomLng = Math.log2((width * LONGITUDE_SPAN_DEGREES) / (WORLD_SIZE_AT_ZOOM_0 * deltaLng));

  // Vertical span calculation using Mercator units:
  // zoom = log2( (PixelsAvailable * TotalMercatorUnits) / (PixelsAtZoom0 * DeltaMercatorUnits) )
  const deltaY = Math.abs(latToMercator(maxLat) - latToMercator(minLat)) || CALCULATION_EPSILON;
  const zoomLat = Math.log2((height * MERCATOR_SPAN_UNITS) / (WORLD_SIZE_AT_ZOOM_0 * deltaY));

  // Choose zoom based on mode: 'fit' shrinks to show all, 'fill' grows to cover screen
  const zoom = mode === 'fit' ? Math.min(zoomLng, zoomLat) : Math.max(zoomLng, zoomLat);

  return { center: centre, zoom };
}

/**
 * Calculates the required zoom level to fit the entire globe to the current container.
 *
 * @param map - The map instance.
 * @param coords - The focal point coordinates [longitude, latitude].
 * @returns The calculated zoom level.
 */
export function calculateGlobeFitZoom(map: maplibregl.Map, coords?: [number, number]): number {
  const container = map.getContainer();
  if (!container) return 0;

  const width = container.clientWidth;
  const height = container.clientHeight;

  // Determine how big (in pixels) we want the globe diameter to be on screen.
  const targetDiameterPx = Math.min(width, height) - GLOBE_FIT_PADDING_PX * 2;

  // MapLibre's zoom logic is based on a Mercator projection, which stretches
  // the world as you move away from the equator by a factor of 1/cos(latitude).
  // To keep the globe a constant physical size, we must shrink our target
  // dimensions by cos(latitude) to counteract that internal magnification.
  const currentCenter = map.getCenter();
  const currentLat = coords ? coords[1] : currentCenter.lat;
  const latRad = (currentLat * Math.PI) / 180;
  const mercatorScaleCorrection = Math.cos(latRad);

  // Calculate the necessary world circumference (in pixels) to achieve
  // our target diameter. On a sphere, Circumference = Diameter * PI.
  const requiredWorldCircumferencePx = targetDiameterPx * Math.PI * mercatorScaleCorrection;

  // MapLibre defines Zoom 0 as a world circumference of 512px.
  // We use Math.log2 to convert that pixel growth back into a linear zoom level 'z'.
  return Math.log2(requiredWorldCircumferencePx / WORLD_SIZE_AT_ZOOM_0);
}

/**
 * Checks if a map interaction was triggered by a user or by code.
 *
 * @param eventData - Event data from MapLibre.
 * @returns True if the move was initiated by the builder or programmed logic.
 */
export function isProgrammaticMove(eventData: any): boolean {
  return !!(eventData?.builderInitiated || eventData?.essential);
}
