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

The application state is serializable to the URL hash, allowing configurations to be shared and restored.

1.  **State Definition**: The state schema is defined in `src/lib/marker.ts` via `markerSchema`.
2.  **Encoding/Decoding**:
    - `markerSchema` defines how each property (e.g., `coords`, `z`, `highlightCountries`) is encoded into the URL hash and decoded back into the application state.
    - Custom codecs (e.g., `geohashCodec`, `countriesCodec`) handle efficient string representation of complex data.
3.  **Updates**:
    - The `Builder` updates the local state.
    - Changes in state are serialized and update the URL hash.
    - `CustomGlobe` reacts to these state changes (passed as props) and updates the map accordingly.

## Adding a new MapLibre feature/layer

To add a new feature that is configurable via the Builder and persistent in the URL:

1.  **Define State**:
    - Add a new property to the `markerSchema` in `[src/lib/marker.ts](src/lib/marker.ts)`.
    - Define a codec if the data type requires special handling for URL serialization.

2.  **Add Builder UI**:
    - Create a new property editor component in `src/components/Builder/` (e.g., `PropNewFeature.svelte`).
    - Integrate it into `[src/components/Builder/Builder.svelte](src/components/Builder/Builder.svelte)` to allow users to modify the state.

3.  **Implement Map Feature**:
    - Create a new feature component in `[src/components/CustomGlobe/features/](src/components/CustomGlobe/features/)`.
    - This component should receive the relevant prop(s) from `CustomGlobe` and use the map instance (from context) to add layers or sources.
    - Add the component to `[src/components/CustomGlobe/CustomGlobe.svelte](src/components/CustomGlobe/CustomGlobe.svelte)` and pass the prop down.
