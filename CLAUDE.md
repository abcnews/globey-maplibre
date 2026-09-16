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

## Marker Mode

`Builder.svelte` routes between `Builder.layers.svelte` (Layout Mode) and `Builder.markers.svelte` (Marker Mode) purely by reading `window.location.hash`: starts with `mark` → Markers, else Layout. No separate mode flag — the hash is the single source of truth.

- ACTO marker codec: `src/lib/data/marker.ts` (`encodeMarker`/`decodeMarker`/`MarkerConfig`) — distinct from `src/lib/marker/` (whole-page hash-codec above). Token spec (BBOX/CAM/FITGLOBE/CENTER/LAYER/BASE/LABELS/MINIMAP) is in `REFACTOR.md`.
- `decodeMarker(raw: string)` expects a raw string; `markerConfigFromParsed(parsed)` expects an already `acto()`-parsed object (what `loadScrollyteller`/`parsePastedContent` panel data actually is) — passing a parsed object to `decodeMarker` breaks.
- Markers live only in `window.location.hash`, never persisted. `Builder.markers.svelte` seeds `markerConfig` synchronously at setup, not `onMount` (avoids the hash-sync `$effect` stomping a real marker).
- `MarkerAdmin` prefix must be `'#'` not `'#mark'` (our hash already starts with `mark`).
- `applyMarkerOverrides()` (`src/lib/data/markerPreview.ts`) is the single "blob + marker → panel `DecodedObject`" function, shared by Builder preview and the runtime below — it also sets animation timing (`animationMode`/`animationDuration` from `CAM`, per-layer `animationClock` from a `LAYER` duration's presence/absence only, not its value — see `TweenController`).

## Scrollyteller / static runtime

`src/index.ts` (CM bootstrap) resolves each mount's CMID via `getMountCmid()` (`src/lib/mountCmid.ts`) and loads the blob via `loadGlobeJsonBlobByCmid()` (`src/lib/data/loadBlobByCmid.ts`, shared with `Builder.firstrun.svelte`).

- `ScrollytellerGlobe.svelte` takes `jsonBlob` + `panels: PanelDefinition<Record<string, any>>[]` (parsed marker objects) and derives per-panel `DecodedObject`s itself. `CustomGlobe` is unchanged.
- `#staticglobey` mount = the real "iframe mode" (`CustomGlobeIframe.svelte` was dead, deleted).
- `PastedScrollytellerGlobe.svelte` (dev paste tool) still runs the old `markerSchema` codec, bypassing `ScrollytellerGlobe`. `Builder.pastedScrollyteller.svelte` (`#paste` hash, not linked in UI) is the blob-aware equivalent, using the live `jsonBlob` store.

## GeoJson cross-panel fades

Fading layer kinds (raster/image/icon/geojson) share `buildTweenedLayerEntries()` (`src/components/features/layers/tweenedLayers.ts`): `CustomGlobe` passes `perPanel: Config[][]` (all panels, not just current), entries stay mounted with an `opacityStops` array tweened via MapLibre `global-state`. Passing only the current panel's array (as `GeoJsonsHandler` used to) makes layers snap instead of fade — any new fading layer kind must use this pattern.

## Conventions

- Friendly layer names (`name` field) are lowercase-alphanumeric only (`a-z0-9`, no separators) — sanitize on input (`toLowerCase().replace(/[^a-z0-9]/g, '')`), don't just validate-and-reject.
- `mutateDecoded()` in `Builder.layers.svelte` is the standard clone→mutate→commit wrapper for any options change; button `onclick` handlers run inside it automatically.
