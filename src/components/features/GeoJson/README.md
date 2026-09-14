# GeoJSON Feature

Renders a GeoJSON or TopoJSON dataset (one entry of `options.geoJson`) as an area, line, point, or 3D spike layer.

Each `GeoJsonConfig` item is one dataset, one fixed filter, one fixed colour mode/opacity, and exactly one MapLibre layer (plus an outline layer for areas/lines). To show multiple colours or filtered subsets of the same or different data, add multiple `GeoJsonConfig` items — `options.geoJson` is a plain array of independent layer instances, each addable/editable/deletable in the Builder.

---

## Component Architecture

- **`GeoJsonsHandler.svelte`**: Plural wrapper — iterates `options.geoJson` and renders one `GeoJsonHandler` per item.
- **`GeoJsonHandler.svelte`**: Fetches one dataset (by CMID or URL) and dispatches it to the geometry-specific renderer for `config.type`.
- **`RenderArea.svelte`**: Renders a single polygon fill + outline layer.
- **`RenderLine.svelte`**: Renders a single line + casing outline layer.
- **`RenderPoint.svelte`**: Renders a single circle layer, with screen- or kilometre-based sizing.
- **`utils.ts`**: Data fetching/normalisation, the per-feature style evaluator (used by spikes), and the native MapLibre expression builders (`buildFilterExpression`, `buildColourExpression`, `buildOpacityExpression`, `buildRadiusExpression`, `buildStrokeWidthExpression`) used by the 2D renderers.
- **`themes.ts`**: Palette presets and theme defaults.
- **`BuilderGeoJsonConfigModal.svelte`**: Builder interface for configuring a layer's source, geometry type, filter, and colour.

## How Styling Works

- **Filtering**: `config.filter` (`{ prop, values }`) becomes a native MapLibre `filter` expression (`['in', ['get', prop], ['literal', values]]`) on the layer — non-matching features simply aren't drawn. No filter means every feature is shown.
- **Colour modes** (`config.colourMode`):
  - `basic` — a single fixed theme or custom colour.
  - `simple` — reads GeoJSON simplestyle-spec properties (`marker-color`, `fill`, `stroke`, etc.) per feature via native `get`/`coalesce` expressions.
  - `scale` — a numeric feature property (`colourProp`) interpolated through a palette or min/max colour ramp via a native `interpolate`/`get` expression (palette interpolators are sampled into a fixed set of stops).
- **Opacity/size**: `config.opacity`, `config.isOpaque`, `config.pointSize`, `config.lineWidth` feed directly into the paint expressions for the single layer.
- Colour/opacity can still be animated externally (e.g. via `map.setPaintProperty`) — this feature no longer bakes in any per-panel or scrollyteller-driven animation itself.

## Live Builder Edits

Each renderer adds its source/layer(s) once on mount, then keeps paint properties and the filter in sync with `config` reactively via `map.setPaintProperty`/`map.setFilter` — so builder edits update in place without removing and re-adding layers (no flash).

## Spikes

3D extruded spikes are no longer a Builder-editable GeoJSON type — they've been extracted into a standalone, opt-in example plugin. See [`src/plugins/GeoJsonSpikes/README.md`](../../../plugins/GeoJsonSpikes/README.md), which also doubles as the worked example for building your own [custom layer plugin](../../../lib/plugins/types.ts).

## Adding a New 2D Geometry Type

1. Add the identifier to the `type` enum in `src/lib/marker/schema.ts`.
2. Create a renderer component (e.g. `RenderHeatmap.svelte`) following `RenderArea.svelte`: add the source/layer once on mount, then reactively set paint/filter from `config` using the `build*Expression` helpers in `utils.ts`.
3. Add the type case in `GeoJsonHandler.svelte`.
4. Add any necessary property controls to `BuilderGeoJsonConfigModal.svelte`.
