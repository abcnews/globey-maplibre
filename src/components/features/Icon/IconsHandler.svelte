<script lang="ts">
  import type { IconLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import IconHandler from './IconHandler.svelte';

  // One icon array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: Stacked<IconLayer>[][] } = $props();

  const entries = $derived(
    buildTweenedLayerEntries(perPanel, {
      keyOf: icon => icon.id,
      coordsOf: icon => icon.coords
    })
  );
</script>

{#each entries as entry (entry.key)}
  <IconHandler
    config={entry.representative}
    id={entry.key}
    opacityStops={entry.opacityStops}
    coordStops={entry.coordStops}
    zIndex={entry.representative.zIndex}
  />
{/each}
