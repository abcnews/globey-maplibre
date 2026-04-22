<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import ImageSourceConfigModal from './ImageSourceConfigModal.svelte';
  import { Pencil, Trash, QuestionCircle, Plus } from 'svelte-bootstrap-icons';
  import { safeFitBounds } from '../utils';
  import PropList from '../PropList.svelte';

  import type { maplibregl, DecodedObject } from '../../mapLibre/index';

  let {
    options = $bindable(),
    map,
    onchange
  } = $props<{
    options: DecodedObject;
    map: maplibregl.Map;
    onchange: (list: ImageSourceConfig[]) => void;
  }>();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  function saveConfig(config: ImageSourceConfig, goto = false) {
    const newList = [...(options.imageSources || [])];
    if (editingIndex !== null) {
      newList[editingIndex] = config;
    } else if (isAdding) {
      newList.push(config);
    }
    options.imageSources = newList;
    onchange(newList);

    if (goto && config.coordinates.length > 0) {
      options.bounds = config.coordinates;
      options.constrainView = true;
      options.fitGlobe = false;

      const bounds = config.coordinates.reduce(
        (acc, coord) => {
          acc.extend(coord as [number, number]);
          return acc;
        },
        new (window as any).maplibregl.LngLatBounds(
          config.coordinates[0] as [number, number],
          config.coordinates[0] as [number, number]
        )
      );

      safeFitBounds(map, bounds, { padding: 50 });
    }

    closeModal();
  }

  function removeConfig(index: number) {
    const newList = (options.imageSources || []).filter(
      (_val: ImageSourceConfig, i: number) => i !== index
    );
    options.imageSources = newList;
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
    <button
      class="btn-icon"
      aria-label="Help"
      title="Help"
      onclick={() =>
        window.open(
          'https://loop.cloud.microsoft/p/eyJ3Ijp7InUiOiJodHRwczovL2FiY3BvcnRhbC5zaGFyZXBvaW50LmNvbS8%2FbmF2PWN6MGxNa1ltWkQxaUlWWlNNMGd0UVZOc2FHdFhjRzlCTUVKMWVITTNXV3czWDJ4aVUyNXRZMFpNYURCa1JXOXRkelppU0RSb2VXeEVVbTlvUjFSUmNrbHhZaTE0ZURGelRta21aajB3TVV4TlJWWlpRakkxVlU5UFJVUklSVU5CVWtoWlFVTXpSemRKVGtKRlV6Tk5KbU05Sm1ac2RXbGtQVEUlM0QiLCJyIjpmYWxzZX0sInAiOnsidSI6Imh0dHBzOi8vYWJjcG9ydGFsLnNoYXJlcG9pbnQuY29tLzpmbDovci9jb250ZW50c3RvcmFnZS9DU1BfZjhjNzFkNTUtYTUwNC00NTg2LWE5YTAtMGQwMWJiMWIzYjYyL0RvY3VtZW50JTIwTGlicmFyeS9Mb29wQXBwRGF0YS9VbnRpdGxlZC5sb29wP2Q9dzUyMjYzYThiMWJiNjQ1OThiOTI1MjkxYjNlMDAxMmMxJmNzZj0xJndlYj0xJm5hdj1jejBsTWtaamIyNTBaVzUwYzNSdmNtRm5aU1V5UmtOVFVGOW1PR00zTVdRMU5TMWhOVEEwTFRRMU9EWXRZVGxoTUMwd1pEQXhZbUl4WWpOaU5qSW1aRDFpSVZaU00wZ3RRVk5zYUd0WGNHOUJNRUoxZUhNM1dXdzNYMnhpVTI1dFkwWk1hREJrUlc5dGR6WmlTRFJvZVd4RVVtOW9SMVJSY2tseFlpMTRlREZ6VG1rbVpqMHdNVXhOUlZaWlFqUk1TRWxVUmtaT1VUTlVRa016VTBwS1NrUk5OMEZCUlZkQ0ptTTlKVEpHSm1ac2RXbGtQVEVtWVQxTWIyOXdRWEJ3Sm5BOUpUUXdabXgxYVdSNEpUSkdiRzl2Y0Mxd1lXZGxMV052Ym5SaGFXNWxjZyUzRCUzRCIsInIiOmZhbHNlfSwiaSI6eyJpIjoiNDM2MjExODItNGEyZi00NDMzLWI0ZWQtZjEyYjliMzM3ZmQ1In19'
        )}
    >
      <QuestionCircle />
    </button>
  </legend>

  {#if (options.imageSources || []).length === 0}
    <small>Click <code>+</code> to add an image overlay</small>
  {:else}
    <PropList items={options.imageSources || []} {onchange}>
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
        ? options.imageSources?.[editingIndex]!
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
