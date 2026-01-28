<script lang="ts">
  import type { maplibregl } from '../mapLibre/index';
  import type { GeoJsonConfig } from '../../lib/marker';
  import GeoJsonConfigModal from './GeoJsonConfigModal.svelte';

  let {
    map,
    geoJsonList = [],
    onchange
  } = $props<{
    map: maplibregl.Map;
    geoJsonList: GeoJsonConfig[];
    onchange: (list: GeoJsonConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  function saveConfig(config: GeoJsonConfig) {
    const newList = [...geoJsonList];
    if (editingIndex !== null) {
      newList[editingIndex] = config;
    } else if (isAdding) {
      newList.push(config);
    }
    onchange(newList);
    closeModal();
  }

  function removeConfig(index: number) {
    const newList = geoJsonList.filter((_, i) => i !== index);
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
  <legend>Custom GeoJSON</legend>

  {#if geoJsonList.length === 0}
    <div class="empty">No GeoJSON files added.</div>
  {:else}
    <ul class="list">
      {#each geoJsonList as config, i}
        <li>
          <div class="info">
            <strong>{config.type}</strong>
            <span class="url" title={config.url}>{config.url}</span>
          </div>
          <div class="actions">
            <button class="small" onclick={() => openEdit(i)}>Edit</button>
            <button class="small danger" onclick={() => removeConfig(i)}>DEL</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <button class="add-btn" onclick={openAdd}>+ Add GeoJSON</button>

  {#if editingIndex !== null || isAdding}
    <GeoJsonConfigModal
      config={editingIndex !== null ? geoJsonList[editingIndex] : { url: '', type: 'areas', colorMode: 'simple' }}
      onsave={saveConfig}
      onclose={closeModal}
    />
  {/if}
</fieldset>

<style>
  .empty {
    font-style: italic;
    color: #666;
    margin-bottom: 0.5rem;
  }
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
  button.small {
    padding: 2px 5px;
    font-size: 0.8em;
  }
  button.danger {
    color: red;
  }
  .add-btn {
    width: 100%;
  }
</style>
