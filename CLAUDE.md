# Globey architecture notes

## Keeping this file in sync

This is an index, not documentation — one or two lines per entry, pointing at files, not
explaining them. When a change adds a non-obvious data flow, gotcha, or contract between
components, add/edit an entry here in the same turn. Skip routine fixes.

## Layer data flow

Two schemas represent layers, bridged by an adapter — always update both when adding a layer field:

- `src/lib/data/jsonBlob.ts` — Zod schema for the persisted Builder blob (`GlobeJsonBlob`), stored in `src/lib/data/blobStore.ts` (`jsonBlob` store).
- `src/lib/marker/schema.ts` — compact codec (`@abcnews/hash-codec`) for the published, URL-embeddable marker format (`DecodedObject`). Each field needs a short `.key('xx')` alias; item schemas are positional arrays (`.asArray()`), so add new fields at the end to avoid breaking existing encoded URLs.
- `src/lib/data/blobAdapter.ts` — `blobToDecodedObject()` / `decodedObjectToBlob()` map every field between the two, per layer type. `LayerItemDescriptor.name`/`.animationClock` etc. all come from this bridge.
- Every item schema needs an `id` field mapped through both adapter directions — Marker Mode's `overrideFor()` (`src/lib/data/markerPreview.ts`) matches overrides on `layer.name ?? layer.id`, so a layer kind missing `id` in its marker schema/adapter mapping (e.g. `rasterItemSchema` originally lacked it) can never be matched, making its on/off toggle a no-op regardless of state.
- `rasterLayerSchema.bounds`/`rasterItemSchema.bounds` store the same TL/TR/BR/BL 4-corner format as `imageLayerSchema.coordinates` (optional, unset = whole world), but MapLibre's native raster source `bounds` is axis-aligned `[west, south, east, north]` — `MapRasterHandler.svelte` converts by taking min/max lng/lat across the 4 corners at `addSource()` time, discarding any implied rotation. Unlike ImageSource's `setCoordinates()`, raster sources have no live bounds update, so a change forces a source remove/re-add (same as `url`/`maxZoom`/`tileSize` changes already do).
- When an item's `zIndex` is unset, `MapRasterHandler.svelte` doesn't fall back to the fixed `Z_INDEX_BASE_RASTER` tier constant — it computes `getHighestZIndexBelow(map, Z_INDEX_IMAGE_LAYERS)` (`layerManager.ts`) at add-time and stacks `+ Z_INDEX_STACK_STEP` above it, so a new raster tile layer always lands directly above whatever base raster/vector layer is currently topmost rather than always sorting to the bottom of that tier. `MapRastersHandler.svelte` relies on this (no longer applies its own `entry.index * 0.1` offset) — multiple raster entries without explicit `zIndex` stack in mount order via successive registry lookups.

Runtime feature code (buttons, modals, `getItems`) only ever touches `DecodedObject`/`LayerItemDescriptor`, never the blob schema directly.

## Layer feature registry

`src/components/features/` — each layer kind (GeoJson, Icon, ImageSource, MapRaster, MapLabels, CustomLabels, MapVector) is a self-contained `LayerFeatureDefinition` (see `types.ts`), registered in `src/components/features/index.ts` (`layerFeatureRegistry`). See `src/components/features/README.md` for the template when adding a new one.

- `getItems(options)` turns raw `DecodedObject` arrays into `LayerItemDescriptor[]` for the Builder's layer list. Prefer the item's own explicit `name` set by whoever creates it; fall back to `feature.label` — don't recompute clever names from other fields.
- Buttons come from `buttonHelpers.ts` (`createEditButton`, `createDeleteButton`, `createClockButton`) or a per-feature `buttons` factory.
- `src/components/Builder.legacy/` is dead code, not routed to anywhere active — don't extend it. A few standalone pieces (`GeoSearch`, `Favicon`) are directly reused by the active Builder rather than ported/duplicated; everything else there is off-limits.

## Modals

