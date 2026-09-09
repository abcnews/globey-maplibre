# Whole-layer fades

How raster, image, and icon layers cross-fade between scrollyteller panels. GeoJSON layers fade individually per feature (see [`../GeoJson/README.md`](../GeoJson/README.md)). MapVector (the base street map) does not fade; it switches instantly at panel boundaries.

---

## How it works

Each item draws one MapLibre layer (one per raster tile source, georeferenced image, or icon symbol):

1. **Calculate opacity per panel**: normal opacity when present, `0` when absent.
2. **Add the layer once at load**: layer opacity uses an interpolation expression reading MapLibre's `global-state`:
   `['interpolate', ['linear'], ['number', ['global-state', posKey], 0], 0, op0, 1, op1, ...]`
   The key is determined by the item's `animationClock`:
   - `'tweenPosScroll'` (default): scrubs with scroll position.
   - `'tweenPosImmediate'`: animates on arrival at the panel marker.
3. **Update global state each frame**: [`CustomGlobe.svelte`](../../CustomGlobe/CustomGlobe.svelte) updates both clock uniforms each animation frame. Every layer automatically reflects its chosen clock without layer reloads.

Layers are never added or removed during scrolling. Items missing from a panel fade to `opacity: 0`.

---

## Collection handlers

`MapRastersHandler`, `ImageSourcesHandler`, and `IconsHandler` share the same pattern:

1. Receive `perPanel: Config[][]` from `CustomGlobe` (one config array per panel).
2. Call `buildTweenedLayerEntries` ([`./tweenedLayers.ts`](./tweenedLayers.ts)) to build unique entries across all panels:
   - `key`: unique identifier (`url`, `id || url`, or `id || cmid`).
   - `representative`: the item config from its first appearance (used for type, URL, and z-index).
   - `opacityStops`: target opacity in each panel (`0` when absent).
   - `coordStops`: coordinate positions across panels (snaps at boundaries for images and icons).
   - `sig`: stable key for Svelte's `{#each}` block to prevent remounting.
3. Render one leaf component per unique entry.

The satellite base map is handled by `CustomGlobe`, which folds the tile layer into the raster list.

---

## Leaf handlers

`MapRasterHandler`, `ImageSourceHandler`, and `IconHandler`:

- Add their source and layer once on mount. The layer is added via `addFadingLayer` ([`./tweenedLayers.ts`](./tweenedLayers.ts)), passing `tweenStopsExpression(opacityStops, posKey)`.
- Images and icons update coordinates on panel changes using `pickStop(coordStops, tween.fromPanel, ...)`. Coordinates snap at panel boundaries rather than animating.
- Clean up sources and layers on unmount.

---

## Guidelines

- **Keep opacity expressions pure**: only reference `['global-state', key]` and numeric literals so MapLibre compiles them directly into shader uniforms.
- **Do not modify layers on scroll**: avoid calling `map.addLayer`, `map.removeLayer`, or `source.setData` on scroll frames to prevent layer rebuilds and flashing.
- **Snap coordinates across panels**: coordinates update on `fromPanel` changes, not on continuous easing values.
- **Global state manages reduced motion and builder mode**: `CustomGlobe` handles reduced motion and fallback states in global state; leaf handlers do not need bespoke mode logic.

---

## Adding a new whole-layer feature

1. **Schema**: Add the configuration schema in [`../../../lib/marker/schema.ts`](../../../lib/marker/schema.ts).
2. **Collection handler**: Model after `IconsHandler.svelte` using `buildTweenedLayerEntries`.
3. **Leaf handler**: Model after `IconHandler.svelte` or `MapRasterHandler.svelte` using `addFadingLayer`.
4. **Mounting**: Add the handler to [`CustomGlobe.svelte`](../../CustomGlobe/CustomGlobe.svelte), passing `perPanel={perPanel(d => d.myFeature ?? [])}`.
5. **Builder modal**: Add configuration UI in `Builder*ConfigModal.svelte` if applicable.
