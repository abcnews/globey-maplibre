import type * as maplibregl from 'maplibre-gl';
import { interpolateZoom } from 'd3-interpolate';
import type { ViewState, FitMode, ZoomPoint } from './types.ts';
import type { DecodedObject } from '../../../lib/marker';

export const WORLD_SIZE_AT_ZOOM_0 = 512;
export const LONGITUDE_SPAN_DEGREES = 360;
export const MERCATOR_SPAN_UNITS = 2 * Math.PI;
export const CALCULATION_EPSILON = 0.0001;
export const GLOBE_FIT_PADDING_PX = -20;
export const MAX_MERCATOR_LAT = 85.0511287798066;

export function latToMercator(lat: number): number {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

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

export function calculateTargetView(
  points: [number, number][],
  width: number,
  height: number,
  mode: FitMode = 'fit'
): ViewState | null {
  if (!points || points.length === 0) return null;

  const { minLng, maxLng, minLat, maxLat, centre } = getBoundingBox(points);

  const deltaLng = Math.abs(maxLng - minLng) || CALCULATION_EPSILON;
  const zoomLng = Math.log2((width * LONGITUDE_SPAN_DEGREES) / (WORLD_SIZE_AT_ZOOM_0 * deltaLng));

  const deltaY = Math.abs(latToMercator(maxLat) - latToMercator(minLat)) || CALCULATION_EPSILON;
  const zoomLat = Math.log2((height * MERCATOR_SPAN_UNITS) / (WORLD_SIZE_AT_ZOOM_0 * deltaY));

  const zoom = mode === 'fit' ? Math.min(zoomLng, zoomLat) : Math.max(zoomLng, zoomLat);

  return { center: centre, zoom };
}

export function calculateGlobeFitZoom(map: maplibregl.Map, coords?: [number, number]): number {
  const container = map.getContainer();
  if (!container) return 0;

  const width = container.clientWidth;
  const height = container.clientHeight;

  const targetDiameterPx = Math.min(width, height) - GLOBE_FIT_PADDING_PX * 2;

  const currentCenter = map.getCenter();
  const currentLat = coords ? coords[1] : currentCenter.lat;
  const latRad = (currentLat * Math.PI) / 180;
  const mercatorScaleCorrection = Math.cos(latRad);

  const requiredWorldCircumferencePx = targetDiameterPx * Math.PI * mercatorScaleCorrection;

  return Math.log2(requiredWorldCircumferencePx / WORLD_SIZE_AT_ZOOM_0);
}

export function isProgrammaticMove(eventData: any): boolean {
  return !!(eventData?.builderInitiated || eventData?.essential);
}

/**
 * Converts a geographic ViewState [lng, lat, zoom] into a Van Wijk & Nuij viewport state [ux, uy, w]
 * where ux, uy are normalized Mercator coordinates in [0, 1] and w is proportional viewport width.
 */
export function latLngZoomToViewport(centre: [number, number], zoom: number): ZoomPoint {
  const [lng, lat] = centre;
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  const yMerc = Math.log(Math.tan(Math.PI / 4 + latRad / 2));

  const ux = (lng + 180) / LONGITUDE_SPAN_DEGREES;
  const uy = 0.5 - yMerc / MERCATOR_SPAN_UNITS;
  const w = Math.pow(2, -zoom);

  return [ux, uy, w];
}

/**
 * Converts a Van Wijk & Nuij viewport state [ux, uy, w] back into a geographic ViewState { center, zoom }.
 */
export function viewportToLatLngZoom(point: ZoomPoint): ViewState {
  const [ux, uy, w] = point;

  // Normalise longitude into [-180, 180]
  let lng = ux * LONGITUDE_SPAN_DEGREES - 180;
  lng = ((((lng + 180) % 360) + 360) % 360) - 180;

  const yMerc = MERCATOR_SPAN_UNITS * (0.5 - uy);
  const latRad = 2 * Math.atan(Math.exp(yMerc)) - Math.PI / 2;
  const lat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, (latRad * 180) / Math.PI));

  const zoom = -Math.log2(Math.max(Number.EPSILON, w));

  return {
    center: [lng, lat],
    zoom
  };
}

/**
 * Resolves a panel's decoded options into an absolute ViewState based on current container dimensions.
 * If the panel does not define geographic view options, it inherits from fallbackView if provided,
 * or defaults to the current map centre and zoom.
 */
