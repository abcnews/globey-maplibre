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

  let naturalWidth = $state(0);
  let naturalHeight = $state(0);

  function handleSave() {
    try {
      const coordinates = JSON.parse(coordsString);
      onsave({ ...config, url, opacity, coordinates });
    } catch (e) {
      alert('Invalid coordinates format. Must be [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]');
    }
  }

  function handleImageLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    naturalWidth = img.naturalWidth;
    naturalHeight = img.naturalHeight;
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
  <div class="modal-content-split">
    <div class="modal-form">
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
          <NearmapImportButton onimport={handleKmlImport} width={naturalWidth} height={naturalHeight} />
        </div>
      </fieldset>
    </div>

    <div class="modal-preview">
      {#if url}
        <div class="preview-container">
          <img src={url} alt="Source Preview" onload={handleImageLoad} />
          {#if naturalWidth > 0}
            <div class="preview-info">
              {naturalWidth} &times; {naturalHeight} px
            </div>
          {/if}
        </div>
      {:else}
        <div class="preview-placeholder">Enter a URL to preview image</div>
      {/if}
    </div>
  </div>
</Modal>

<style>
  .modal-content-split {
    display: flex;
    gap: 1.5rem;
    min-width: 800px;
  }

  .modal-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-preview {
    flex: 1;
    background: #eee;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    position: relative;
    overflow: hidden;
  }

  .preview-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .preview-container img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .preview-info {
    position: absolute;
    bottom: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
  }

  .preview-placeholder {
    color: #888;
    text-align: center;
  }

  input[type='text'],
  textarea {
    width: 100%;
    box-sizing: border-box;
  }

  label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
  }
</style>
