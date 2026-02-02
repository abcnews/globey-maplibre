<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import type { ImageSourceConfig } from '../../../lib/marker';
  import ImageSourceConfigModal from './ImageSourceConfigModal.svelte';
  import { Pencil, Trash, Plus } from 'svelte-bootstrap-icons';

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
    <ul class="list">
      {#each imageSources as config, i}
        <li>
          <div class="info">
            <span class="url" title={config.url}>{config.url}</span>
            <small>Opacity: {Math.round(config.opacity * 100)}%</small>
          </div>
          <div class="actions">
            <button class="btn-icon" aria-label="Edit" onclick={() => openEdit(i)}><Pencil /></button>
            <button class="btn-icon" aria-label="Delete" onclick={() => removeConfig(i)}><Trash /></button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  {#if (editingIndex !== null || isAdding) && map}
    <ImageSourceConfigModal
      config={editingIndex !== null
        ? imageSources[editingIndex]
        : { id: Date.now().toString(), url: '', opacity: 1, coordinates: [] }}
      {map}
      onsave={saveConfig}
      onclose={closeModal}
    />
  {/if}
</fieldset>

<style>
  .list {
    list-style: none;
    padding: 0;
    margin: 0 0 0.5rem 0;
    border: 1px solid #eee;
  }
  .list li {
    padding: 0.5rem;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .list li:last-child {
    border-bottom: none;
  }
  .info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .url {
    font-size: 0.8em;
    color: #666;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }
  .actions {
    display: flex;
    gap: 0.2rem;
  }
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
