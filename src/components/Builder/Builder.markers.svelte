<script lang="ts">
  import { jsonBlob } from '../../lib/data/blobStore.ts';
  import { blobToDecodedObject } from '../../lib/data/blobAdapter.ts';
  import { applyMarkerOverrides } from '../../lib/data/markerPreview.ts';
  import { decodeMarker, encodeMarker, type MarkerConfig, type BaseStyle } from '../../lib/data/marker.ts';
  import CustomGlobe from '../CustomGlobe/CustomGlobe.svelte';
  import { BuilderFrame, Loader, MarkerAdmin } from '@abcnews/components-builder';
  import type { Map as MapLibreMap } from 'maplibre-gl';
  import PropMarkerLayers from './PropMarkerLayers.svelte';
  import PropMarkerPosition from './PropMarkerPosition.svelte';
  import { MARKER_NAME } from '../../lib/constants.ts';

  let map = $state<MapLibreMap>();

  // The marker currently being edited. Kept in sync with `window.location.hash` — not
  // persisted by the app at all, since markers live in the published story's URL hash,
  // outside Globeyteller. `MarkerAdmin` (below) provides the save/copy/paste/list UI on
  // top of that same hash, the same way `Builder.legacy/Builder.svelte` already does for
  // its whole-page state.
  //
  // `markerConfig`'s initial value is decoded from whatever hash is already in the URL
  // (rather than starting blank and decoding in onMount) so the hash-writing effect below
  // never runs before the existing hash has been read — otherwise its first run would
  // stomp a real marker hash (or a restored session) with an empty one on page load.
  let lastEncodedHash = window.location.hash.slice(1);
  let markerConfig = $state<MarkerConfig>(decodeMarker(lastEncodedHash));

  // Whether each optional/tri-state field is "overridden" for this marker vs inheriting
  // from the master config. Reset whenever a different marker hash is loaded.
  let camEnabled = $state(markerConfig.cam !== undefined);
  let baseEnabled = $state(markerConfig.base !== undefined);
  let labelsEnabled = $state(markerConfig.labels !== undefined);
  let minimapEnabled = $state(markerConfig.minimap !== undefined);

  function syncTriStateFromConfig(config: MarkerConfig) {
    camEnabled = config.cam !== undefined;
    baseEnabled = config.base !== undefined;
    labelsEnabled = config.labels !== undefined;
    minimapEnabled = config.minimap !== undefined;
  }

  const currentOptions = $derived(blobToDecodedObject($jsonBlob));
  const previewOptions = $derived(applyMarkerOverrides(currentOptions, markerConfig));

  // Scrollyteller opener CMID — pre-filled from the loaded blob's source CMID (see
  // Builder.firstrun.svelte's `handleLoadCmid`), otherwise a placeholder the producer
  // must replace before publishing. Editable in case the auto-filled value is wrong or
  // the JSON wasn't loaded from CoreMedia at all.
  let openerCmid = $state($jsonBlob?.sourceCmid ? String($jsonBlob.sourceCmid) : 'fixme');
  const scrollytellerOpener = $derived(`#scrollytellerNAME${MARKER_NAME}${openerCmid}`);

  $effect(() => {
    const hash = `mark${encodeMarker($state.snapshot(markerConfig))}`;
    if (window.location.hash.slice(1) !== hash) {
      lastEncodedHash = hash;
      window.location.hash = hash;
    }
  });

  function updateFromHash() {
    const currentHash = window.location.hash.slice(1);
    if (currentHash === lastEncodedHash) return;
    lastEncodedHash = currentHash;
    const decoded = decodeMarker(currentHash);
    markerConfig = decoded;
    syncTriStateFromConfig(decoded);
  }
</script>

<svelte:window onhashchange={updateFromHash} />

