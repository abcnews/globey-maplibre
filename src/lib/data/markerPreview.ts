import { GEOJSON_LAYER_KINDS, isGeoJsonLayer, type GlobeJsonBlob, type GlobeLayer } from './jsonBlob.ts';
import type { MarkerConfig, MarkerLayerOverride } from './marker.ts';

/** Layer kinds a marker's `LAYER<name>` tokens can switch on and off. */
const OVERRIDABLE_KINDS: GlobeLayer['type'][] = [...GEOJSON_LAYER_KINDS, 'icon', 'image', 'raster'];

/**
 * The `LAYER<name>` token matches a layer's builder-facing `name`, falling back to its `id`.
 * The ACTO codec (`src/lib/data/marker.ts`) only allows lowercase `[a-z0-9]` in encoded
 * strings, but `id` is a free-form UUID (may contain hyphens etc) — sanitise it the same
 * way friendly names already are, so an unnamed layer's fallback key stays ACTO-safe.
 * Both the write side (`PropMarkerLayers.svelte`'s `keyFor`) and this read side must apply
 * the exact same sanitisation, or overrides silently stop matching their layer.
 *
 * Every blob layer has an `id`, so this always resolves to a key — the class of bug where a
 * layer kind was simply unaddressable can't recur.
 */
export function layerOverrideKey(layer: { id: string; name?: string }): string {
  return (layer.name ?? layer.id).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function overrideFor(overrides: MarkerLayerOverride[], layer: GlobeLayer): MarkerLayerOverride | undefined {
  const key = layerOverrideKey(layer);
  return overrides.find(o => o.name === key);
}

/**
 * Applies a marker's on/off, colour, camera and base/labels/minimap overrides onto a
 * base blob, producing what the marker should visually look like on `CustomGlobe`,
 * including scroll-tied/immediate animation timing for the camera and per layer.
 *
 * Layer order is preserved: overrides only drop layers and rewrite their fields, so the
 * stack a panel renders is always a subsequence of the master blob's.
 */
export function applyMarkerOverrides(base: GlobeJsonBlob, config: MarkerConfig): GlobeJsonBlob {
  const overrides = config.layers ?? [];

  const layers = base.layers.flatMap((layer): GlobeLayer[] => {
    if (!OVERRIDABLE_KINDS.includes(layer.type)) {
      // Built-in kinds aren't addressable by LAYER tokens; `labels` below handles mapLabels.
      if (layer.type === 'mapLabels' && config.labels === false) return [];
      return [layer];
    }

    const override = overrideFor(overrides, layer);
    // Every overridable layer is off by default — the ACTO spec requires an explicit "on".
    if (override?.state !== 'on') return [];

    // Only the *presence* of a duration matters: the actual fade length always comes from
    // the panel-level `animationDuration` (set from `CAM` below), not a per-layer number.
    const withClock = {
      ...layer,
      animationClock: override.duration !== undefined ? ('immediate' as const) : ('scroll' as const)
    };

    if (!isGeoJsonLayer(withClock) || !override.colour) return [withClock];

    return [
      {
        ...withClock,
        colourMode: 'basic',
        // `basicType: undefined` is load-bearing: `resolveSchemeColour` treats it the same
        // as 'custom' and uses the hex. Writing 'normal' here would discard the override.
        colourConfig: { ...withClock.colourConfig, basic: `#${override.colour}`, basicType: undefined }
      }
    ];
  });

  const map = { ...base.map };

  // Camera: presence of `cam` means an immediate fly-to over that duration on arrival;
  // absence means scroll-tied tracking, matching REFACTOR.md's CAM<duration>ms spec.
  if (config.cam !== undefined) {
    map.animationMode = 'immediate';
    map.animationDuration = config.cam;
  } else {
    map.animationMode = 'scroll';
  }

  if (config.bbox && config.bbox.length > 0) {
    map.bounds = config.bbox;
  }

  // Fit-globe takes priority over BBOX (matches PanZoomHandler's own precedence), so drop
  // bounds here too rather than leaving a stale BBOX sitting unused in the preview state.
  if (config.fitGlobe !== undefined) {
    map.fitGlobe = config.fitGlobe;
    if (config.fitGlobe) {
      map.bounds = [];
    }
  }

  // Fit vs Fill for the BBOX zoom calculation — only meaningful alongside bbox/bounds,
  // but harmless to apply unconditionally since it's ignored otherwise.
  if (config.constrainView !== undefined) {
    map.constrainView = config.constrainView;
  }

  // The globe's rotation while fit-globe is active comes from `coords`, not from BBOX
  // (which has no extents to derive a centre from) — apply the captured centre so the
  // globe faces the side the marker was set up to show, not the master config's default.
  if (config.center) {
    map.coords = config.center;
  }

  // The blob only understands 'street' | 'dark' — 'satellite' comes from a dark raster
  // layer being present, not a base flag, so it can't be applied here.
  if (config.base === 'street' || config.base === 'dark') {
    map.base = config.base;
  }

  if (config.minimap !== undefined) {
    map.minimap = config.minimap
      ? { enabled: true, bounds: base.map.minimap?.bounds ?? [] }
      : base.map.minimap
        ? { ...base.map.minimap, enabled: false }
        : undefined;
  }

  return { ...base, map, layers };
}
