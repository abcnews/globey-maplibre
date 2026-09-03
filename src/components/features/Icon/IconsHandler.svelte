<script lang="ts">
  import type { IconConfig } from '../../../lib/marker';
  import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
  import { buildTweenedLayerEntries } from '../layers/tweenedLayers.ts';
  import IconHandler from './IconHandler.svelte';

  // One icon array per panel (built by CustomGlobe).
  let { perPanel = [] }: { perPanel?: IconConfig[][] } = $props();

  const entries = $derived(
    buildTweenedLayerEntries(perPanel, {
      keyOf: icon => icon.id || (icon.cmid ? String(icon.cmid) : ''),
      coordsOf: icon => icon.coords
    })
  );
</script>

{#each entries as entry (entry.sig)}
  <IconHandler
    config={entry.representative}
    id={entry.key}
    opacityStops={entry.opacityStops}
    coordStops={entry.coordStops}
    zIndex={entry.representative.zIndex ?? Z_INDEX_CUSTOM_LABELS + entry.index * 0.1}
  />
{/each}