{#snippet Viz()}
  <div class="frame">
    {#if previewOptions.coords}
      <CustomGlobe
        interactive={true}
        options={previewOptions}
        preserveDrawingBuffer={true}
        onLoad={loadedMap => (map = loadedMap)}
      />
    {/if}
  </div>
{/snippet}

{#snippet Sidebar()}
  {#if !map || !$jsonBlob}
    <Loader />
  {:else}
    <fieldset>
      <legend>Positioning</legend>

      <div class="form-row">
        <PropMarkerPosition
          {map}
          bbox={markerConfig.bbox}
          fitGlobe={markerConfig.fitGlobe}
          constrainView={markerConfig.constrainView}
          center={markerConfig.center}
          onchange={patch => (markerConfig = { ...markerConfig, ...patch })}
        />
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={camEnabled}
            onchange={e => {
              camEnabled = e.currentTarget.checked;
              markerConfig = { ...markerConfig, cam: camEnabled ? (markerConfig.cam ?? 1500) : undefined };
            }}
          />
          Immediate camera fly-to on arrival (unchecked = scroll-tied)
        </label>
        {#if camEnabled}
          <div class="form-row-group">
            <input
              type="text"
              inputmode="numeric"
              pattern="[0-9]*"
              value={markerConfig.cam ?? 1500}
              oninput={e => {
                const num = Number(e.currentTarget.value.trim());
                markerConfig = { ...markerConfig, cam: Number.isFinite(num) ? num : 0 };
              }}
            />
            <small>ms</small>
          </div>
        {/if}
      </div>
    </fieldset>

    <fieldset>
      <legend>Layers</legend>
      <PropMarkerLayers
        layers={[...$jsonBlob.layers].reverse()}
        overrides={markerConfig.layers ?? []}
        onchange={next => (markerConfig = { ...markerConfig, layers: next })}
      />
    </fieldset>

    <fieldset>
      <legend>Base &amp; environment</legend>

      <div class="form-row">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={baseEnabled}
            onchange={e => {
              baseEnabled = e.currentTarget.checked;
              markerConfig = { ...markerConfig, base: baseEnabled ? (markerConfig.base ?? 'street') : undefined };
            }}
          />
          Override base style
        </label>
        {#if baseEnabled}
          <div class="radio-group">
            {#each ['satellite', 'street', 'dark'] as const as style}
              <label>
                <input
                  type="radio"
                  name="base-style"
                  value={style}
                  checked={markerConfig.base === style}
                  onchange={() => (markerConfig = { ...markerConfig, base: style as BaseStyle })}
                />
                {style}
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={labelsEnabled}
            onchange={e => {
              labelsEnabled = e.currentTarget.checked;
              markerConfig = { ...markerConfig, labels: labelsEnabled ? (markerConfig.labels ?? true) : undefined };
            }}
          />
          Override base vector labels
        </label>
        {#if labelsEnabled}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={markerConfig.labels ?? true}
              onchange={e => (markerConfig = { ...markerConfig, labels: e.currentTarget.checked })}
            />
            On
          </label>
        {/if}
      </div>

      <div class="form-row">
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={minimapEnabled}
            onchange={e => {
              minimapEnabled = e.currentTarget.checked;
              markerConfig = {
                ...markerConfig,
                minimap: minimapEnabled ? (markerConfig.minimap ?? true) : undefined
              };
            }}
          />
          Override minimap
        </label>
        {#if minimapEnabled}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={markerConfig.minimap ?? true}
              onchange={e => (markerConfig = { ...markerConfig, minimap: e.currentTarget.checked })}
            />
            On
          </label>
        {/if}
      </div>
    </fieldset>

    <fieldset>
      <legend>Save &amp; export</legend>

      <div class="form-row">
        <label for="opener-cmid" class="control-label">Scrollyteller opener CMID</label>
        <input id="opener-cmid" type="text" placeholder="fixme" bind:value={openerCmid} />
      </div>

      <!-- `MarkerAdmin` copies/pastes `prefix + window.location.hash.slice(1)`. Our live
           hash already starts with the literal text "mark" (see the $effect above), so
           the "Mark" prefix here is bare `#` — using `#mark` would double up to `#markmark...`. -->
      <MarkerAdmin
        prefixes={{ Mark: '#', 'Scrollyteller opener': scrollytellerOpener }}
        projectName={$jsonBlob.title || 'dev'}
      />
    </fieldset>
  {/if}
{/snippet}

<BuilderFrame {Viz} {Sidebar} />

<style>
  .frame {
    width: 100%;
    height: 100%;
    border: 0;
    position: relative;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }

  .form-row-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .control-label {
    font-size: 0.85rem;
    color: var(--text-light, #888);
    font-weight: 500;
  }

  .checkbox-label,
  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text, #ccc);
  }

  .radio-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.35rem;
  }
</style>
