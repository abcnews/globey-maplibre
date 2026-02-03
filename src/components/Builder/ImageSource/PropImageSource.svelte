<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import ImageSourceConfigModal from './ImageSourceConfigModal.svelte';
  import { Pencil, Trash, Plus } from 'svelte-bootstrap-icons';
  import PropList from '../PropList.svelte';

  let { imageSources = [], onchange } = $props<{
    imageSources: ImageSourceConfig[];
    onchange: (list: ImageSourceConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  function saveConfig(config: ImageSourceConfig) {
    const newList = [...imageSources];
    if (editingIndex !== null) {
      newList[editingIndex] = config;
    } else if (isAdding) {
      newList.push(config);
    }
    onchange(newList);
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
    <PropList items={imageSources}>
      {#snippet name(config: ImageSourceConfig)}
        <span title={config.url}>{config.url}</span>
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
