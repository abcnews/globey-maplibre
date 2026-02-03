<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import GeoJsonConfigModal from './GeoJsonConfigModal.svelte';
  import MarkdownModal from '../MarkdownModal.svelte';
  import { Pencil, Trash, QuestionCircle, Plus } from 'svelte-bootstrap-icons';
  import helpContent from './GEOJSON.md?raw';
  import PropList from '../PropList.svelte';

  let { geoJsonList = [], onchange } = $props<{
    geoJsonList: GeoJsonConfig[];
    onchange: (list: GeoJsonConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);
  let isShowingHelp = $state(false);

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
  <legend>
    Custom GeoJSON
    <button class="btn-icon" aria-label="Add GeoJSON" title="Add GeoJSON" onclick={openAdd}><Plus /></button>
    <button class="btn-icon" aria-label="Help" title="Help" onclick={() => (isShowingHelp = true)}>
      <QuestionCircle />
    </button>
  </legend>

  {#if geoJsonList.length === 0}
    <small>Click <code>+</code> to add a new layer</small>
  {:else}
    <PropList items={geoJsonList} {onchange}>
      {#snippet name(config: GeoJsonConfig)}
        <strong>{config.type}</strong>
      {/snippet}
      {#snippet description(config: GeoJsonConfig)}
        <span title={config.url}>{config.url}</span>
      {/snippet}
      {#snippet actions(_, i)}
        <button class="btn-icon" aria-label="Edit" onclick={() => openEdit(i)}><Pencil /></button>
        <button class="btn-icon" aria-label="Delete" onclick={() => removeConfig(i)}><Trash /></button>
      {/snippet}
    </PropList>
  {/if}

  {#if editingIndex !== null || isAdding}
    <GeoJsonConfigModal
      config={editingIndex !== null ? geoJsonList[editingIndex] : { url: '', type: 'areas', colourMode: 'simple' }}
      onsave={saveConfig}
      onclose={closeModal}
    />
  {/if}

  {#if isShowingHelp}
    <MarkdownModal title="GeoJSON Help" markdown={helpContent} onclose={() => (isShowingHelp = false)} />
  {/if}
</fieldset>

<style>
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
