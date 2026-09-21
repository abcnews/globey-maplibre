# GeoJSON shared utils

Shared code for the three GeoJSON layer features: `GeoJsonAreas/`, `GeoJsonLines/`, `GeoJsonPoints/`. Each feature is one blob `type` (`geojsonAreas`, `geojsonLines`, `geojsonPoints`), one dataset, one filter and one colour mode.

## Files

- `data.ts`: `fetchGeoJsonData` (CMID or URL, GeoJSON or TopoJSON), `getGeoJsonCoordinatePairs` (for the go-to button), `filterFeaturesType`.
- `expressions.ts`: MapLibre paint/filter builders (`buildFilterExpression`, `buildColourExpression`, `buildTweenedColourExpression`, `buildOpacityExpression`, `buildRadiusExpression`, `buildStrokeWidthExpression`, `getKilometreZoomScaleExpression`, `widthPlus`). They take `GeoJsonStyle`, which all three layer types satisfy.
- `themes.ts`: palette presets.
- `feature.ts`: `hasValidGeoJsonSource` and `geoJsonLayerButtons`, shared by the three feature definitions.
- `GeoJsonLoader.svelte`: fetches one layer's data and renders its `children` snippet with `{ data, sourceId, posKey }`. Used by each `GeoJson*Handler.svelte`.
- `BuilderGeoJsonModal.svelte`: the shared config modal (source, name/clock, filter, colour). Kind-specific fields come in via the `kindFields` snippet.
- `BuilderPropGeoJsonFilter.svelte`, `BuilderPropGeoJsonColour.svelte`, `BuilderPropGeoJsonSize.svelte`, `ColourLegendPreview.svelte`, `DistributionInput.svelte`: controls used by the modals.

## Styling

- `filter` (`{ prop, values }`) becomes `['in', ['get', prop], ['literal', values]]`.
- `colourMode`: `basic` (one colour), `simple` (simplestyle-spec properties per feature), `scale` (numeric `colourProp` through a palette).
- Renderers add their source/layers once on mount, then update paint and filter in place.

## Adding a new GeoJSON kind

1. Add a schema to `src/lib/data/jsonBlob.ts` spreading `geoJsonCommonObject`, and add it to `GEOJSON_LAYER_KINDS` and `GeoJsonAnyLayer`.
2. Create a feature folder with `index.ts`, a `Render*.svelte`, a `*Handler.svelte` (copy `GeoJsonAreas/`) and a modal wrapping `BuilderGeoJsonModal`.
3. Register it in `src/components/features/index.ts` and mount its handler in `CustomGlobe.svelte`.

Spikes live in the standalone plugin `src/plugins/GeoJsonSpikes/`.
