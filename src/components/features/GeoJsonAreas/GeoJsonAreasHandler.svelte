<script lang="ts">
  import type { GeoJsonAreasLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import GeoJsonLoader from '../utils/geojson/GeoJsonLoader.svelte';
  import RenderArea from './RenderArea.svelte';

  // One layer array per panel (built by CustomGlobe) — all panels, so layers fade rather than snap.
  let { perPanel = [] }: { perPanel?: Stacked<GeoJsonAreasLayer>[][] } = $props();

  const entries = $derived(buildTweenedLayerEntries(perPanel, { keyOf: item => item.id }));
</script>

{#each entries as entry (entry.key)}
  <GeoJsonLoader config={entry.representative}>
    {#snippet children({ data, sourceId, posKey })}
      <RenderArea
        {data}
        config={entry.representative}
        {sourceId}
        {posKey}
        opacityStops={entry.opacityStops}
        configStops={entry.configStops}
        zIndex={entry.representative.zIndex}
      />
    {/snippet}
  </GeoJsonLoader>
{/each}
