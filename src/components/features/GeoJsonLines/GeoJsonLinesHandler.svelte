<script lang="ts">
  import type { GeoJsonLinesLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import GeoJsonLoader from '../utils/geojson/GeoJsonLoader.svelte';
  import RenderLine from './RenderLine.svelte';

  // One layer array per panel (built by CustomGlobe) — all panels, so layers fade rather than snap.
  let { perPanel = [] }: { perPanel?: Stacked<GeoJsonLinesLayer>[][] } = $props();

  const entries = $derived(buildTweenedLayerEntries(perPanel, { keyOf: item => item.id }));
</script>

{#each entries as entry (entry.key)}
  <GeoJsonLoader config={entry.representative}>
    {#snippet children({ data, sourceId, posKey })}
      <RenderLine
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
