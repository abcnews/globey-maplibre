<script lang="ts">
  import type { RasterLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import MapRasterHandler from './MapRasterHandler.svelte';

  // One raster-layer array per panel (built by CustomGlobe, satellite base folded in).
  let { perPanel = [] }: { perPanel?: Stacked<RasterLayer>[][] } = $props();

  const entries = $derived(buildTweenedLayerEntries(perPanel, { keyOf: raster => raster.id }));
</script>

{#each entries as entry (entry.key)}
  <MapRasterHandler
    id={`raster-${entry.key}`}
    url={entry.representative.url}
    maxZoom={entry.representative.maxZoom ?? 7}
    tileSize={entry.representative.tileSize ?? 256}
    opacityStops={entry.opacityStops}
    animationClock={entry.representative.animationClock}
    bounds={entry.representative.bounds}
    zIndex={entry.representative.zIndex}
  />
{/each}
