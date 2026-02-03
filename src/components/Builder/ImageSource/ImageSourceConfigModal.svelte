<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { ImageSourceConfig } from '../../../lib/marker';
  import KmlImportButton from './KmlImportButton.svelte';
  import NearmapImportButton from './NearmapImportButton.svelte';

  let {
    config,
    onsave,
    onclose
  }: {
    config: ImageSourceConfig;
    onsave: (config: ImageSourceConfig) => void;
    onclose: () => void;
  } = $props();

  let url = $state(config.url);
  let opacity = $state(config.opacity);
  let coordsString = $state(JSON.stringify(config.coordinates));

  function handleSave() {
    try {
      const coordinates = JSON.parse(coordsString);
      onsave({ ...config, url, opacity, coordinates });
    } catch (e) {
      alert('Invalid coordinates format. Must be [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]');
    }
  }

  function setWholeWorld() {
    const world = [
      [-180, 85.0511],
      [180, 85.0511],
      [180, -85.0511],
      [-180, -85.0511]
    ];
    coordsString = JSON.stringify(world);
  }

  function handleKmlImport(coordinates: [number, number][]) {
    coordsString = JSON.stringify(coordinates);
  }
</script>

{#snippet footerChildren()}
  <button onclick={handleSave}>Save</button>
  <button onclick={onclose}>Cancel</button>
{/snippet}

<Modal title="Edit Image Source" onClose={onclose} {footerChildren}>
  <fieldset>
    <legend>Data source</legend>
    <label for="img-url">Image URL</label>
    <input id="img-url" type="text" bind:value={url} placeholder="https://..." />
  </fieldset>

  <fieldset>
    <legend>Appearance</legend>
    <label for="img-opacity">Opacity ({Math.round(opacity * 100)}%)</label>
    <input id="img-opacity" type="range" min="0" max="1" step="0.01" bind:value={opacity} />
  </fieldset>

  <fieldset>
    <legend>Coordinates (TL, TR, BR, BL)</legend>
    <textarea id="img-coords" bind:value={coordsString} rows="4" style="width: 100%; font-family: monospace;"
    ></textarea>
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
      <button type="button" onclick={setWholeWorld}>Whole World (Mercator)</button>
      <KmlImportButton onimport={handleKmlImport} />
      <NearmapImportButton onimport={handleKmlImport} />
    </div>
  </fieldset>
</Modal>

<style>
</style>
