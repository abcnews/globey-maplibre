<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import BuilderFirstrun from './Builder.firstrun.svelte';
  import BuilderLayers from './Builder.layers.svelte';
  import { BuilderStyleRoot } from '@abcnews/components-builder';

  /**
   * Router determines whether a project JSON blob is active.
   * If jsonBlob exists, render Builder.layers.
   * Otherwise, render Builder.firstrun to prompt user.
   */
  const hasBlob = $derived($jsonBlob !== null);
</script>

<BuilderStyleRoot>
  {#if hasBlob}
    <BuilderLayers />
  {:else}
    <BuilderFirstrun />
  {/if}
</BuilderStyleRoot>
