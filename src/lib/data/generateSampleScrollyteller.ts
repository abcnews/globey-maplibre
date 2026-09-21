import { MARKER_NAME } from '../constants.ts';
import type { GlobeJsonBlob, GlobeLayer } from './jsonBlob.ts';
import { encodeMarker, type MarkerConfig, type MarkerLayerOverride } from './marker.ts';

type LngLat = [number, number];

/** Wide Australia/Oceania view used for the opening day/night panels. */
const OVERVIEW_BBOX: LngLat[] = [
  [105, -5],
  [180, -50]
];

/** Fade duration for non-imagery layers, which switch on immediately rather than tracking scroll. */
const IMMEDIATE_FADE_MS = 1000;
const DAY_RASTER_ID = 'bluemarble';
const NIGHT_RASTER_ID = 'blackmarble';

/** Padding (degrees) around a layer's extent, so a single point or thin line isn't framed edge-to-edge. */
const BBOX_PADDING_DEGREES = 2;

/** Axis-aligned, padded NW/SE corners around a set of points, or undefined when there are none. */
const paddedBbox = (points: LngLat[]): LngLat[] | undefined => {
  if (!points.length) return undefined;
  const lngs = points.map(([lng]) => lng);
  const lats = points.map(([, lat]) => lat);
  return [
    [Math.min(...lngs) - BBOX_PADDING_DEGREES, Math.max(...lats) + BBOX_PADDING_DEGREES],
    [Math.max(...lngs) + BBOX_PADDING_DEGREES, Math.min(...lats) - BBOX_PADDING_DEGREES]
  ];
};

/** Points a layer stores itself. GeoJSON kinds store none — those come from `extraPointsById`. */
const storedPointsOf = (layer: GlobeLayer): LngLat[] => {
  if (layer.type === 'image') return layer.coordinates;
  if (layer.type === 'raster') return layer.bounds ?? [];
  if (layer.type === 'icon') return [layer.coords];
  if (layer.type === 'customLabels') return layer.labels.map(({ coords }) => coords);
  return [];
};

/**
 * Imagery (raster/image) and lines (so a `draw` line draws on as you read) track scroll;
 * everything else fades in immediately on arrival. A `LAYER` duration's presence is what makes
 * a layer immediate (see `applyMarkerOverrides`).
 */
const SCROLL_TIED_KINDS: GlobeLayer['type'][] = ['raster', 'image', 'geojsonLines'];

const layerOverride = (layer: GlobeLayer): MarkerLayerOverride =>
  SCROLL_TIED_KINDS.includes(layer.type)
    ? { name: layer.id, state: 'on' }
    : { name: layer.id, state: 'on', duration: IMMEDIATE_FADE_MS };

const panelCopy = (layer: GlobeLayer) => `This panel turns on the "${layer.id}" layer (${layer.type}).`;

/**
 * Builds an ACTO scrollyteller story from a blob. When both NASA rasters exist it opens with a
 * day → night cross-fade, then adds each remaining layer in turn (keeping earlier ones on), so
 * every panel both pans the camera and fades a new layer in. Camera pans are scroll-tied (no `CAM`).
 *
 * `lib` can't fetch GeoJSON (that lives in `features/`), so callers pass GeoJSON extents in via
 * `extraPointsById`; a layer with no known points keeps the previous panel's camera.
 */
export function generateSampleScrollyteller({
  blob,
  extraPointsById = {}
}: {
  blob: GlobeJsonBlob;
  /** Coordinates per layer id, for layers (GeoJSON) whose extent isn't stored on the blob. */
  extraPointsById?: Record<string, LngLat[]>;
}): string {
  const dayRaster = blob.layers.find(({ id }) => id === DAY_RASTER_ID);
  const nightRaster = blob.layers.find(({ id }) => id === NIGHT_RASTER_ID);
  const dayNight = dayRaster && nightRaster ? { dayRaster, nightRaster } : undefined;
  const baseRasters = dayNight ? [dayNight.nightRaster] : [];

  // ---- Day/night opener ----
  const openerPanels: { marker: MarkerConfig; copy: string }[] = dayNight
    ? [
        {
          marker: { bbox: OVERVIEW_BBOX, layers: [layerOverride(dayNight.dayRaster)] },
          copy: 'Welcome to the scrollyteller demo. This panel shows the daytime NASA Blue Marble satellite view.'
        },
        {
          marker: { bbox: OVERVIEW_BBOX, layers: [layerOverride(dayNight.nightRaster)] },
          copy: 'As we scroll, NASA Black Marble fades in to reveal night lights across cities and coastlines.'
        }
      ]
    : [];

  // ---- One panel per remaining layer, accumulating ----
  const featureLayers = blob.layers.filter(({ id }) => !(dayNight && [DAY_RASTER_ID, NIGHT_RASTER_ID].includes(id)));
  const featurePanels = featureLayers.map((layer, index) => {
    const activeLayers = [...baseRasters, ...featureLayers.slice(0, index + 1)];
    const bbox = paddedBbox([...storedPointsOf(layer), ...(extraPointsById[layer.id] ?? [])]);
    const marker: MarkerConfig = {
      ...(bbox && { bbox }),
      layers: activeLayers.map(layerOverride)
    };
    return { marker, copy: panelCopy(layer) };
  });

  const body = [...openerPanels, ...featurePanels]
    .map(({ marker, copy }) => `#mark${encodeMarker(marker)}\n\n${copy}`)
    .join('\n\n');

  return `#scrollytellerNAME${MARKER_NAME}1\n\n${body}\n\n#endscrollyteller\n`;
}
