<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { RasterLayerConfig } from '../../../lib/marker/types.ts';
  import LayerSettingsFields from '../LayerSettingsFields.svelte';

  interface Props {
    /** The RasterLayerConfig object being edited or drafted */
    config: Partial<RasterLayerConfig>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  const PRESETS: Record<string, { label: string; url: string; maxZoom: number; attribution: string; darkTheme: boolean }> = {
    blueMarble: {
      label: 'NASA Blue Marble',
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      attribution: 'NASA Blue Marble',
      darkTheme: true
    },
    blackMarble: {
      label: 'NASA Black Marble',
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-black-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      attribution: 'NASA Black Marble',
      darkTheme: true
    }
  };

  function detectPreset(url?: string): string {
    if (!url) return 'blueMarble';
    if (url === PRESETS.blueMarble.url) return 'blueMarble';
    if (url === PRESETS.blackMarble.url) return 'blackMarble';
    return 'custom';
  }

  let selectedPreset = $derived(detectPreset(config.url));

  function selectPreset(presetKey: string) {
    if (presetKey in PRESETS) {
      const preset = PRESETS[presetKey];
      config.url = preset.url;
      config.maxZoom = preset.maxZoom;
      config.attribution = preset.attribution;
      config.darkTheme = preset.darkTheme;
    }
  }

  let boundsString = $state(JSON.stringify(config.bounds ?? []));

  function commitBounds() {
    let bounds;
    try {
      bounds = JSON.parse(boundsString);
    } catch (e) {
      alert('Invalid bounds format. Must be [[lng, lat], [lng, lat], [lng, lat], [lng, lat]]');
      boundsString = JSON.stringify(config.bounds ?? []);
      return;
    }
    config.bounds = bounds?.length > 0 ? bounds : undefined;
    boundsString = JSON.stringify(config.bounds ?? []);
  }

  function setWholeWorldBounds() {
    boundsString = JSON.stringify([
      [-180, 85.0511],
      [180, 85.0511],
      [180, -85.0511],
      [-180, -85.0511]
    ]);
    commitBounds();
  }

  function clearBounds() {
    boundsString = '[]';
    commitBounds();
  }
</script>

<Modal title="Raster Tile Layer" onClose={() => onclose?.()} position="right">
  <div class="raster-modal">
    <fieldset>
      <legend>Preset</legend>
      <div class="preset-buttons">
        <button
          type="button"
          class="btn-preset"
          class:active={selectedPreset === 'blueMarble'}
          onclick={() => selectPreset('blueMarble')}
        >
          NASA Blue Marble
        </button>
        <button
          type="button"
          class="btn-preset"
          class:active={selectedPreset === 'blackMarble'}
          onclick={() => selectPreset('blackMarble')}
        >
          NASA Black Marble
        </button>
        <button
          type="button"
          class="btn-preset"
          class:active={selectedPreset === 'custom'}
          onclick={() => {}}
        >
          Custom URL
        </button>
      </div>
    </fieldset>

    <fieldset>
      <legend>Tile Configuration</legend>
      <div class="field-group">
        <label for="raster-url">Tile URL Template</label>
        <input
          id="raster-url"
          type="text"
          bind:value={config.url}
          placeholder={'https://example.com/{z}/{x}/{y}.png'}
        />
        <small class="help-text">Must include <code>&#123;z&#125;</code>, <code>&#123;x&#125;</code>, and <code>&#123;y&#125;</code> parameters.</small>
      </div>

      <div class="field-row">
        <div class="field-group">
          <label for="raster-max-zoom">Max Zoom</label>
          <input id="raster-max-zoom" type="number" min="0" max="22" bind:value={config.maxZoom} />
        </div>
        <div class="field-group flex-1">
          <label for="raster-attribution">Attribution</label>
          <input id="raster-attribution" type="text" placeholder="e.g. NASA, Mapbox" bind:value={config.attribution} />
        </div>
      </div>

      <div class="field-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={config.darkTheme} />
          Dark imagery
        </label>
        <small class="help-text">Enable for imagery with a dark background (e.g. satellite/night imagery) so labels switch to light-on-dark styling.</small>
      </div>
    </fieldset>

    <fieldset>
      <legend>Bounds (TL, TR, BR, BL) — optional, defaults to whole world</legend>
      <div class="field-group">
        <label for="raster-bounds">Bounds</label>
        <textarea
          id="raster-bounds"
          rows="4"
          bind:value={boundsString}
          onblur={commitBounds}
          placeholder="[[lng, lat], [lng, lat], [lng, lat], [lng, lat]]"
        ></textarea>
        <small class="help-text">Restricts tile loading to this box so tiles outside the tileset's coverage aren't requested. Leave empty for whole-world.</small>
        <div class="preset-buttons">
          <button type="button" class="btn-preset" onclick={setWholeWorldBounds}>Whole World</button>
          <button type="button" class="btn-preset" onclick={clearBounds}>Clear</button>
        </div>
      </div>
    </fieldset>

    <LayerSettingsFields bind:animationClock={config.animationClock} bind:name={config.name} />
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={() => onclose?.()}>OK</button>
  {/snippet}
</Modal>

<style>
  .raster-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 380px;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn-preset {
    font-size: 0.8rem;
    padding: 0.35rem 0.65rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-preset:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .btn-preset.active {
    background: #0056b3;
    border-color: #007bff;
    color: #fff;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .field-group:last-child {
    margin-bottom: 0;
  }

  .field-row {
    display: flex;
    gap: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .flex-1 {
    flex: 1;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }

  .help-text code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.1rem 0.25rem;
    border-radius: 2px;
  }
</style>
