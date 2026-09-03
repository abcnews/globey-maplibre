# Whole-layer fades

How the raster, image and icon features fade in and out between scrollyteller
panels. GeoJSON does the same thing but per feature — see
[`../GeoJson/README.md`](../GeoJson/README.md). MapVector (the street base map)
does not fade; it still switches at the panel boundary.

---

## The idea

Every one of these features draws **one MapLibre layer per item** (one raster
layer per tile URL, one raster layer per georeferenced image, one symbol layer
per icon). To fade it we:

1. Look at every panel in the story and decide the layer's opacity in each one:
   its normal opacity where the item is present, `0` where it is absent.
2. Add the layer **once**, at load, with an opacity that reads the shared
   `tweenPos` value: `['interpolate', ['linear'], ['number', ['global-state',
   'tweenPos'], 0], 0, op0, 1, op1, …]` — one stop per panel.
3. `CustomGlobe` writes `tweenPos` once per animation frame
   (`fromPanel + easedT`). Every layer's opacity follows it.

The layer is never removed or re-added while you scroll. An item that is missing
from a panel just has `opacity: 0` at that stop, so it fades instead of popping.
Per-frame cost is one `setGlobalStateProperty` call, no matter how many layers.

`tweenPos` and the expression builder live in
[`../Tween/utils.ts`](../Tween/utils.ts):
`MAPLIBRE_TWEEN_STATE_KEY` and `tweenStopsExpression(perPanelValues, posKey?)`.

---

## How a collection handler works

`MapRastersHandler`, `ImageSourcesHandler` and `IconsHandler` are near-identical.
`CustomGlobe` hands each one a `perPanel: Config[][]` — one config array per panel
(one element on the builder / static path). The handler calls
`buildTweenedLayerEntries` ([`./tweenedLayers.ts`](./tweenedLayers.ts)) and
renders one leaf handler per item:

```svelte
const entries = $derived(
  buildTweenedLayerEntries(perPanel, { keyOf, opacityOf?, coordsOf? })
);
```

`buildTweenedLayerEntries` produces one entry per distinct item (first-seen
order):

- `key` — from `keyOf` (`url` for rasters, `id || url` for images,
  `id || cmid` for icons).
- `representative` — the item's config in the first panel that has it (used for
  layer type / URL / z-index).
- `opacityStops` — `opacityOf` where the item is present, `0` where absent.
- `coordStops` — the position per panel (images and icons; omit `coordsOf` for
  rasters), `null` where absent.
- `sig` — the `{#each}` key. Stable on the scrollyteller path, so the leaf handler
  is never remounted and its layer is added once. A builder edit changes it, so
  the layer is rebuilt — one flash, on edit only.

**The satellite base map** is not a handler concern. It comes from the user's
`base` + `satelliteVariant` choice, so `CustomGlobe` folds it into the raster
`perPanel` list (a `panelRasters` helper right in `CustomGlobe`, with the tile URL
written out in full). Its z-index is the normal raster z-index — during a
street→satellite switch the street base map still pops at the boundary and the
satellite tiles fade over whatever is behind them.

## How a leaf handler works

`MapRasterHandler`, `ImageSourceHandler` and `IconHandler` each:

- add their source and layer once, in an effect whose cleanup only runs on
  unmount. The layer goes in with `addFadingLayer` ([`./tweenedLayers.ts`](./tweenedLayers.ts)),
  which sets the opacity paint key to `tweenStopsExpression(opacityStops)` — `[1]`
  (one stop) collapses to a plain `1`, so the builder path is unchanged;
- (images and icons) update position from `pickStop(coordStops, tween.fromPanel, …)`
  in a separate effect. `fromPanel` only changes when you cross a panel boundary,
  so the position snaps there — it does not glide.

Their source setup stays separate — raster tiles, an image URL with four corner
coordinates, and a geojson point with an async sprite-atlas load are genuinely
different. Only the shared tween wiring is factored out.

---

## Rules

- **The opacity expression must stay pure.** Only `['global-state', 'tweenPos']`
  and literal numbers. No `['get', …]` or `['feature-state', …]` — those turn the
  shader uniform into per-feature work.
- **Do not add, remove, or `setData` a layer in response to scroll.** That
  re-tessellates and flashes. Fades are the `tweenPos` uniform only.
- **Position snaps, it does not tween.** Read it from `coordStops[fromPanel]` in
  an effect that depends on `fromPanel`, never on `easedT`.
- **Reduced motion, immediate mode, builder** — all handled by the single
  `tweenPos` write in `CustomGlobe`. Leaf handlers carry no mode logic. Under
  reduced motion `tweenPos` holds on the current panel and switches when the next
  one triggers — no fade.

---

## Adding a new whole-layer feature

1. **Schema** — add the config shape to
   [`../../../lib/marker/schema.ts`](../../../lib/marker/schema.ts).
2. **Collection handler** — copy `IconsHandler.svelte`. Change the `keyOf` /
   `opacityOf` / `coordsOf` passed to `buildTweenedLayerEntries`.
3. **Leaf handler** — copy `IconHandler.svelte` or `MapRasterHandler.svelte`. Add
   the source once; add the layer with `addFadingLayer`.
4. **Mount it** in [`../../CustomGlobe/CustomGlobe.svelte`](../../CustomGlobe/CustomGlobe.svelte),
   passing `perPanel={perPanel(d => d.myFeature ?? [])}`.
5. **Builder UI** — add a `Builder*ConfigModal.svelte` if the feature is
   user-configurable.

If a feature needs per-feature values (not one value for the whole layer), use the
GeoJSON class-layer approach instead — see [`../GeoJson/README.md`](../GeoJson/README.md).
