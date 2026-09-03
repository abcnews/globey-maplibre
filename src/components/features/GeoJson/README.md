# GeoJSON Feature

Renders GeoJSON and TopoJSON datasets (`options.geoJson`) as areas, lines, points, or 3D spikes, with smooth colour, size, and opacity transitions between scrollyteller panels on the shared tween clock.

---

## How It Works

Transitions are handled without re-uploading geometries or modifying sources per frame:

- **Feature Classification**: Visual styles (colours, opacities, line widths, radii) are evaluated across all panels at load time. Features that share the same visual profile across all panels are grouped into a shared class (`__gjClass`). Continuous numerical or colour scales are quantised to keep class counts small.
- **Static Class Layers**: Each class is represented by static MapLibre layers filtered by `__gjClass`. Layer paint properties use interpolation expressions mapped to a global state variable (`gjPos`).
- **Global Position Updates**: During panel transitions, `GeoJsonHandler` updates `gjPos` once per animation frame with the current continuous position (`panelIndex + easedProgress`). All class layers update their appearance automatically.

Features that appear or disappear across panels fade in or out using zero-opacity stops.

---

## Component Architecture

- **`GeoJsonHandler.svelte`**: Collects distinct GeoJSON configurations across panels, fetches data, builds feature classes, and updates the `gjPos` global state on each frame.
- **`GeoJsonRenderer.svelte`**: Dispatches datasets to geometry-specific renderers based on configuration `type`.
- **`RenderArea.svelte`**: Renders polygon fills and casing outlines per class.
- **`RenderLine.svelte`**: Renders line strokes and casing outlines per class.
- **`RenderPoint.svelte`**: Renders circle markers per class with screen or kilometre-based sizing.
- **`RenderSpike.svelte` / `SpikeLayer.ts`**: Renders 3D extruded spikes via a Three.js custom layer interface.
- **`utils.ts`**: Utilities for data normalisation, style evaluation, classification, and paint expressions.
- **`themes.ts`**: Palette presets and theme defaults.
- **`BuilderGeoJsonConfigModal.svelte`**: Builder interface for configuring layer properties, styles, and filters.

## Technical Constraints

- **Expressions Must Not Access Dynamic Properties**: Paint expressions on class layers must rely only on the global position uniform (`gjPos`). Do not introduce runtime `['get', ...]` or `['feature-state', ...]` calls into animatable paint properties.
- **No Layer Reconstruction During Transitions**: Avoid calling `source.setData()` or adding/removing layers while scrolling or animating. All transitions must be driven via `gjPos`.
- **Static Filters**: Class filters must remain static. Dynamic expressions inside filters trigger full source reloads.
- **Quantise Continuous Inputs**: All continuous colour and numerical values used in classification must be quantised so total class counts remain bounded.

---

## Creating a New Visualisation

### 1. 2D Layer Types (Areas, Lines, Points, Heatmaps)

1. **Schema**: Add the new identifier to the `type` enum in `src/lib/marker/schema.ts`.
2. **Renderer Component**: Create a component (e.g. `RenderHeatmap.svelte`) following `RenderArea.svelte`.
   - In an untracked effect, add the MapLibre source once.
   - Use `classStates.flatMap()` to generate class layers.
   - Set filters with `classFilterExpression(classIndex)`.
   - Bind animated paint properties with `classPaintExpression(perPanelStates, field)`.
   - Clean up layers and sources in the effect teardown.
3. **Dispatch**: Add the type case in `GeoJsonRenderer.svelte`.
4. **State Fields**: If the new layer requires new visual attributes, add them to `GeoJsonFeatureState` and calculate them in `utils.ts`.
5. **Builder UI**: Add any necessary property controls to `BuilderGeoJsonConfigModal.svelte`.

### 2. 3D or Custom Shader Layers (CustomLayerInterface)

For continuous 3D geometry or WebGL instancing that cannot be represented by MapLibre layers (such as spikes):

- Implement a custom layer class implementing MapLibre's `CustomLayerInterface`.
- Read transition progress directly from `getTween()` or subscribe to animation frames.
- Receive the current panel configuration directly from `GeoJsonRenderer`.

---

## Edge Case Handling

- **At Rest**: When scrolling stops at a panel, `gjPos` resolves to the panel index, displaying exact panel values.
- **Static Display**: In single-panel or non-scrollyteller views, `classPaintExpression` evaluates to static constants with no active animation.
- **Reduced Motion**: Snaps `gjPos` directly to the target panel stop without intermediate interpolation.
- **Inactive Panels**: Datasets absent from a panel are assigned zero opacity for that panel stop
