# Feature Module Guide

Features are self-contained modules located in subdirectories of `src/components/features/`. Each feature encapsulates its map rendering logic, builder UI components, state codecs, and registration hooks.

> This guide covers `LayerFeatureDefinition` — layers editable in the Builder and encoded in the URL-hash marker schema. If you're consuming `CustomGlobe`/`ScrollytellerGlobe` from outside this repo and want to add a layer in code, use the `CustomLayerPlugin` contract in [`src/lib/plugins/types.ts`](../../lib/plugins/types.ts) instead — see [`src/plugins/GeoJsonSpikes/`](../../plugins/GeoJsonSpikes/README.md) for a worked example.

---

## Table of Contents

1. [Define Schema and Types](#1-define-schema-and-types)
2. [Implement the Map Renderer](#2-implement-the-map-renderer)
3. [Create the Builder Modal Component](#3-create-the-builder-modal-component)
4. [Define the Feature Specification](#4-define-the-feature-specification)
5. [Register in the Layer Feature Registry](#5-register-in-the-layer-feature-registry)
6. [Mount in the Globe Component](#6-mount-in-the-globe-component)

---

## 1. Define Schema and Types

Define the data shape in the marker schema to ensure URL encoding/decoding and type safety.

- Add schema definitions in [../../lib/marker/schema.ts](../../lib/marker/schema.ts).
- Export derived TypeScript types from [../../lib/marker/types.ts](../../lib/marker/types.ts).

### Example Reference

See [iconItemSchema in schema.ts](../../lib/marker/schema.ts) and `IconConfig` in [../../lib/marker/types.ts](../../lib/marker/types.ts).

---

## 2. Implement the Map Renderer

The Map Renderer is a Svelte component that mounts inside the MapLibre container and manages sources and layers.

### Key Rules

- Use `addLayerWithZIndex` and `removeLayerWithZIndex` from [./layers/layerUtils.ts](./layers/layerUtils.ts). Never call `map.addLayer()` or `map.removeLayer()` directly.
- Separate layer lifecycle (adding/removing layers on mount/unmount) from data updates. Combining both in one effect tears down the layer each time it updates, resulting in a visual flash of that layer.
- Update data in place (e.g. `source.setData()`, `source.setCoordinates()`, `map.setPaintProperty()`, `map.setLayoutProperty()`) rather than re-creating layers whenever possible.
- For collections, use stable keys in `{#each}` loops (`item.id || index`).

### Example Reference

- Single/Collection map renderer: [Icon/IconHandler.svelte](./Icon/IconHandler.svelte) and [Icon/IconsHandler.svelte](./Icon/IconsHandler.svelte)
- Single/Collection map renderer: [GeoJson/GeoJsonHandler.svelte](./GeoJson/GeoJsonHandler.svelte) and [GeoJson/GeoJsonsHandler.svelte](./GeoJson/GeoJsonsHandler.svelte)
- Image overlay renderer: [ImageSource/ImageSourceHandler.svelte](./ImageSource/ImageSourceHandler.svelte)
- Raster tile renderer: [MapRaster/MapRasterHandler.svelte](./MapRaster/MapRasterHandler.svelte) and [MapRaster/MapRastersHandler.svelte](./MapRaster/MapRastersHandler.svelte)

---

## 3. Create the Builder Modal Component

If the feature is configurable by the user in the builder interface, create a modal component prefixed with `Builder`.

### Key Rules

- Name builder components with the `Builder` prefix (e.g. `BuilderRasterConfigModal.svelte`).
- Set `<Modal position="right" onClose={() => onclose?.()}>` so the map remains fully visible on the left during configuration.
- **Real-time Live Editing**: Bind form inputs directly to `config` (e.g. `bind:value={config.field}`, `bind:checked={config.field}`) so the user sees changes update live on the map as they interact.
- Provide a single **OK** dismissal button in `footerChildren` (`<button type="button" onclick={() => onclose?.()}>OK</button>`).
- For string attributes containing literal curly braces (such as tile URL templates `{z}/{x}/{y}`), pass them as JavaScript string expressions (`placeholder={'https://example.com/{z}/{x}/{y}.png'}`) to avoid Svelte template expression parsing errors.
- For CMID inputs, use [../Builder/CmidInput/CmidInput.svelte](../Builder/CmidInput/CmidInput.svelte) with `type="text"`, `inputmode="numeric"`, and `pattern="[0-9]*"`.

### Example Reference

- Live Toggle Modal: [MapLabels/BuilderMapLabelsConfigModal.svelte](./MapLabels/BuilderMapLabelsConfigModal.svelte)
- Live Preset & URL Modal: [MapRaster/BuilderRasterConfigModal.svelte](./MapRaster/BuilderRasterConfigModal.svelte)
- Multi-Tab Modal: [GeoJson/BuilderGeoJsonConfigModal.svelte](./GeoJson/BuilderGeoJsonConfigModal.svelte)
- Import-driven Modal: [ImageSource/BuilderImageSourceConfigModal.svelte](./ImageSource/BuilderImageSourceConfigModal.svelte)

---

## 4. Define the Feature Specification

The `LayerFeatureDefinition<T>` specification acts as a standardized adapter for [../Builder/Layers/PropLayers.svelte](../Builder/Layers/PropLayers.svelte).

Instead of hardcoding layer-specific logic (e.g. list rendering, modal dialogs, addition, deletion, and z-index restacking) inside `PropLayers.svelte`, the builder iterates dynamically over all registered features. Defining this specification provides `PropLayers` with everything it needs to manage the layer in the builder UI without modifying `PropLayers.svelte` itself.

Create an `index.ts` file in your feature directory exporting an object that implements `LayerFeatureDefinition<T>` from [./types.ts](./types.ts).

### Structure

```ts
import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { MyFeatureConfig, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
import { MyIcon } from 'svelte-bootstrap-icons';
import BuilderMyFeatureModal from './BuilderMyFeatureModal.svelte';
import MyFeatureHandler from './MyFeatureHandler.svelte';

export const myFeature: LayerFeatureDefinition<MyFeatureConfig> = {
  kind: 'myFeature',
  label: 'My Feature',
  icon: MyIcon,
  defaultZIndex: Z_INDEX_GEOJSON,
  isMultiItem: true,

  createDefault({ maxZIndex, map }) {
    return {
      id: Date.now().toString(),
      zIndex: maxZIndex
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<MyFeatureConfig>[] {
    return (options.myFeatures || []).map((item, idx) => ({
      id: `myfeature-${item.id || idx}`,
      kind: 'myFeature',
      name: item.name || 'My Feature',
      zIndex: item.zIndex ?? Z_INDEX_GEOJSON + idx * 0.1,
      data: item
    }));
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<MyFeatureConfig>, newZIndex: number) {
    if (item.data) {
      item.data.zIndex = newZIndex;
    }
  },

  add(options: DecodedObject, item: MyFeatureConfig) {
    options.myFeatures = [...(options.myFeatures || []), item];
  },

  isValid(data: MyFeatureConfig) {
    return Boolean(data?.id && data?.url);
  },

  update(options: DecodedObject, descriptor: LayerItemDescriptor<MyFeatureConfig>, data: MyFeatureConfig) {
    if (options.myFeatures) {
      options.myFeatures = options.myFeatures.map(item =>
        item === descriptor.data || (item.id && item.id === data.id) ? data : item
      );
    }
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<MyFeatureConfig>) {
    options.myFeatures = (options.myFeatures || []).filter(entry => entry !== item.data);
  },

  ConfigModal: BuilderMyFeatureModal,
  MapRenderer: MyFeatureHandler
};
```

### Validation & Updates (`isValid` and `update`)

- **`isValid(data, options)`**: Checks whether a layer item is populated with required fields (e.g. valid CMID or URL). If the user closes the config modal without configuring required fields, `PropLayers` calls `feature.delete()` automatically to remove empty drafts.
- **`update(options, descriptor, data)`**: Synchronizes modified item data back into the `DecodedObject` options upon modal closure or inline edits.


### Action Buttons (Optional)

Layer action buttons displayed in `PropLayers` (e.g. edit modal, delete, or custom actions like adding items) are defined via `buttons` or generated using standard helpers from [./buttonHelpers.ts](./buttonHelpers.ts):

```ts
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import { Plus } from 'svelte-bootstrap-icons';

// Standard edit and delete buttons:
buttons: [createEditButton(), createDeleteButton()]

// Custom action buttons (e.g. Add item):
buttons: [
  {
    id: 'add',
    title: 'Add label',
    ariaLabel: 'Add label',
    icon: Plus,
    onclick: ({ startInteractivePlacement }) => {
      startInteractivePlacement({
        prompt: 'Click on the map to place a label',
        // `options` here is a fresh draft supplied at actual click time — don't close
        // over the outer `options`/`draft`, which is discarded before the map is clicked.
        onMapClick: (coords, _item, options) => {
          options.labels = [...(options.labels || []), { name: 'Label', coords, style: 'country-large', number: 0 }];
        }
      });
    }
  },
  createEditButton(),
  createDeleteButton()
]
```

### Interactive Placement (Optional)

If placing the item requires clicking on the map, provide `interactivePlacement`:

```ts
interactivePlacement: {
  prompt: 'Click on the map to place item',
  onMapClick: (coords, item) => {
    item.coords = coords;
  }
}
```

### Example Reference

- Multi-Item Feature: [Icon/index.ts](./Icon/index.ts)
- Complex Multi-Rule Feature: [GeoJson/index.ts](./GeoJson/index.ts)
- Single-Toggle Feature: [MapLabels/index.ts](./MapLabels/index.ts)
- Custom Button Feature: [CustomLabels/index.ts](./CustomLabels/index.ts)
- Base Layer Feature: [MapVector/index.ts](./MapVector/index.ts)
- Raster Tile Feature: [MapRaster/index.ts](./MapRaster/index.ts)

---

## 5. Register in the Layer Feature Registry

Add your feature definition to `layerFeatureRegistry` in [./index.ts](./index.ts).

```ts
import { geoJsonFeature } from './GeoJson/index.ts';
import { iconFeature } from './Icon/index.ts';
import { imageSourceFeature } from './ImageSource/index.ts';
import { mapLabelsFeature } from './MapLabels/index.ts';
import { customLabelsFeature } from './CustomLabels/index.ts';
import { streetMapFeature } from './MapVector/index.ts';
import { rasterFeature } from './MapRaster/index.ts';

export const layerFeatureRegistry = [
  geoJsonFeature,
  iconFeature,
  imageSourceFeature,
  mapLabelsFeature,
  customLabelsFeature,
  streetMapFeature,
  rasterFeature
];
```

Adding to `layerFeatureRegistry` automatically enables:

- Appearance in the Builder "Add Layer" menu.
- Visual items in [../Builder/Layers/PropLayers.svelte](../Builder/Layers/PropLayers.svelte).
- Drag-and-drop layer restacking.
- Config modal opening on edit.

---

## 6. Mount in the Globe Component

If the feature renders visual elements on the map, import its handler component directly into [../CustomGlobe/CustomGlobe.svelte](../CustomGlobe/CustomGlobe.svelte) (do not import from `index.ts` to keep the consumer build free of builder modals):

```svelte
<script lang="ts">
  import MyFeatureHandler from '../features/MyFeature/MyFeatureHandler.svelte';
</script>

<MyFeatureHandler config={options.myFeatures} />
```

---

## Summary Checklist

- [ ] Schema added to `schema.ts` and exported in `types.ts`.
- [ ] Map handler component built using `addLayerWithZIndex` / `removeLayerWithZIndex`.
- [ ] Builder modal prefixed with `Builder`, positioned `right`, updating live with single `OK` button.
- [ ] Feature specification defined in `index.ts` implementing `LayerFeatureDefinition<T>`.
- [ ] Feature exported and added to `layerFeatureRegistry` in [./index.ts](./index.ts).
- [ ] Map handler mounted in [../CustomGlobe/CustomGlobe.svelte](../CustomGlobe/CustomGlobe.svelte).
- [ ] Unit tests added (`index.test.ts`).
