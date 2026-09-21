<script lang="ts">
  import type { GeoJsonAreasLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import GeoJsonLoader from '../utils/geojson/GeoJsonLoader.svelte';
  import RenderArea from './RenderArea.svelte';

  // One layer, mounted by LayerManager. The loader fetches the GeoJSON; RenderArea draws it.
  let { config, opacityStops, configStops }: LayerRendererProps<GeoJsonAreasLayer> = $props();
</script>

<GeoJsonLoader {config}>
  {#snippet children({ data, sourceId, posKey })}
    <RenderArea {data} {config} {sourceId} {posKey} {opacityStops} {configStops} zIndex={config.zIndex} />
  {/snippet}
</GeoJsonLoader>
