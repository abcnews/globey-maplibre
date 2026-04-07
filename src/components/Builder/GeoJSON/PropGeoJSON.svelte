<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import GeoJsonConfigModal from './GeoJsonConfigModal.svelte';
  import { Pencil, Trash, QuestionCircle, Plus } from 'svelte-bootstrap-icons';
  import PropList from '../PropList.svelte';

  let {
    geoJsonList = [],
    map,
    onchange
  } = $props<{
    geoJsonList: GeoJsonConfig[];
    map: maplibregl.Map;
    onchange: (list: GeoJsonConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  function saveConfig(config: GeoJsonConfig, goto = false, bounds?: [number, number][]) {
    const newList = [...geoJsonList];
    if (editingIndex !== null) {
      newList[editingIndex] = config;
    } else if (isAdding) {
      newList.push(config);
    }
    onchange(newList);

    if (goto && bounds) {
      map.fitBounds(bounds as any, { padding: 50 });
    }

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
    <button
      class="btn-icon"
      aria-label="Help"
      title="Help"
      onclick={() =>
        window.open(
          'https://loop.cloud.microsoft/p/eyJ3Ijp7InUiOiJodHRwczovL2FiY3BvcnRhbC5zaGFyZXBvaW50LmNvbS8%2FbmF2PWN6MGxNa1ltWkQxaUlWWlNNMGd0UVZOc2FHdFhjRzlCTUVKMWVITTNXV3czWDJ4aVUyNXRZMFpNYURCa1JXOXRkelppU0RSb2VXeEVVbTlvUjFSUmNrbHhZaTE0ZURGelRta21aajB3TVV4TlJWWlpRakkxVlU5UFJVUklSVU5CVWtoWlFVTXpSemRKVGtKRlV6Tk5KbU05Sm1ac2RXbGtQVEUlM0QiLCJyIjpmYWxzZX0sInAiOnsidSI6Imh0dHBzOi8vYWJjcG9ydGFsLnNoYXJlcG9pbnQuY29tLzpmbDovci9jb250ZW50c3RvcmFnZS9DU1BfZjhjNzFkNTUtYTUwNC00NTg2LWE5YTAtMGQwMWJiMWIzYjYyL0RvY3VtZW50JTIwTGlicmFyeS9Mb29wQXBwRGF0YS9VbnRpdGxlZC5sb29wP2Q9dzdiYWFhNjk0YTU2MjRkYjM4MDM0MjIyZGQ1YTUxNDU1JmNzZj0xJndlYj0xJm5hdj1jejBsTWtaamIyNTBaVzUwYzNSdmNtRm5aU1V5UmtOVFVGOW1PR00zTVdRMU5TMWhOVEEwTFRRMU9EWXRZVGxoTUMwd1pEQXhZbUl4WWpOaU5qSW1aRDFpSVZaU00wZ3RRVk5zYUd0WGNHOUJNRUoxZUhNM1dXdzNYMnhpVTI1dFkwWk1hREJrUlc5dGR6WmlTRFJvZVd4RVVtOW9SMVJSY2tseFlpMTRlREZ6VG1rbVpqMHdNVXhOUlZaWlFqUlZWVEpXU0ZkWlZrWlhUa2RaUVU1Q1EwWllTekpMUmtOV0ptTTlKVEpHSm1ac2RXbGtQVEVtWVQxTWIyOXdRWEJ3Sm5BOUpUUXdabXgxYVdSNEpUSkdiRzl2Y0Mxd1lXZGxMV052Ym5SaGFXNWxjZyUzRCUzRCIsInIiOmZhbHNlfSwiaSI6eyJpIjoiNmZkMWE2ZmQtY2IwYS00YzBjLTg5NzAtYmM1NzI1NjE3MWJlIn19'
        )}
    >
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
        {@const filename = config.url.split('?')[0].split('/').pop() || config.url}
        <span title={config.url}>{filename}</span>
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
</fieldset>

<style>
  legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
</style>
