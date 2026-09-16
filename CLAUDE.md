# Globey architecture notes

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

- ACTO marker codec lives in `src/lib/data/marker.ts` (`encodeMarker`/`decodeMarker`/`MarkerConfig`) — distinct from `src/lib/marker/` (the whole-page `DecodedObject` hash-codec above). A marker only carries BBOX/CAM/BASE/LABELS/MINIMAP/per-layer on-off-colour overrides, referencing master layers by `name` (falling back to `id`).
- Markers are never persisted by the app — they live in `window.location.hash` only. `Builder.markers.svelte` seeds `markerConfig` by decoding the hash **synchronously at setup**, not in `onMount`; decoding later would let the hash-sync `$effect` write a blank marker over a real one first.
- `MarkerAdmin` (`@abcnews/components-builder`) does `prefixes[mode] + window.location.hash.slice(1)` for copy/paste. Since our live hash already starts with the literal text `mark`, its prefix must be `'#'`, not `'#mark'` — using `'#mark'` doubles up to `#markmark...`.
- `applyMarkerOverrides()` (`src/lib/data/markerPreview.ts`) renders a marker's *final* on/off/colour/camera state on `CustomGlobe` for live preview — it does not simulate scroll-tied vs immediate animation timing.

## Conventions

- Friendly layer names (`name` field) are lowercase-alphanumeric only (`a-z0-9`, no separators) — sanitize on input (`toLowerCase().replace(/[^a-z0-9]/g, '')`), don't just validate-and-reject.
- `mutateDecoded()` in `Builder.layers.svelte` is the standard clone→mutate→commit wrapper for any options change; button `onclick` handlers run inside it automatically.
