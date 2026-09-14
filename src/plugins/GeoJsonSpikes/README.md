# GeoJsonSpikes Plugin

Renders a GeoJSON point dataset as 3D extruded spikes, using a Three.js `CustomLayerInterface`. This is the reference example for `globey`'s [custom layer plugin contract](../../lib/plugins/types.ts) — it used to be a built-in Builder layer type (`GeoJsonConfig.type === 'spikes'`) and is now a standalone, opt-in plugin for consumers embedding `CustomGlobe`/`ScrollytellerGlobe` in their own project.

## Component Architecture

- **`GeoJsonSpikesLayer.svelte`**: The plugin component. Receives `map`, `config`, and `zIndex` as props (the `CustomLayerProps` contract), lazily loads Three.js, adds/removes the spike layer via `addLayerWithZIndex`/`removeLayerWithZIndex`, computes per-feature height/colour, and animates transitions on data change with a short eased tween.
- **`SpikeLayer.ts`**: The Three.js `CustomLayerInterface` implementation — an `InstancedMesh` of cones, one per feature.
- **`utils.ts`**: Pure `getHeightEvaluator`/`getColourEvaluator` functions mapping a feature's property values to a spike height and colour.
- **`types.ts`**: `GeoJsonSpikesConfig` — the plugin's own config shape, independent of the Builder's marker schema.

## Config

```ts
interface GeoJsonSpikesConfig {
  data: GeoJSON.FeatureCollection; // point features to render as spikes
  heightProp?: string; // numeric property driving height
  colourProp?: string; // numeric property driving colour (via `colours` ramp)
  colours?: [string, string]; // colour ramp endpoints, low to high
  scalar?: number; // max spike height in metres (default 2,000,000)
  min?: number; // lower bound of heightProp/colourProp's range (default 0)
  max?: number; // upper bound of heightProp/colourProp's range (default 100)
  pointSize?: { value: number; unit: 'k' | 'p' }; // spike base diameter
}
```

If `colourProp` is omitted, each feature's simplestyle-spec `fill` property is used instead (falling back to grey).

## Usage

```svelte
<script>
  import { CustomGlobe } from 'globey-maplibre/lib';
  import { GeoJsonSpikesLayer } from 'globey-maplibre/plugins/GeoJsonSpikes';

  let data; // a GeoJSON FeatureCollection of Point features
</script>

<CustomGlobe
  {options}
  interactive
  plugins={[{ id: 'spikes', component: GeoJsonSpikesLayer, config: { data, heightProp: 'population' } }]}
/>
```

## Building Your Own Custom Layer Plugin

Use this plugin as the template:

1. Define a `Config` type for your layer's data/styling — self-contained, no dependency on `lib/marker`.
2. Write a component satisfying `CustomLayerProps<Config>` (`map`, `config`, `zIndex`), adding/removing its layer(s) on mount/unmount with `addLayerWithZIndex`/`removeLayerWithZIndex` from `../../components/features/layers/layerUtils.ts`, and updating data in place (not re-adding layers) when `config` changes.
3. Register an instance via `CustomGlobe`'s `plugins` prop: `{ id, component, config, zIndex? }`.
