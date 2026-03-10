<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import ImageSourceConfigModal from './ImageSourceConfigModal.svelte';
  import { Pencil, Trash, Plus } from 'svelte-bootstrap-icons';
  import PropList from '../PropList.svelte';

  import type { maplibregl } from '../../mapLibre/index';

  let {
    imageSources = [],
    map,
    onchange
  } = $props<{
    imageSources: ImageSourceConfig[];
    map: maplibregl.Map;
    onchange: (list: ImageSourceConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  function saveConfig(config: ImageSourceConfig, goto = false) {
    const newList = [...imageSources];
    if (editingIndex !== null) {
      newList[editingIndex] = config;
    } else if (isAdding) {
      newList.push(config);
    }
    onchange(newList);

    if (goto && config.coordinates.length > 0) {
      const bounds = config.coordinates.reduce(
        (acc, coord) => {
          acc.extend(coord as [number, number]);
          return acc;
        },
        new window.maplibregl.LngLatBounds(
          config.coordinates[0] as [number, number],
          config.coordinates[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 50 });
    }

    closeModal();
  }

  function removeConfig(index: number) {
    const newList = imageSources.filter((_, i) => i !== index);
    onchange(newList);
  }

  function closeModal() {
    editingIndex = null;
    isAdding = false;
  }

  function openEdit(index: number) {
    editingIndex = index;
    isAdding = false;
  }

  function openAdd() {
    isAdding = true;
    editingIndex = null;
  }
</script>

<fieldset>
  <legend>
    Image Sources
    <button class="btn-icon" aria-label="Add Image Source" title="Add Image Source" onclick={openAdd}><Plus /></button>
  </legend>

  {#if imageSources.length === 0}
    <small>Click <code>+</code> to add an image overlay</small>
  {:else}
    <PropList items={imageSources} {onchange}>
      {#snippet name(config: ImageSourceConfig)}
        {@const filename = config.url.split('?')[0].split('/').pop() || config.url}
        <span title={config.url}>{filename}</span>
      {/snippet}
      {#snippet description(config: ImageSourceConfig)}
        <small>Opacity: {Math.round(config.opacity * 100)}%</small>
      {/snippet}
      {#snippet actions(_, i)}
        <button class="btn-icon" aria-label="Edit" onclick={() => openEdit(i)}><Pencil /></button>
        <button class="btn-icon" aria-label="Delete" onclick={() => removeConfig(i)}><Trash /></button>
      {/snippet}
    </PropList>
  {/if}

  {#if editingIndex !== null || isAdding}
    <ImageSourceConfigModal
      config={editingIndex !== null
        ? imageSources[editingIndex]
        : { id: Date.now().toString(), url: '', opacity: 1, coordinates: [] }}
      onsave={saveConfig}
      onclose={closeModal}
    />
  {/if}
</fieldset>

<style>
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
