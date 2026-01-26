<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  import type { Label } from '../../lib/marker';
  import GeoSearch from './GeoSearch.svelte';
  import { Trash, GeoAlt } from 'svelte-bootstrap-icons';

  let { map, onchange } = $props<{ map: maplibregl.Map; onchange?: (labels: Label[]) => void }>();
  let isPicking = $state(false);
  let labels = $state<Label[]>([]);

  // Sync store to local state when store changes
  $effect(() => {
    if ($options?.labels) {
      // Avoid overwriting if we are currently editing?
      // For now, simple sync.
      labels = $options.labels;
    } else {
      labels = [];
    }
  });

  function updateStore(newLabels: Label[]) {
    // This will trigger the effect above, essentially a round trip.
    // Svelte 5 is smart about granular updates, but careful about loops.
    // If newLabels is structurally same, likely fine.
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
      style: 'country',
      number: 0,
      pointless: false
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
    map.flyTo({
      center: label.coords,
      padding: 50
    });
  }
</script>

<fieldset>
  <legend>Custom Labels</legend>
  <div style:display="flex" style:gap="0.5rem" style:align-items="center" style:margin-bottom="0.5rem">
    <button onclick={() => (isPicking = !isPicking)} aria-pressed={isPicking}>
      {isPicking ? 'Cancel' : 'Add Label'}
    </button>
    <GeoSearch
      onselect={val => {
        const newLabel: Label = {
          name: val.name,
          coords: val.coords,
          style: 'level4', // Default to city level for search results
          number: 0,
          pointless: false
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
  </div>

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
        <select value={label.style} onchange={e => updateLabel(i, 'style', e.currentTarget.value)}>
          <option value="country">Country</option>
          <option value="level3">Level 3</option>
          <option value="level4">Level 4</option>
          <option value="water">Water</option>
        </select>
        <div style="display:flex; align-items:center;">
          <input
            type="checkbox"
            checked={label.pointless}
            onchange={e => updateLabel(i, 'pointless', e.currentTarget.checked)}
            title="Hide Point"
          />
        </div>
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
    grid-template-columns: 1fr auto auto auto auto;
    gap: 0.5rem;
    align-items: center;
  }
  input {
    width: 100%;
    min-width: 0;
  }
</style>
