<script lang="ts">
  import type { GeoJsonPointsLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import GeoJsonLoader from '../utils/geojson/GeoJsonLoader.svelte';
  import RenderPoint from './RenderPoint.svelte';

  // One layer, mounted by LayerManager. The loader fetches the GeoJSON; RenderPoint draws it.
  let { config, opacityStops, configStops }: LayerRendererProps<GeoJsonPointsLayer> = $props();
</script>

<GeoJsonLoader {config}>
  {#snippet children({ data, sourceId, posKey })}
    <RenderPoint {data} {config} {sourceId} {posKey} {opacityStops} {configStops} zIndex={config.zIndex} />
  {/snippet}
</GeoJsonLoader>
