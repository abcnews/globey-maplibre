<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import { untrack } from 'svelte';
  import type { GriddedLayer } from '../../../lib/data/jsonBlob.ts';
  import { isValidUrl } from '../../../lib/data/layerHelpers.ts';
  import VerticalTabs from '../../shared/VerticalTabs.svelte';
  import LayerSettingsFields from '../utils/LayerSettingsFields.svelte';
  import BuilderPropColourScale from '../utils/colourScale/BuilderPropColourScale.svelte';
  import { loadGrid } from './data/loadGrid.ts';
  import type { DecodedGrid } from './data/types.ts';
  import { renderGridPixels } from './render/gridToImage.ts';
  import { gridExtent, sampleGridValues } from './render/stats.ts';
  import { formatDegrees, niceNumber } from './utils.ts';

  interface Props {
    /** The gridded layer being edited — edited in place, committed by the Builder on close */
    config: GriddedLayer;
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  /** Wait this long after typing stops before downloading a URL. */
  const URL_DEBOUNCE_MS = 500;
  const CLASS_OPTIONS = [3, 4, 5, 6, 7, 8, 9, 10];
  /** The preview is shown at most ~240px tall, so it's rendered small to stay quick while dragging. */
  const PREVIEW_MAX_SIDE = 512;

  let activeTab = $state<'source' | 'style'>('source');
  let urlInput = $state(untrack(() => config.url));
  let status = $state<'empty' | 'loading' | 'loaded' | 'error'>('empty');
  let errorMessage = $state('');
  let grid = $state.raw<DecodedGrid>();

  const samples = $derived(grid ? sampleGridValues(grid.values) : []);
  /** Smoothing is MapLibre's `linear` raster resampling; `nearest` keeps cell edges sharp. */
  const isSmooth = $derived(config.resampling === 'linear');

  // ---- Source: debounce the URL, then download and decode the file ----
  $effect(() => {
    const url = urlInput.trim();
    const timer = setTimeout(() => {
      config.url = url;
    }, URL_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const { url, band } = config;
    grid = undefined;
    if (!url) return void (status = 'empty');
    if (!isValidUrl(url)) {
      status = 'error';
      errorMessage = 'Preview URLs are not allowed. Use a live URL.';
      return;
    }

    let isCurrent = true;
    status = 'loading';
    loadGrid({ url, band })
      .then(decoded => {
        if (!isCurrent) return;
        grid = decoded;
        status = 'loaded';
        fillMissingRange(decoded);
      })
      .catch(err => {
        if (!isCurrent) return;
        status = 'error';
        errorMessage = err.message;
      });
    return () => {
      isCurrent = false;
    };
  });

  /** Seeds min/max from the data the first time a band is shown. */
  function fillMissingRange(decoded: DecodedGrid) {
    const extent = gridExtent(decoded.values);
    if (!extent) return;
    const { colourConfig } = config;
    if (colourConfig.min === undefined) colourConfig.min = niceNumber(extent[0], 'floor');
    if (colourConfig.max === undefined) colourConfig.max = niceNumber(extent[1], 'ceil');
  }

  /** A different band has different values, so the old range no longer applies. */
  function selectBand(band: number) {
    config.band = band;
    config.colourConfig.min = undefined;
    config.colourConfig.max = undefined;
  }

  function setNoData(event: Event) {
    const { value } = event.currentTarget as HTMLInputElement;
    config.noData = value === '' ? undefined : Number(value);
  }

  // ---- Preview: the coloured grid, as it will look on the map ----
  const styleKey = $derived(
    JSON.stringify({
      colourConfig: config.colourConfig,
      noData: config.noData,
      hideBelowMin: config.hideBelowMin,
      hideAboveMax: config.hideAboveMax,
      classes: config.classes
    })
  );

  /** Attachment: redraws whenever the grid or styling changes. */
  function drawPreview(canvas: HTMLCanvasElement) {
    const style = JSON.parse(styleKey);
    if (!grid) return;

    const { width, height, data } = renderGridPixels(grid, style, PREVIEW_MAX_SIDE);
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  }
</script>

{#snippet footerChildren()}
  <button type="button" onclick={() => onclose?.()}>OK</button>
{/snippet}

<Modal title="Gridded data layer" position="right" onClose={() => onclose?.()} {footerChildren}>
  <VerticalTabs
    tabs={[
      { id: 'source', label: 'Source' },
      { id: 'style', label: 'Style' }
    ]}
    bind:activeTab
  >
    {#if activeTab === 'source'}
      <fieldset>
        <legend>Data file</legend>
        <div class="field-group">
          <label for="gridded-url">GeoTIFF URL</label>
          <input id="gridded-url" type="text" placeholder="https://…/data.tif" bind:value={urlInput} />
          <small class="help-text">The server must allow cross-origin requests. The whole file is downloaded.</small>
        </div>

        {#if status === 'loading'}
          <p class="help-text">Loading…</p>
        {:else if status === 'error'}
          <p class="error-text">{errorMessage}</p>
        {/if}

        {#if grid}
          {@const [west, south, east, north] = grid.bounds}
          {@const extent = gridExtent(grid.values)}
          <ul class="file-info">
            <li>{grid.width} × {grid.height} cells ({niceNumber((east - west) / grid.width)}°, EPSG:{grid.crs})</li>
            <li>
              {formatDegrees(west, 'lng')} to {formatDegrees(east, 'lng')}, {formatDegrees(south, 'lat')} to
              {formatDegrees(north, 'lat')}
            </li>
            <li class:error-text={!extent}>
              {extent ? `Values ${niceNumber(extent[0])} to ${niceNumber(extent[1])}` : 'This band has no data.'}
            </li>
          </ul>
        {/if}
      </fieldset>

      {#if grid && grid.bandCount > 1}
        <fieldset>
          <legend>Band</legend>
          <select value={config.band} onchange={event => selectBand(Number(event.currentTarget.value))}>
            {#each Array.from({ length: grid.bandCount }, (_, band) => band) as band (band)}
              <option value={band}>Band {band + 1}</option>
            {/each}
          </select>
        </fieldset>
      {/if}

      <LayerSettingsFields bind:animationClock={config.animationClock} bind:id={config.id} />
    {:else if activeTab === 'style'}
      {#if grid}
        <canvas class="preview" class:smooth={isSmooth} {@attach drawPreview}></canvas>

        <fieldset>
          <legend>Colour scale</legend>
          <BuilderPropColourScale
            bind:colourConfig={config.colourConfig}
            values={samples}
            classes={config.classes}
            idPrefix="gridded"
          />

          <div class="field-row">
            <div class="field-group">
              <label for="gridded-classes">Steps</label>
              <select
                id="gridded-classes"
                value={config.classes ?? ''}
                onchange={event => (config.classes = Number(event.currentTarget.value) || undefined)}
              >
                <option value="">Continuous</option>
                {#each CLASS_OPTIONS as count (count)}
                  <option value={count}>{count} steps</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="field-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={config.hideBelowMin} />
              Make values below min transparent
            </label>
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={config.hideAboveMax} />
              Make values above max transparent
            </label>
            <small class="help-text">Otherwise they take the lowest or highest colour.</small>
          </div>
        </fieldset>

        <fieldset>
          <legend>Display</legend>
          <div class="field-row">
            <div class="field-group">
              <label for="gridded-opacity">Opacity: {Math.round(config.opacity * 100)}%</label>
              <input id="gridded-opacity" type="range" min="0" max="1" step="0.05" bind:value={config.opacity} />
            </div>
            <div class="field-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={isSmooth}
                  onchange={event => (config.resampling = event.currentTarget.checked ? 'linear' : 'nearest')}
                />
                Smooth cell edges
              </label>
              <small class="help-text">Blends colours between cells. Turn off for sharp edges (e.g. with Steps).</small>
            </div>
          </div>
          <div class="field-group">
            <label for="gridded-nodata">Extra no-data value</label>
            <input
              id="gridded-nodata"
              type="number"
              step="any"
              placeholder="None (the file's own no-data is always hidden)"
              value={config.noData ?? ''}
              onchange={setNoData}
            />
          </div>
        </fieldset>
      {:else}
        <p class="help-text">Load a file on the Source tab first.</p>
      {/if}
    {/if}
  </VerticalTabs>
</Modal>

<style>
  fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex: 1;
    min-width: 0;
  }
  .field-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }
  .field-row {
    display: flex;
    gap: 0.75rem;
  }
  .file-info {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.8rem;
  }
  .preview {
    width: 100%;
    max-height: 240px;
    object-fit: contain;
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    border-radius: 4px;
    background: repeating-conic-gradient(#8882 0 25%, transparent 0 50%) 0 0 / 12px 12px;
    image-rendering: pixelated;
  }
  .preview.smooth {
    image-rendering: auto;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }
  .error-text {
    font-size: 0.8rem;
    color: var(--error, #c62828);
  }
</style>
