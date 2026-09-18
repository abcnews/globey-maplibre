<script lang="ts">
  import type { RasterLayerConfig } from '../../../lib/marker/types.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import MapRasterHandler from './MapRasterHandler.svelte';

  // One raster-layer array per panel (built by CustomGlobe, satellite base folded in).
  let { perPanel = [] }: { perPanel?: RasterLayerConfig[][] } = $props();

  const entries = $derived(buildTweenedLayerEntries(perPanel, { keyOf: raster => raster.url }));

  const layerId = (url: string): string => `raster-${btoa(url).replace(/=/g, '').slice(-8)}`;
</script>

{#each entries as entry (entry.key)}
  <MapRasterHandler
    id={layerId(entry.representative.url)}
    url={entry.representative.url}
    maxZoom={entry.representative.maxZoom ?? 7}
    tileSize={entry.representative.tileSize ?? 256}
    attribution={entry.representative.attribution}
    opacityStops={entry.opacityStops}
    animationClock={entry.representative.animationClock}
    bounds={entry.representative.bounds}
    zIndex={entry.representative.zIndex}
  />
{/each}
