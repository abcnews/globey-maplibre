<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import { X } from 'svelte-bootstrap-icons';

  let {
    config,
    map,
    onsave,
    onclose
  }: {
    config: ImageSourceConfig;
    map: maplibregl.Map;
    onsave: (config: ImageSourceConfig) => void;
    onclose: () => void;
  } = $props();

  let url = $state(config.url);
  let opacity = $state(config.opacity);
  let coordsString = $state(JSON.stringify(config.coordinates));
  let isPicking = $state(false);
  let pickedPoints = $state<[number, number][]>([]);

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

  function setWholeWorldPolar() {
    const world = [
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90]
    ];
    coordsString = JSON.stringify(world);
  }

  $effect(() => {
    if (!isPicking || !map) return;

    const onClick = (e: any) => {
      pickedPoints = [...pickedPoints, [e.lngLat.lng, e.lngLat.lat]];
      if (pickedPoints.length === 4) {
        coordsString = JSON.stringify(pickedPoints);
        isPicking = false;
        pickedPoints = [];
      }
    };

    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  });
</script>

<div class="modal-backdrop">
  <div class="modal">
    <header>
      <h3>Edit Image Source</h3>
      <button class="btn-icon" onclick={onclose}><X /></button>
    </header>

    <div class="content">
      <div class="field">
        <label for="img-url">Image URL</label>
        <input id="img-url" type="text" bind:value={url} placeholder="https://..." />
      </div>

      <div class="field">
        <label for="img-opacity">Opacity ({Math.round(opacity * 100)}%)</label>
        <input id="img-opacity" type="range" min="0" max="1" step="0.01" bind:value={opacity} />
      </div>

      <div class="field">
        <label for="img-coords">Coordinates (TL, TR, BR, BL)</label>
        <textarea id="img-coords" bind:value={coordsString} rows="4"></textarea>
        <div class="helpers">
          <button type="button" class="btn-small" onclick={() => (isPicking = !isPicking)}>
            {isPicking ? `Click ${4 - pickedPoints.length} more` : 'Pick on Map'}
          </button>
          <button type="button" class="btn-small" onclick={setWholeWorld}>Whole World (Mercator)</button>
          <button type="button" class="btn-small" onclick={setWholeWorldPolar}>Whole World (Polar/Equi)</button>
        </div>
      </div>
    </div>

    <footer>
      <button class="btn-secondary" onclick={onclose}>Cancel</button>
      <button class="btn-primary" onclick={handleSave}>Save</button>
    </footer>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: white;
    padding: 1rem;
    border-radius: 4px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  header h3 {
    margin: 0;
  }
  .field {
    margin-bottom: 1rem;
  }
  .field label {
    display: block;
    font-weight: bold;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }
  .field input[type='text'],
  .field textarea {
    width: 100%;
    padding: 0.4rem;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.8rem;
  }
  .helpers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.4rem;
  }
  .btn-small {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }
  .btn-primary {
    background: #007bff;
    color: white;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 3px;
  }
  .btn-secondary {
    background: #eee;
    border: 1px solid #ccc;
    padding: 0.4rem 1rem;
    border-radius: 3px;
  }
</style>
