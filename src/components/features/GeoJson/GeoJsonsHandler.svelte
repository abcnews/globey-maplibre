<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import GeoJsonHandler from './GeoJsonHandler.svelte';

  // One geojson-layer array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: GeoJsonConfig[][] } = $props();

  const entries = $derived(
    buildTweenedLayerEntries(perPanel, { keyOf: item => String(item.id || item.url || item.cmid || '') })
  );
</script>

{#each entries as entry (entry.key)}
  <GeoJsonHandler config={entry.representative} opacityStops={entry.opacityStops} configStops={entry.configStops} />
{/each}
