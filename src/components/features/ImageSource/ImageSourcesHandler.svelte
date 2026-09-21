<script lang="ts">
  import type { ImageLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import ImageSourceHandler from './ImageSourceHandler.svelte';

  // One image-source array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: Stacked<ImageLayer>[][] } = $props();

  const entries = $derived(
    buildTweenedLayerEntries(perPanel, {
      keyOf: image => image.id,
      coordsOf: image => image.coordinates
    })
  );
</script>

{#each entries as entry (entry.key)}
  <ImageSourceHandler
    config={entry.representative}
    opacityStops={entry.opacityStops}
    coordStops={entry.coordStops}
    zIndex={entry.representative.zIndex}
  />
{/each}
