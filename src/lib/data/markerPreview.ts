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
 * Overlays a marker's on/off, colour, camera and base/labels/minimap overrides onto a
 * base DecodedObject, producing what the marker should visually look like on `CustomGlobe`.
 * Deliberately does not simulate scroll-tied/immediate animation timing — only final state.
 */
export function applyMarkerOverrides(base: DecodedObject, config: MarkerConfig): DecodedObject {
  const overrides = config.layers ?? [];
  const result: DecodedObject = { ...base };

  result.geoJson = filterLayers<GeoJsonConfig>(base.geoJson ?? [], overrides).map(layer => {
    const colour = overrideFor(overrides, layer)?.colour;
    if (!colour) return layer;
    return {
      ...layer,
      colourMode: 'basic',
      colourConfig: { ...layer.colourConfig, basic: `#${colour}`, basicType: undefined }
    };
  });

  result.icons = filterLayers<IconConfig>(base.icons ?? [], overrides);
  result.imageSources = filterLayers<ImageSourceConfig>(base.imageSources ?? [], overrides);
  result.rasterLayers = filterLayers<RasterLayerConfig>(base.rasterLayers ?? [], overrides);

  if (config.bbox && config.bbox.length > 0) {
    result.bounds = config.bbox;
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
