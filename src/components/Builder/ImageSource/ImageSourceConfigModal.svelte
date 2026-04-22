<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { untrack } from 'svelte';
  import type { ImageSourceConfig } from '../../../lib/marker';
  import KmlImportButton from './KmlImportButton.svelte';
  import NearmapImportButton from './NearmapImportButton.svelte';
  import GeoTiffImportButton from './GeoTiffImportButton.svelte';
  import FilenameImportButton from './FilenameImportButton.svelte';
  import { isValidUrl } from '../../../lib/marker';
  import { parseFilenameCoords, parseCoordinates, calculateBoundsFromWidth } from './utils';

  let {
    config,
    onsave,
    onclose
  }: {
    config: ImageSourceConfig;
    onsave: (config: ImageSourceConfig, goto?: boolean) => void;
    onclose: () => void;
  } = $props();

  let url = $state(untrack(() => $state.snapshot(config).url));
  let opacity = $state(untrack(() => $state.snapshot(config).opacity));
  let coordsString = $state(untrack(() => JSON.stringify($state.snapshot(config).coordinates)));

  $effect(() => {
    if (url) {
      const extractedCoords = parseFilenameCoords(url);
      if (extractedCoords) {
        coordsString = JSON.stringify(extractedCoords, null, 2);
      }
    }
  });

  let naturalWidth = $state(0);
  let naturalHeight = $state(0);

  function handleSave(goto = false) {
    if (!isValidUrl(url)) {
      alert('Preview URLs are not allowed. Please use a live-production or res/sites URL.');
      return;
    }

    let coordinates;
    try {
      coordinates = JSON.parse(coordsString);
    } catch (e) {
      alert('Invalid coordinates format. Must be [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]');
      return;
    }

    onsave({ ...config, url, opacity, coordinates }, goto);
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

  function importFromGoogleEarth() {
    if (naturalWidth === 0) {
      alert('Please wait for the image to load first to determine its aspect ratio.');
      return;
    }

    const coordInput = window.prompt(
      'Enter Center Coordinates (DMS or Decimal, e.g. -22.97, 145.24)'
    );
    if (!coordInput) return;
    const coords = parseCoordinates(coordInput);
    if (!coords) {
      alert(
        'Could not parse coordinates. Please ensure both Lat and Lng are included in DMS format.'
      );
      return;
    }

    const widthInput = window.prompt('Enter ground width in km (e.g. 3.61km)');
    if (!widthInput) return;
    const widthKm = Number(widthInput.replace(/[^0-9.]/g, ''));
    if (isNaN(widthKm) || widthKm <= 0) {
      alert('Invalid width');
      return;
    }

    const aspectRatio = naturalWidth / naturalHeight;
    const coordinates = calculateBoundsFromWidth(coords.lat, coords.lng, widthKm, aspectRatio, 0);

    coordsString = JSON.stringify(coordinates, null, 2);
  }
</script>

<Modal title="Edit Image Source" onClose={onclose}>
  <div class="modal-content-split">
    <div class="modal-form">
      <fieldset>
        <legend>Data source</legend>
        <label for="img-url">Image URL</label>
        <input id="img-url" type="text" bind:value={url} placeholder="https://..." />
        <p style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
          Use <code>live-production</code> or <code>res/sites</code> URLs. <code>preview</code> is not supported.
        </p>
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
          <FilenameImportButton onimport={handleKmlImport} />
          <NearmapImportButton onimport={handleKmlImport} width={naturalWidth} height={naturalHeight} />
          <GeoTiffImportButton onimport={handleKmlImport} />
          <button type="button" onclick={importFromGoogleEarth}>Import from coord + width</button>
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

  {#snippet footerChildren()}
    <button onclick={() => handleSave()}>Save</button>
    <button onclick={() => handleSave(true)}>Save and Go To</button>
    <button onclick={onclose}>Cancel</button>
  {/snippet}
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
