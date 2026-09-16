import type { DecodedObject, GeoJsonConfig, IconConfig, ImageSourceConfig, RasterLayerConfig } from '../marker/types.ts';
import type { MarkerConfig, MarkerLayerOverride } from './marker.ts';

/** Anything in a `DecodedObject`'s per-layer arrays carries a `name` (builder slug) and/or `id`. */
type NamedLayerConfig = { id?: string; name?: string };

/** The `LAYER<name>` token matches a layer's builder-facing `name`, falling back to its `id`. */
function overrideFor(overrides: MarkerLayerOverride[], layer: NamedLayerConfig): MarkerLayerOverride | undefined {
  const key = layer.name ?? layer.id;
  return overrides.find(o => o.name === key);
}

/**
 * Applies a marker's layer on/off + colour overrides to one of DecodedObject's
 * per-layer arrays. Layers with no matching "on" override are dropped — the
 * ACTO spec treats every layer as off by default.
 */
function filterLayers<T extends NamedLayerConfig>(items: T[], overrides: MarkerLayerOverride[]): T[] {
  return items.filter(item => overrideFor(overrides, item)?.state === 'on');
}

/**
 * Stamps a layer's `animationClock` from its override's `duration` field. Only presence
 * of a duration matters now, not its value — the actual immediate-fade duration always
 * comes from the shared panel-level clock (`animationDuration`, set from `config.cam`
 * below), not a per-layer number. See REFACTOR.md.
 */
function withClock<T extends NamedLayerConfig>(items: T[], overrides: MarkerLayerOverride[]): T[] {
  return items.map(item => ({
    ...item,
    animationClock: overrideFor(overrides, item)?.duration !== undefined ? 'immediate' : 'scroll'
  }));
}

/**
 * Overlays a marker's on/off, colour, camera and base/labels/minimap overrides onto a
 * base DecodedObject, producing what the marker should visually look like on `CustomGlobe`,
 * including scroll-tied/immediate animation timing for the camera and per layer.
 */
export function applyMarkerOverrides(base: DecodedObject, config: MarkerConfig): DecodedObject {
  const overrides = config.layers ?? [];
  const result: DecodedObject = { ...base };

  result.geoJson = withClock(
    filterLayers<GeoJsonConfig>(base.geoJson ?? [], overrides).map(layer => {
      const colour = overrideFor(overrides, layer)?.colour;
      if (!colour) return layer;
      return {
        ...layer,
        colourMode: 'basic',
        colourConfig: { ...layer.colourConfig, basic: `#${colour}`, basicType: undefined }
      };
    }),
    overrides
  );

  result.icons = withClock(filterLayers<IconConfig>(base.icons ?? [], overrides), overrides);
  result.imageSources = withClock(filterLayers<ImageSourceConfig>(base.imageSources ?? [], overrides), overrides);
  result.rasterLayers = withClock(filterLayers<RasterLayerConfig>(base.rasterLayers ?? [], overrides), overrides);

  // Camera: presence of `cam` means an immediate fly-to over that duration on arrival;
  // absence means scroll-tied tracking, matching REFACTOR.md's CAM<duration>ms spec.
  if (config.cam !== undefined) {
    result.animationMode = 'immediate';
    result.animationDuration = config.cam;
  } else {
    result.animationMode = 'scroll';
  }

  if (config.bbox && config.bbox.length > 0) {
    result.bounds = config.bbox;
  }

  // Fit-globe takes priority over BBOX (matches PanZoomHandler's own precedence), so drop
  // bounds here too rather than leaving a stale BBOX sitting unused in the preview state.
  if (config.fitGlobe !== undefined) {
    result.fitGlobe = config.fitGlobe;
    if (config.fitGlobe) {
      result.bounds = [];
    }
  }

  // The globe's rotation while fit-globe is active comes from `coords`, not from BBOX
  // (which has no extents to derive a centre from) — apply the captured centre so the
  // globe faces the side the marker was set up to show, not the master config's default.
  if (config.center) {
    result.coords = config.center;
  }

  // DecodedObject only understands 'street' | 'dark' — 'satellite' comes from a dark
  // raster layer being present, not a base flag, so it can't be applied here.
  if (config.base === 'street' || config.base === 'dark') {
    result.base = config.base;
  }

  if (config.labels !== undefined) {
    result.mapLabels = config.labels ? base.mapLabels : undefined;
  }

  if (config.minimap !== undefined) {
    result.minimap = config.minimap
      ? { enabled: true, bounds: base.minimap?.bounds ?? [] }
      : base.minimap
        ? { ...base.minimap, enabled: false }
        : undefined;
  }

  return result;
}
