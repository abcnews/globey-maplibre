# Globey architecture notes

## Keeping this file in sync

This is an index, not documentation — one or two lines per entry, pointing at files, not
explaining them. When a change adds a non-obvious data flow, gotcha, or contract between
components, add/edit an entry here in the same turn. Skip routine fixes.

## Layer data flow

**One representation.** `GlobeJsonBlob` (`src/lib/data/jsonBlob.ts`, Zod, stored in `src/lib/data/blobStore.ts`) is the internal *and* runtime shape, from the Builder through the feature registry to every MapLibre handler. There is no adapter and no second schema — `DecodedObject`, `markerSchema`, `src/lib/marker/` and `blobAdapter.ts` are gone.

- `blob.layers: GlobeLayer[]` is a single discriminated union (`type` = the feature `kind`). **Array order is stacking order**, index 0 at the bottom. Nothing stores a z-index.
- `src/lib/data/stack.ts` derives one at the render boundary: `stackLayers(blob)` → `Stacked<GlobeLayer>[]` (`layer & { zIndex }`), then `layersOfKind` / `singletonOfKind`. `moveLayer()` is the one reorder primitive. Don't reintroduce a persisted `zIndex` field, and don't compute a z-index at MapLibre add-time — the derived one is authoritative.
- Every layer has one required, unique, user-editable `id` (`/^[a-z0-9]+$/`, uniqueness via `.refine()` on `globeJsonBlobSchema.layers`) — there is no `name`. It is the MapLibre key, the Builder row title and the marker `LAYER<id>` token (`layerOverrideKey()`, `markerPreview.ts`). Renames go through `updateLayer(draft, oldId, data)`; id-keyed renderers remount under the new MapLibre ids. `handleCloseLayerModal()` reverts an empty/duplicate id; `addLayer()` re-rolls a colliding one.
- `src/lib/data/layerHelpers.ts` holds the small shared bits that outlived the codec: `isValidUrl`, `DEFAULT_MAP_LABELS`, `MAP_LABEL_FLAG_KEYS`/`hasMapLabels` (which enumerates the flag keys rather than `Object.values`, so a truthy `id` can't read as "has labels").
- Panel-level camera state lives on `blob.map` (`animationMode`, `animationDuration`, `coords`, `bounds`, `z`, `fitGlobe`, `constrainView`) — `resolvePanelTargetView()` (`PanZoom/utils.ts`) takes a `MapDefaults`, not a whole blob.
- `rasterLayerSchema.bounds` stores the same TL/TR/BR/BL 4-corner format as `imageLayerSchema.coordinates` (optional, unset = whole world), but MapLibre's native raster source `bounds` is axis-aligned `[west, south, east, north]` — `MapRasterHandler.svelte` converts by taking min/max lng/lat across the 4 corners at `addSource()` time, discarding any implied rotation. Unlike ImageSource's `setCoordinates()`, raster sources have no live bounds update, so a change forces a source remove/re-add (same as `url`/`maxZoom`/`tileSize` changes already do).
- `mapLabelsLayerSchema.enabled` is legacy: the Builder now deletes the layer outright rather than writing `enabled: false`, but `MapVectorHandler` still honours `false` for blobs that predate that.

## Layer feature registry

`src/components/features/` — each layer kind (GeoJsonAreas, GeoJsonLines, GeoJsonPoints, Icon, ImageSource, MapRaster, MapLabels, CustomLabels, MapVector) is a self-contained `LayerFeatureDefinition` (see `types.ts`), registered in `src/components/features/index.ts` (`layerFeatureRegistry`). See `src/components/features/README.md` for the template when adding a new one.

- A feature declares only what's kind-specific: `kind`, `label`, `icon`, `isMultiItem`, `createDefault`, optional `isValid`/`canAdd`/`buttons`/`interactivePlacement`/`ConfigModal`/`LayerRenderer`/`coordsOf`. Add/update/delete/reorder are **not** on the interface — they're generic array ops in `src/components/features/utils/layerOps.ts` (`addLayer`, `updateLayer`, `deleteLayer`, `moveLayerTo`, `findLayer`), applied by the Builder. Don't add a per-feature `add`/`delete`/`setZIndex` back.
- The layer-list row is built generically by `describeLayer()`, titled by `layer.id` — don't recompute clever names from other fields. `canAddFeature()` handles the singleton rule from `isMultiItem`; a feature's own `canAdd` is an extra condition on top, not a replacement.
- `layerAddMenuRegistry` is derived from `layerFeatureRegistry` (plus `highlightFeaturesMenuItem` after GeoJsonPoints) — adding a feature to the registry is enough to get it into the Add menu.
- Code shared between features lives in `features/utils/` (`layerOps.ts`, `buttonHelpers.ts`, `LayerSettingsFields.svelte`, `geojson/`); folders directly under `features/` are features only.
- Buttons come from `utils/buttonHelpers.ts` (`createEditButton`, `createDeleteButton`, `createGoToButton`) or a per-feature `buttons` factory.
- `createGoToButton` flies/fits the map to a layer item via `getTarget(item)`, which resolves either a `{ type: 'point' }` or `{ type: 'bounds' }` `GoToTarget` — sync for Icon/ImageSource/MapRaster (they already store `coords`/`coordinates`/`bounds`); the three GeoJSON kinds have no stored bounds at all and re-fetches (`fetchGeoJsonData` + `getGeoJsonCoordinatePairs`, `utils/geojson/data.ts`, via `geoJsonLayerButtons` in `utils/geojson/feature.ts`) and recomputes on every click. Only shown when the item actually has usable location data (e.g. MapRaster's optional `bounds` unset = whole world → button omitted). Bounds arrays get axis-aligned via `getBoundingBox()` (`PanZoom/utils.ts`) before `fitBounds` — same reduction `MapRasterHandler.svelte` uses for its own source `bounds`.
- `LayerSettingsFields.svelte` (`src/components/features/utils/`) is a generic, bindable `animationClock`/`id` field pair (reads `jsonBlob` to flag duplicate ids) (two fieldsets, no `<Modal>` wrapper) embedded directly inside each of the shared GeoJSON modal (`utils/geojson/BuilderGeoJsonModal.svelte`)/ImageSource/MapRaster/Icon's `ConfigModal` — there is no longer a separate "clock" propList button/modal (`createClockButton`/`BuilderLayerClockConfigModal.svelte` were removed); editing a layer's timing and id is folded into its own config modal, both on create (since `addLayer()` opens `ConfigModal` immediately after `createDefault()`) and on edit. Each host modal binds it to wherever that modal already tracks its draft (`config.x` directly for the two direct-bind modals, `draftConfig.x` for GeoJSON, local `$state` vars for ImageSource/Icon) and is responsible for copying those fields onto `config` in its own save/commit step — `LayerSettingsFields` itself never touches `config`.

## Modals

All Builder config modals wrap `@abcnews/components-builder`'s `Modal` (native `<dialog>`, opens/closes itself, `footerChildren` snippet for Save/Cancel). Pattern: draft `$state` seeded via `untrack($state.snapshot(config))`, mutate the draft, commit onto the bindable `config` prop in a `handleSave()`, call `onclose?.()`.

Two ways a modal gets opened from `Builder.layers.svelte`:
- Per-item edit: `editingItem` state + `feature.ConfigModal`.
- Add-menu custom modal: `activeCustomModal` / `customModalOptions`.

`handleCloseLayerModal()` commits via `updateLayer()`, or deletes the draft when `feature.isValid` rejects it — reuse it rather than writing new commit logic. `feature.isValid` is the only validity gate now that the codec's encode-time filters are gone.

## Top navigation / mode routing

`Builder.svelte` routes between `Builder.firstrun.svelte` (New map), `Builder.layers.svelte` (Layers, internal mode id still `'layout'`), `Builder.markers.svelte` (Markers) and `Builder.pastedScrollyteller.svelte` (Preview) purely by reading `window.location.hash`: starts with `new` → New map, `mark` → Markers, `paste` → Preview, else Layers. No separate mode flag — the hash is the single source of truth (`!hasBlob` also forces New map regardless of hash, since Firstrun requires no active blob). `BuilderTopBar.svelte` is the single full-width control (rendered once, above all four mode components — they no longer render their own switcher) with four numbered, arrow-shaped step buttons; Markers/Preview are disabled while `!hasBlob`, New map/Layers are always enabled. `Builder.svelte`'s `setMode()` confirms before navigating to New map while a blob is active (the old "Exit session" behaviour), and an `$effect` forces the hash to New map whenever there's no blob, so a stale `#mark`/`#paste` hash from a previous session can't strand a newly created/restored blob on the wrong step and so New map's step is the one highlighted while Firstrun shows.

`Builder.svelte` also owns a single `map = $state<MapLibreMap>()`, passed down as a bindable prop (`bind:map`) to whichever of `Builder.layers.svelte`/`Builder.markers.svelte` is mounted (each still owns its own `CustomGlobe` instance and writes into `map` via `onLoad`, just as a prop now instead of local `$state`) — this lets `BuilderTopBar`'s right-hand location search (reusing `src/components/shared/GeoSearch`, same pattern as `PropMarkerPosition.svelte`'s own search) drive whichever map is currently active, via `safeFlyTo()` (`Builder/utils.ts`) so a search-driven pan in Layers mode persists into `jsonBlob.map` through the existing `moveend`/`builderInitiated` listener the same as a manual drag.

## Marker Mode

- ACTO marker codec: `src/lib/data/marker.ts` (`encodeMarker`/`decodeMarker`/`MarkerConfig`) — distinct from `src/lib/marker/` (whole-page hash-codec above). Token spec (BBOX/CAM/FITGLOBE/CENTER/FILL/LAYER/BASE/LABELS/MINIMAP) is in `REFACTOR.md`.
- A marker's BBOX has its own Fit/Fill toggle (`MarkerConfig.constrainView`, `FILL<on|off>` token) — same `constrainView` field/`'fit'|'fill'` mode the Layout Mode bounds branch of `resolvePanelTargetView` (`src/components/features/PanZoom/utils.ts`) already used, just not previously exposed in Marker Mode's `PropMarkerPosition.svelte`. Only meaningful alongside `bbox`, not `fitGlobe` — the two positioning modes are mutually exclusive per marker.
- `decodeMarker(raw: string)` expects a raw string; `markerConfigFromParsed(parsed)` expects an already `acto()`-parsed object (what `loadScrollyteller`/`parsePastedContent` panel data actually is) — passing a parsed object to `decodeMarker` breaks.
- Markers live only in `window.location.hash`, never persisted. `Builder.markers.svelte` seeds `markerConfig` synchronously at setup, not `onMount` (avoids the hash-sync `$effect` stomping a real marker).
- `MarkerAdmin` prefix must be `'#'` not `'#mark'` (our hash already starts with `mark`).
- `applyMarkerOverrides()` (`src/lib/data/markerPreview.ts`) is the single "blob + marker → panel blob" function — one pass over `base.layers` that drops un-switched-on layers, stamps `animationClock` and rewrites GeoJson colour, preserving stack order, shared by Builder preview and the runtime below — it also sets animation timing (`animationMode`/`animationDuration` from `CAM`, per-layer `animationClock` from a `LAYER` duration's presence/absence only, not its value — see `TweenController`).

## Scrollyteller / static runtime

`src/index.ts` (CM bootstrap) resolves each mount's CMID via `getMountCmid()` (`src/lib/mountCmid.ts`) and loads the blob via `loadGlobeJsonBlobByCmid()` (`src/lib/data/loadBlobByCmid.ts`, shared with `Builder.firstrun.svelte`).

- `ScrollytellerGlobe.svelte` takes `jsonBlob` + `panels: PanelDefinition<Record<string, any>>[]` (parsed marker objects) and derives one `GlobeJsonBlob` per panel itself. `CustomGlobe` takes `options: GlobeJsonBlob` and stacks each panel once (`perPanelStacked`) for every handler to read.
- `#staticglobey` mount = the real "iframe mode" (`CustomGlobeIframe.svelte` was dead, deleted).
- `Builder.pastedScrollyteller.svelte` (`#paste` hash, reachable via `BuilderTopBar`'s "Preview scrollyteller" step) is the dev paste tool, using the live `jsonBlob` store via `ScrollytellerGlobe` + `parsePastedContent.ts`. The old `markerSchema`-based `PastedScrollytellerGlobe` is deleted — stories published in the pre-blob format no longer render.

## GeoJson cross-panel fades

GeoJSON is three kinds (`geojsonAreas`/`geojsonLines`/`geojsonPoints`) sharing `features/utils/geojson/` — see `src/components/features/README.md` (Shared code). Use `isGeoJsonLayer()`/`GEOJSON_LAYER_KINDS` (`jsonBlob.ts`) wherever all three apply.


Fading layer kinds (raster/image/icon/geojson) are all mounted by `LayerManager.svelte` (`features/layers/`), which `CustomGlobe` passes `perPanelStacked` (all panels, not just current). It runs `buildTweenedLayerEntries()` (`tweenedLayers.ts`) per registered feature with a `LayerRenderer` and mounts one renderer per layer id with `LayerRendererProps` (`types.ts`); entries stay mounted with an `opacityStops` array tweened via MapLibre `global-state`. A new fading kind just sets `LayerRenderer` (+ `coordsOf`) on its feature — no `CustomGlobe` change. Singletons (MapVector/MapLabels/CustomLabels) have no `LayerRenderer` and stay mounted directly in `CustomGlobe`.
- GeoJson colour also cross-fades this way: `TweenedLayerEntry.configStops` (each panel's own config, threaded through each `GeoJson*Handler` to `RenderArea`/`RenderLine`/`RenderPoint`) feeds `buildTweenedColourExpression()` (`GeoJson/utils.ts`), which tweens between panels' literal colours in `basic` mode only — `scale`/`simple` modes are data-driven expressions with no single colour to interpolate, so those fall back to the current panel's own expression (no cross-fade).
- `buildTweenedColourExpression` decides whether to tween per-panel, not off `representative` alone — `representative` is just "first panel with the item on" and may have no colour override itself (e.g. a layer switched on before its colour is ever changed), so gating on its mode alone silently skipped every override on other panels.
- GeoJson line layers have a second reveal style, `lineAnimationStyle: 'fade' | 'draw'` (`RenderLine.svelte`), using `line-gradient` + `['line-progress']` instead of opacity. MapLibre rejects a `step` expression whose *threshold* (not just its output) is a computed expression — `tweenFactor`/`global-state` can't drive it directly, so `TweenController.positionFor(mode, reducedMotion)` + `tweenStopsValue()` (`Tween/utils.ts`) recompute the same position as a literal JS number every frame instead, read via `getTween()`. `line-gradient` also flatly rejects data-driven (`['get', ...]`) colour output, unlike every other paint property here — draw-mode colour always falls back to `resolveSchemeColour()`, ignoring `simple`/`scale` per-feature colours.

## Colour scheme

`src/lib/colourScheme.ts` is the shared normal/highlighted/custom colour concept — currently
resolves GeoJson's `colourConfig.basicType`/`.basic` (`utils/geojson/expressions.ts`, `utils/geojson/themes.ts`)
and the Marker Mode colour override (`PropMarkerLayers.svelte`), both via the shared
`ColourSchemePicker.svelte` (`src/components/shared/`). Intended to be reused for CustomLabels
colouring later. `schemeForColour()`/`resolveSchemeColour()` round-trip a scheme ⇄ hex; marker
overrides only store a hex on the wire, so the scheme name is a best-effort guess on reload.
- `resolveSchemeColour(scheme, customColour)` treats `scheme === undefined` the same as
  `'custom'` (uses `customColour` if given) — `applyMarkerOverrides` always writes
  `basicType: undefined` alongside a colour override, never `'custom'`. Treating `undefined`
  like `'normal'` instead (an easy mistake — it was the actual bug the first time this
  regressed) silently ignores every marker colour override.

## Layering

Import direction is `lib` ← `shared` ← `features` ← `globe` ← `builder`, enforced by
`.fallowrc.json` (`boundaries.zones` / `boundaries.rules`, `boundary-violation` = error).
`npx fallow check` fails on an upward import.

- `src/lib/**` is the base and imports nothing from `src/components/**` — that includes
  `src/lib/zIndex.ts` (the `Z_INDEX_*` constants, re-exported by `features/layers/layerManager.ts`
  for existing callers) and `src/lib/mapStyle/` (street-map style, custom label style, `isOsmBase`),
  both of which `features/` and `CustomGlobe/` may import.
- `src/components/shared/` is the single home for cross-layer UI (`CmidInput/`, `VerticalTabs.svelte`,
  `SearchInput.svelte`, `GeoSearch/`, `ColourSchemePicker.svelte`) — there is no `Builder/shared/`.
- `safeFlyTo` / `safeFitBounds` live in `features/PanZoom/utils.ts` alongside the camera maths, not
  in `Builder/` — a `features/` file must never import from `Builder/`.

## Conventions

- Layer ids are lowercase-alphanumeric only — sanitise on input with `toLayerIdSlug()` (`layerOps.ts`), don't just validate-and-reject. Generate with `newLayerId(kind, takenIds)` or `uniqueLayerId(text, kind, takenIds)`.
- `mutateBlob()` in `Builder.layers.svelte` is the standard clone→mutate→commit wrapper for any blob change (`structuredClone($state.snapshot(...))` → mutate → `jsonBlob.set`; the snapshot matters because a `$state` proxy in the store makes `structuredClone` throw — `handleCloseLayerModal()` also snapshots the modal's `editingItem.data` before storing it); button `onclick` handlers run inside it automatically. The Builder's layer list is `blob.layers` reversed (top-first), so `handleReorder` reverses back before storing.
