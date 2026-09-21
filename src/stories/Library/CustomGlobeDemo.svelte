<script lang="ts">
  import CustomGlobe from '../../components/CustomGlobe/CustomGlobe.svelte';
  import type { GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';
  import { demoBlob as blob } from './demoBlob.ts';
  import { untrack } from 'svelte';

  interface Props {
    /** Layer ids switched on at first render. */
    initialLayerIds?: string[];
  }

  let { initialLayerIds = blob.layers.map(({ id }) => id) }: Props = $props();

  // Seeded once from the prop, then owned by the toggle buttons.
  let activeLayerIds = $state(new Set(untrack(() => initialLayerIds)));

  // CustomGlobe just renders whatever blob it's given: to toggle a feature, hand it a new
  // blob without that layer. Filtering (not reordering) keeps the stack order intact.
  const options = $derived<GlobeJsonBlob>({
    ...blob,
    layers: blob.layers.filter(({ id }) => activeLayerIds.has(id))
  });

  function toggleLayer(id: string) {
    const next = new Set(activeLayerIds);
    if (!next.delete(id)) next.add(id);
    activeLayerIds = next;
  }
</script>

<div class="demo">
  <CustomGlobe {options} interactive rootElStyle="width:100%;height:100%" />

  <div class="toggles">
    {#each blob.layers as { id, type } (id)}
      <button type="button" aria-pressed={activeLayerIds.has(id)} onclick={() => toggleLayer(id)}>
        {id} <small>({type})</small>
      </button>
    {/each}
  </div>
</div>

<style>
  .demo {
    position: relative;
    width: 100%;
    height: 100vh;
  }

  .toggles {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    z-index: 10;
  }

  button {
    padding: 0.3rem 0.6rem;
    border-radius: 4px;
    border: 1px solid #888;
    background: rgba(255, 255, 255, 0.6);
    cursor: pointer;
  }

  button[aria-pressed='true'] {
    background: #0058cc;
    border-color: #0058cc;
    color: white;
  }
</style>
