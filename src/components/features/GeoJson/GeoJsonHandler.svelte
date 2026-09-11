<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { fetchGeoJsonData } from './utils.ts';
  import { generateGeoJsonSourceId, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';
  import RenderSpike from './RenderSpike.svelte';

  let { config }: { config: GeoJsonConfig } = $props();

  const sourceId = $derived(generateGeoJsonSourceId(config.id || config.url || config.cmid));

  // Fetched once per dataset (URL/CMID never change for a given layer instance).
  let data = $state<any>();

  $effect(() => {
    fetchGeoJsonData({ cmid: config.cmid, url: config.url })
      .then(result => (data = result))
      .catch(e => console.error(`[GeoJsonHandler] Error loading GeoJSON ${sourceId}:`, e));
  });
</script>

{#if data}
  {#if config.type === 'areas'}
    <RenderArea {data} {config} {sourceId} zIndex={config.zIndex ?? Z_INDEX_GEOJSON} />
  {:else if config.type === 'lines'}
    <RenderLine {data} {config} {sourceId} zIndex={config.zIndex ?? Z_INDEX_GEOJSON} />
  {:else if config.type === 'points'}
    <RenderPoint {data} {config} {sourceId} zIndex={config.zIndex ?? Z_INDEX_GEOJSON} />
  {:else if config.type === 'spikes'}
    <RenderSpike {data} {config} {sourceId} zIndex={config.zIndex ?? Z_INDEX_GEOJSON} />
  {/if}
{/if}
