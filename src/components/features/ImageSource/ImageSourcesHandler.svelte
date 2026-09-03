<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import { Z_INDEX_IMAGE_LAYERS } from '../layers/layerUtils.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import ImageSourceHandler from './ImageSourceHandler.svelte';

  // One image-source array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: ImageSourceConfig[][] } = $props();

  const entries = $derived(
    buildTweenedLayerEntries(perPanel, {
      keyOf: image => image.id || image.url || '',
      opacityOf: image => image.opacity ?? 1,
      coordsOf: image => image.coordinates
    })
  );
</script>

{#each entries as entry (entry.sig)}
  <ImageSourceHandler
    config={entry.representative}
    opacityStops={entry.opacityStops}
    coordStops={entry.coordStops}
    zIndex={entry.representative.zIndex ?? Z_INDEX_IMAGE_LAYERS + entry.index * 0.1}
  />
{/each}
