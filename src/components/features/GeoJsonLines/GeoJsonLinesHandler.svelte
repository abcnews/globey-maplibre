<script lang="ts">
  import type { GeoJsonLinesLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import GeoJsonLoader from '../utils/geojson/GeoJsonLoader.svelte';
  import RenderLine from './RenderLine.svelte';

  // One layer, mounted by LayerManager. The loader fetches the GeoJSON; RenderLine draws it.
  let { config, opacityStops, configStops }: LayerRendererProps<GeoJsonLinesLayer> = $props();
</script>

<GeoJsonLoader {config}>
  {#snippet children({ data, sourceId, posKey })}
    <RenderLine {data} {config} {sourceId} {posKey} {opacityStops} {configStops} zIndex={config.zIndex} />
  {/snippet}
</GeoJsonLoader>
