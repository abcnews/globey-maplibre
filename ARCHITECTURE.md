# Architecture

The project is laid out in two main components: `CustomGlobe` and `Builder`. The `Builder` consumes the `CustomGlobe` and is where most of the testing/configuration happens.

## Core Components

### CustomGlobe

`src/components/CustomGlobe/CustomGlobe.svelte`

The `CustomGlobe` component is the main component for showing the globe and related functionality. It initializes the MapLibre map and exposes it as a context to its children. It handles the rendering of the map and the layers.

- **Context**: Exposes the map instance to child components.
- **Features**: Child components in `src/components/CustomGlobe/features/` usually consume this context to add layers, sources, or interactions to the map.

### Builder

`src/components/Builder/Builder.svelte`

The `Builder` configures the map state. It wraps the `CustomGlobe` and provides a UI to manipulate the state that is passed down to the `CustomGlobe`.

- **State Management**: It manages the state (e.g., zoom, coordinates, active layers) and passes it to `CustomGlobe`.
- **UI**: Contains standard UI inputs (sliders, toggles) to adjust the map settings.

### CoreMedia Scrollyteller bootstrap

The script at `/coremedia.js` bootstraps the CoreMedia Scrollyteller. This is what an aunty project would traditionally call index.js. The script finds all the markers in the page and loads the `ScrollytellerGlobe` component with the appropriate configs.

## Data Flow

There is one representation of a globe's state: the `GlobeJsonBlob`, defined in
`[src/lib/data/jsonBlob.ts](src/lib/data/jsonBlob.ts)`. It holds global map settings plus a
single `layers: GlobeLayer[]` discriminated union, whose array order is the rendering stack
order. The Builder edits it, `blobStore` persists it, and `CustomGlobe` renders it directly.

1.  **State Definition**: `globeJsonBlobSchema` (Zod) in `src/lib/data/jsonBlob.ts`.
2.  **Per-panel overrides**: a scrollyteller panel's ACTO marker
    (`[src/lib/data/marker.ts](src/lib/data/marker.ts)`, `MarkerConfig`) carries only overrides —
    which layers are on, camera, base/labels/minimap. `applyMarkerOverrides()`
    (`[src/lib/data/markerPreview.ts](src/lib/data/markerPreview.ts)`) combines blob + marker into
    the blob that panel should render.
3.  **Stacking**: nothing stores a z-index. `stackLayers()`
    (`[src/lib/data/stack.ts](src/lib/data/stack.ts)`) derives one from each layer's array index at
    the render boundary.
4.  **Updates**: the Builder clones the blob, mutates it via the generic operations in
    `src/components/features/layerOps.ts`, and commits it to the store.

## Adding a new MapLibre feature/layer

To add a new feature that is configurable via the Builder and persisted in the blob:

1.  **Define State**:
    - Add a layer schema to `globeLayerSchema` in `[src/lib/data/jsonBlob.ts](src/lib/data/jsonBlob.ts)`, built on `baseLayerObject`.
    - See `[src/components/features/README.md](src/components/features/README.md)` for the full template.

2.  **Add Builder UI**:
    - Create a new property editor component in `src/components/Builder/` (e.g., `PropNewFeature.svelte`).
    - Integrate it into `[src/components/Builder/Builder.svelte](src/components/Builder/Builder.svelte)` to allow users to modify the state.

3.  **Implement Map Feature**:
    - Create a new feature component in `[src/components/CustomGlobe/features/](src/components/CustomGlobe/features/)`.
    - This component should receive the relevant prop(s) from `CustomGlobe` and use the map instance (from context) to add layers or sources.
    - Add the component to `[src/components/CustomGlobe/CustomGlobe.svelte](src/components/CustomGlobe/CustomGlobe.svelte)` and pass the prop down.