export function resolvePanelTargetView(
  map: maplibregl.Map,
  panelData?: DecodedObject,
  mode: FitMode = 'fit',
  fallbackView?: ViewState
): ViewState {
  if (!panelData) {
    return (
      fallbackView || {
        center: [map.getCenter().lng, map.getCenter().lat],
        zoom: map.getZoom()
      }
    );
  }

  if (panelData.fitGlobe) {
    const targetZoom = calculateGlobeFitZoom(map, panelData.coords);
    const centre = panelData.coords || [map.getCenter().lng, map.getCenter().lat];
    return { center: centre, zoom: targetZoom };
  }

  if (panelData.bounds && panelData.bounds.length > 0) {
    const container = map.getContainer();
    const target = calculateTargetView(
      panelData.bounds,
      container.clientWidth,
      container.clientHeight,
      panelData.constrainView ? 'fill' : mode
    );
    if (target) return target;
  }

  if (panelData.coords) {
    return {
      center: panelData.coords,
      zoom: panelData.z ?? (fallbackView ? fallbackView.zoom : map.getZoom())
    };
  }

  if (fallbackView) {
    return {
      center: fallbackView.center,
      zoom: panelData.z ?? fallbackView.zoom
    };
  }

  return {
    center: [map.getCenter().lng, map.getCenter().lat],
    zoom: panelData.z ?? map.getZoom()
  };
}

/**
 * Resolves all panels in sequence, ensuring panels without geographic view options
 * automatically inherit camera positioning from the most recent valid preceding panel.
 */
export function resolveAllPanelViews(
  map: maplibregl.Map,
  panels: Array<{ data?: DecodedObject }>
): ViewState[] {
  let lastGoodView: ViewState | undefined;

  return panels.map(panel => {
    const view = resolvePanelTargetView(map, panel.data, 'fit', lastGoodView);
    if (panel.data && (panel.data.fitGlobe || (panel.data.bounds && panel.data.bounds.length > 0) || panel.data.coords)) {
      lastGoodView = view;
    } else if (!lastGoodView) {
      lastGoodView = view;
    }
    return view;
  });
}

/**
 * Standard cubic ease-in-out curve.
 * Gently accelerates from rest and decelerates smoothly into the target view.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Creates an interpolator function between two ViewStates using the Van Wijk & Nuij algorithm.
 * Handles shortest-path antimeridian wrapping around +/-180 degrees with smooth ease-in-out easing.
 */
export function createZoomInterpolator(
  from: ViewState,
  to: ViewState,
  ease: (t: number) => number = easeInOutCubic,
  viewportWidthPx: number = WORLD_SIZE_AT_ZOOM_0
): (t: number) => ViewState {
  const [ux0, uy0, w0] = latLngZoomToViewport(from.center, from.zoom);
  let [ux1, uy1, w1] = latLngZoomToViewport(to.center, to.zoom);

  // Shortest angular path around the globe
  const dx = ux1 - ux0;
  if (dx > 0.5) {
    ux1 -= 1.0;
  } else if (dx < -0.5) {
    ux1 += 1.0;
  }

  // w is proportional to a single WORLD_SIZE_AT_ZOOM_0-px tile at that zoom, not the
  // actual on-screen viewport (which is usually much wider) -- scale it up to the real
  // container width before using it as a viewport half-extent, or every overlap check
  // undercounts by however much wider than one tile the container actually is.
  const widthScale = viewportWidthPx / WORLD_SIZE_AT_ZOOM_0;

  // The Van Wijk & Nuij path always zooms out to frame both viewports before
  // zooming back in to the target -- dramatic for far-apart locations, but
  // overkill (and visually jarring) when the destination viewport already
  // overlaps the starting one. In that case a straight linear zoom (centre
  // and zoom each eased independently) reads as a simple pan/zoom instead.
  const viewportsOverlap =
    Math.abs(ux1 - ux0) < ((w0 + w1) / 2) * widthScale &&
    Math.abs(uy1 - uy0) < ((w0 + w1) / 2) * widthScale;

  if (viewportsOverlap) {
    return (t: number) => {
      const easedT = ease(Math.max(0, Math.min(1, t)));
      const ux = ux0 + (ux1 - ux0) * easedT;
      const uy = uy0 + (uy1 - uy0) * easedT;
      const zoom = from.zoom + (to.zoom - from.zoom) * easedT;
      return viewportToLatLngZoom([ux, uy, Math.pow(2, -zoom)]);
    };
  }

  const interpolator = interpolateZoom([ux0, uy0, w0], [ux1, uy1, w1]);

  return (t: number) => {
    const easedT = ease(Math.max(0, Math.min(1, t)));
    const point = interpolator(easedT);
    return viewportToLatLngZoom(point as ZoomPoint);
  };
}


