<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  import type { Label } from '../../lib/marker';
  import GeoSearch from './GeoSearch.svelte';
  import { Trash, GeoAlt, Plus, X } from 'svelte-bootstrap-icons';
  import { safeFlyTo } from './utils';

  let { map, onchange } = $props<{ map: maplibregl.Map; onchange?: (labels: Label[]) => void }>();
  let isPicking = $state(false);
  let labels = $state<Label[]>([]);

  // Sync store to local state when store changes
  $effect(() => {
    if ($options?.labels) {
      labels = $options.labels;
    } else {
      labels = [];
    }
  });

  function updateStore(newLabels: Label[]) {
    $options = {
      ...$options,
      labels: newLabels
    };
    onchange?.(newLabels);
  }

  function handleMapClick(e: any) {
    const newLabel: Label = {
      name: 'Label',
      coords: [e.lngLat.lng, e.lngLat.lat],
      style: 'country-large',
      number: 0
    };
    updateStore([...labels, newLabel]);
    isPicking = false;
  }

  $effect(() => {
    if (!map) return;

    if (isPicking) {
      map.getCanvas().style.cursor = 'crosshair';
      map.on('click', handleMapClick);
    } else {
      map.getCanvas().style.cursor = '';
      map.off('click', handleMapClick);
    }

    return () => {
      map.off('click', handleMapClick);
      if (map.getCanvas()) map.getCanvas().style.cursor = '';
    };
  });

  function updateLabel(index: number, key: keyof Label, value: any) {
    const newLabels = [...(labels || [])];
    newLabels[index] = { ...newLabels[index], [key]: value };
    updateStore(newLabels);
  }

  function removeLabel(index: number) {
    const newLabels = labels.filter((_, i) => i !== index);
    updateStore(newLabels);
  }

  function zoomToLabel(label: Label) {
    if (!map) return;
    safeFlyTo(map, {
      center: label.coords,
      padding: 50
    });
  }
</script>

<fieldset>
  <legend
    >Custom Labels

    <button onclick={() => (isPicking = !isPicking)} aria-pressed={isPicking} class="btn-icon" aria-label="Add label">
      {#if isPicking}
        <X />
      {:else}
        <Plus />
      {/if}
    </button>
    <GeoSearch
      onselect={val => {
        const newLabel: Label = {
          name: val.name,
          coords: val.coords,
          style: 'country-large', // Default for search results
          number: 0
        };
        updateStore([...labels, newLabel]);
      }}
    />
    <button
      class="btn-icon"
      aria-label="Delete all labels"
      onclick={() => {
        isPicking = false;
        $options.labels = [];
      }}
    >
      <Trash />
    </button>
  </legend>
  <small>Search for a location, or click to add a label</small>

  {#if isPicking}
    <small style:display="block" style:margin-bottom="0.5rem">Click map to place label</small>
  {/if}

  <div class="label-list">
    {#each labels as label, i}
      <div class="label-item">
        <input
          type="text"
          value={label.name}
          oninput={e => updateLabel(i, 'name', e.currentTarget.value)}
          placeholder="Label text"
        />
        <select
          value={label.style}
          onchange={e => updateLabel(i, 'style', e.currentTarget.value)}
          style="max-width:8em"
        >
          <option value="country-large">Country</option>
          <option value="country-small">Country (small)</option>
          <option value="water-large">Waterway</option>
          <option value="water-small">Waterway (small)</option>
        </select>
        <button
          type="button"
          class="btn-icon"
          onclick={() => zoomToLabel(label)}
          aria-label="Zoom to label"
          title="Zoom to label"
        >
          <GeoAlt />
        </button>
        <button type="button" class="btn-icon" onclick={() => removeLabel(i)} aria-label="Remove label">×</button>
      </div>
    {/each}
  </div>
</fieldset>

<style>
  .label-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }
  .label-item {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 0.5rem;
    align-items: center;
  }
  input {
    width: 100%;
    min-width: 0;
  }
</style>