All Builder config modals wrap `@abcnews/components-builder`'s `Modal` (native `<dialog>`, opens/closes itself, `footerChildren` snippet for Save/Cancel). Pattern: draft `$state` seeded via `untrack($state.snapshot(config))`, mutate the draft, commit onto the bindable `config` prop in a `handleSave()`, call `onclose?.()`.

Two ways a modal gets opened from `Builder.layers.svelte`:
- Per-item edit: `editingItem` state + `feature.ConfigModal`, or `editingItem.modalOverride` to force a shared modal (e.g. `BuilderLayerClockConfigModal.svelte`) regardless of feature kind.
- Add-menu custom modal: `activeCustomModal` / `customModalOptions`.

`handleCloseLayerModal()` commits via `feature.update`/`feature.isValid` — reuse it rather than writing new commit logic.

## Top navigation / mode routing

`Builder.svelte` routes between `Builder.firstrun.svelte` (New map), `Builder.layers.svelte` (Layout), `Builder.markers.svelte` (Markers) and `Builder.pastedScrollyteller.svelte` (Preview) purely by reading `window.location.hash`: starts with `new` → New map, `mark` → Markers, `paste` → Preview, else Layout. No separate mode flag — the hash is the single source of truth (`!hasBlob` also forces New map regardless of hash, since Firstrun requires no active blob). `BuilderTopBar.svelte` is the single full-width control (rendered once, above all four mode components — they no longer render their own switcher) with four numbered, arrow-shaped step buttons; Markers/Preview are disabled while `!hasBlob`, New map/Layout are always enabled. `Builder.svelte`'s `setMode()` confirms before navigating to New map while a blob is active (the old "Exit session" behaviour), and an `$effect` forces the hash to New map whenever there's no blob, so a stale `#mark`/`#paste` hash from a previous session can't strand a newly created/restored blob on the wrong step and so New map's step is the one highlighted while Firstrun shows.

## Marker Mode

