<script lang="ts">
  import type { GeoJsonLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import GeoJsonHandler from './GeoJsonHandler.svelte';

  // One geojson-layer array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: Stacked<GeoJsonLayer>[][] } = $props();

  const entries = $derived(buildTweenedLayerEntries(perPanel, { keyOf: item => item.id }));
</script>

{#each entries as entry (entry.key)}
  <GeoJsonHandler config={entry.representative} opacityStops={entry.opacityStops} configStops={entry.configStops} />
{/each}