- ACTO marker codec: `src/lib/data/marker.ts` (`encodeMarker`/`decodeMarker`/`MarkerConfig`) — distinct from `src/lib/marker/` (whole-page hash-codec above). Token spec (BBOX/CAM/FITGLOBE/CENTER/FILL/LAYER/BASE/LABELS/MINIMAP) is in `REFACTOR.md`.
- A marker's BBOX has its own Fit/Fill toggle (`MarkerConfig.constrainView`, `FILL<on|off>` token) — same `constrainView` field/`'fit'|'fill'` mode the Layout Mode bounds branch of `resolvePanelTargetView` (`src/components/features/PanZoom/utils.ts`) already used, just not previously exposed in Marker Mode's `PropMarkerPosition.svelte`. Only meaningful alongside `bbox`, not `fitGlobe` — the two positioning modes are mutually exclusive per marker.
- `decodeMarker(raw: string)` expects a raw string; `markerConfigFromParsed(parsed)` expects an already `acto()`-parsed object (what `loadScrollyteller`/`parsePastedContent` panel data actually is) — passing a parsed object to `decodeMarker` breaks.
- Markers live only in `window.location.hash`, never persisted. `Builder.markers.svelte` seeds `markerConfig` synchronously at setup, not `onMount` (avoids the hash-sync `$effect` stomping a real marker).
- `MarkerAdmin` prefix must be `'#'` not `'#mark'` (our hash already starts with `mark`).
- `applyMarkerOverrides()` (`src/lib/data/markerPreview.ts`) is the single "blob + marker → panel `DecodedObject`" function, shared by Builder preview and the runtime below — it also sets animation timing (`animationMode`/`animationDuration` from `CAM`, per-layer `animationClock` from a `LAYER` duration's presence/absence only, not its value — see `TweenController`).

## Scrollyteller / static runtime

`src/index.ts` (CM bootstrap) resolves each mount's CMID via `getMountCmid()` (`src/lib/mountCmid.ts`) and loads the blob via `loadGlobeJsonBlobByCmid()` (`src/lib/data/loadBlobByCmid.ts`, shared with `Builder.firstrun.svelte`).

- `ScrollytellerGlobe.svelte` takes `jsonBlob` + `panels: PanelDefinition<Record<string, any>>[]` (parsed marker objects) and derives per-panel `DecodedObject`s itself. `CustomGlobe` is unchanged.
- `#staticglobey` mount = the real "iframe mode" (`CustomGlobeIframe.svelte` was dead, deleted).
- `PastedScrollytellerGlobe.svelte` (dev paste tool) still runs the old `markerSchema` codec, bypassing `ScrollytellerGlobe`. `Builder.pastedScrollyteller.svelte` (`#paste` hash, reachable via `BuilderTopBar`'s "Preview scrollyteller" step) is the blob-aware equivalent, using the live `jsonBlob` store.

## GeoJson cross-panel fades

Fading layer kinds (raster/image/icon/geojson) share `buildTweenedLayerEntries()` (`src/components/features/layers/tweenedLayers.ts`): `CustomGlobe` passes `perPanel: Config[][]` (all panels, not just current), entries stay mounted with an `opacityStops` array tweened via MapLibre `global-state`. Passing only the current panel's array (as `GeoJsonsHandler` used to) makes layers snap instead of fade — any new fading layer kind must use this pattern.
- GeoJson colour also cross-fades this way: `TweenedLayerEntry.configStops` (each panel's own config, threaded through `GeoJsonHandler`/`RenderArea`/`RenderLine`/`RenderPoint`) feeds `buildTweenedColourExpression()` (`GeoJson/utils.ts`), which tweens between panels' literal colours in `basic` mode only — `scale`/`simple` modes are data-driven expressions with no single colour to interpolate, so those fall back to the current panel's own expression (no cross-fade).
- `buildTweenedColourExpression` decides whether to tween per-panel, not off `representative` alone — `representative` is just "first panel with the item on" and may have no colour override itself (e.g. a layer switched on before its colour is ever changed), so gating on its mode alone silently skipped every override on other panels.
- GeoJson line layers have a second reveal style, `lineAnimationStyle: 'fade' | 'draw'` (`RenderLine.svelte`), using `line-gradient` + `['line-progress']` instead of opacity. MapLibre rejects a `step` expression whose *threshold* (not just its output) is a computed expression — `tweenFactor`/`global-state` can't drive it directly, so `TweenController.positionFor(mode, reducedMotion)` + `tweenStopsValue()` (`Tween/utils.ts`) recompute the same position as a literal JS number every frame instead, read via `getTween()`. `line-gradient` also flatly rejects data-driven (`['get', ...]`) colour output, unlike every other paint property here — draw-mode colour always falls back to `resolveSchemeColour()`, ignoring `simple`/`scale` per-feature colours.

## Colour scheme

`src/lib/colourScheme.ts` is the shared normal/highlighted/custom colour concept — currently
resolves GeoJson's `colourConfig.basicType`/`.basic` (`GeoJson/utils.ts`, `GeoJson/themes.ts`)
and the Marker Mode colour override (`PropMarkerLayers.svelte`), both via the shared
`ColourSchemePicker.svelte` (`src/components/shared/`). Intended to be reused for CustomLabels
colouring later. `schemeForColour()`/`resolveSchemeColour()` round-trip a scheme ⇄ hex; marker
overrides only store a hex on the wire, so the scheme name is a best-effort guess on reload.
- `resolveSchemeColour(scheme, customColour)` treats `scheme === undefined` the same as
  `'custom'` (uses `customColour` if given) — `applyMarkerOverrides` always writes
  `basicType: undefined` alongside a colour override, never `'custom'`. Treating `undefined`
  like `'normal'` instead (an easy mistake — it was the actual bug the first time this
  regressed) silently ignores every marker colour override.

## Conventions

- Friendly layer names (`name` field) are lowercase-alphanumeric only (`a-z0-9`, no separators) — sanitize on input (`toLowerCase().replace(/[^a-z0-9]/g, '')`), don't just validate-and-reject.
- `mutateDecoded()` in `Builder.layers.svelte` is the standard clone→mutate→commit wrapper for any options change; button `onclick` handlers run inside it automatically.
