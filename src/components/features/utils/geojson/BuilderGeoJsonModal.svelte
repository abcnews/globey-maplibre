<script lang="ts" generics="Layer extends GeoJsonAnyLayer">
  import { Modal } from '@abcnews/components-builder';
  import type { Snippet } from 'svelte';
  import type { GeoJsonAnyLayer } from '../../../../lib/data/jsonBlob.ts';
  import { fetchGeoJsonData } from './data.ts';
  import { isValidUrl } from '../../../../lib/data/layerHelpers.ts';
  import BuilderPropGeoJsonFilter from './BuilderPropGeoJsonFilter.svelte';
  import BuilderPropGeoJsonColour from './BuilderPropGeoJsonColour.svelte';
  import VerticalTabs from '../../../shared/VerticalTabs.svelte';
  import LayerSettingsFields from '../LayerSettingsFields.svelte';
  import { untrack } from 'svelte';

  interface Props {
    /** The GeoJSON layer (any kind) being edited or drafted */
    config: Layer;
    /** Modal heading, e.g. "Edit areas" */
    title: string;
    /** Kind-specific fields (size, reveal animation…) shown on the Config tab once data loads.
     *  Receives the draft, which it may mutate directly. */
    kindFields?: Snippet<[Layer]>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), title, kindFields, onclose }: Props = $props();

  let activeTab = $state<'config' | 'style'>('config');

  let rawSourceInput = $state<string>(
    untrack(() => {
      const snap = $state.snapshot(config);
      return snap?.url ? snap.url : snap?.cmid ? String(snap.cmid) : '';
    })
  );

  let draftConfig = $state<Layer>(
    untrack(() => {
      const snap = $state.snapshot(config) as Layer;
      return {
        ...snap,
        colourMode: snap.colourMode ?? 'simple',
        cmid: snap.cmid ? snap.cmid : undefined,
        url: snap.url ?? undefined
      };
    })
  );
  let status = $state<'no-data' | 'loading' | 'loaded' | 'error'>(
    untrack(() => {
      const snap = $state.snapshot(config);
      return snap?.cmid || snap?.url ? 'loading' : 'no-data';
    })
  );
  let errorMessage = $state<string | undefined>();
  let properties = $state<string[]>([]);
  let featureCount = $state(0);
  let rawFeatures = $state<any[]>([]);
  let lastSourceKey = '';

  function isUrlInput(val: string): boolean {
    const trimmed = val.trim();
    if (!trimmed) return false;
    return (
      /^https?:\/\//i.test(trimmed) ||
      trimmed.startsWith('/') ||
      trimmed.includes('/') ||
      /\.(geojson|json|topojson)(\?.*)?$/i.test(trimmed) ||
      isNaN(Number(trimmed))
    );
  }

  async function fetchAndParse(source: { cmid?: number; url?: string }) {
    if (source.cmid && (isNaN(source.cmid) || source.cmid <= 0)) {
      status = 'no-data';
      return;
    }
    if (source.url && !isValidUrl(source.url)) {
      status = 'no-data';
      return;
    }
    if (!source.cmid && !source.url) {
      status = 'no-data';
      return;
    }

    status = 'loading';
    errorMessage = undefined;
    try {
      const geojson = await fetchGeoJsonData(source);

      // Analyze properties
      const propsSet = new Set<string>();
      let features: any[] = [];
      if (geojson.features && Array.isArray(geojson.features)) {
        features = geojson.features;
      } else if (geojson.type === 'Feature') {
        features = [geojson];
      }
      features.forEach((f: any) => {
        if (f.properties) {
          Object.keys(f.properties).forEach(k => propsSet.add(k));
        }
      });
      properties = Array.from(propsSet).sort();
      featureCount = features.length;
      rawFeatures = features;
      status = 'loaded';
    } catch (e: any) {
      console.error('[BuilderGeoJsonModal fetchAndParse:error]', e);
      errorMessage = e.message;
      properties = [];
      featureCount = 0;
      rawFeatures = [];
      status = 'error';
    }
  }

  $effect(() => {
    const trimmed = rawSourceInput.trim();
    if (!trimmed) {
      status = 'no-data';
      lastSourceKey = '';
      return;
    }

    if (isUrlInput(trimmed)) {
      draftConfig.url = trimmed;
      delete (draftConfig as any).cmid;
      const currentKey = `url:${trimmed}`;
      if (currentKey !== lastSourceKey) {
        lastSourceKey = currentKey;
        fetchAndParse({ url: trimmed });
      }
    } else {
      const num = Number(trimmed);
      if (num > 0) {
        draftConfig.cmid = num;
        delete (draftConfig as any).url;
        const currentKey = `cmid:${num}`;
        if (currentKey !== lastSourceKey) {
          lastSourceKey = currentKey;
          fetchAndParse({ cmid: num });
        }
      } else {
        status = 'no-data';
        lastSourceKey = '';
      }
    }
  });

  function getUniqueValues(prop: string): string[] {
    const set = new Set<string>();
    rawFeatures.forEach(f => {
      if (f.properties && f.properties[prop] !== undefined) {
        set.add(String(f.properties[prop]));
      }
    });
    return Array.from(set).sort();
  }

  /** Copies every drafted field onto `config` — source fields (`cmid`/`url`) are set by `handleSave` first. */
  function commitDraft() {
    const { cmid: _cmid, url: _url, ...draftFields } = $state.snapshot(draftConfig) as Layer;
    Object.assign(config, draftFields);
  }

  function handleSave() {
    const trimmed = rawSourceInput.trim();
    if (!trimmed) {
      alert('Please enter a valid CMID or URL.');
      return;
    }

    const isUrl = isUrlInput(trimmed);
    if (isUrl) {
      if (!isValidUrl(trimmed)) {
        console.warn('[BuilderGeoJsonModal handleSave:invalid_url]', trimmed);
        alert('Preview URLs are not allowed. Please use a live-production or res/sites URL.');
        return;
      }
      config.url = trimmed;
      delete (config as any).cmid;
      commitDraft();
    } else {
      const numericCmid = Number(trimmed);
      if (!numericCmid || isNaN(numericCmid) || numericCmid <= 0) {
        console.warn('[BuilderGeoJsonModal handleSave:invalid_cmid]', trimmed);
        alert('Please enter a valid CMID.');
        return;
      }
      config.cmid = numericCmid;
      delete (config as any).url;
      commitDraft();
    }
    console.log('[BuilderGeoJsonModal handleSave] Saved config:', $state.snapshot(config));

    onclose?.();
  }
</script>

{#snippet footerChildren()}
  <button onclick={handleSave}>Save</button>
  <button onclick={() => onclose?.()}>Cancel</button>
{/snippet}

<Modal onClose={() => onclose?.()} {title} {footerChildren}>
  <VerticalTabs
    tabs={[
      { id: 'config', label: 'Config' },
      { id: 'style', label: 'Style' }
    ]}
    bind:activeTab
  >
    {#if activeTab === 'config'}
      <LayerSettingsFields bind:animationClock={draftConfig.animationClock} bind:name={draftConfig.name} />

      <fieldset>
        <legend
          >Data source
          {#if status === 'loaded'}
            (<small class="stat">{featureCount} features</small>)
          {/if}</legend
        >
        <div class="field-group">
          <label for="gj-source">CMID or GeoJSON / TopoJSON URL</label>
          <div class="source-input-row">
            <input id="gj-source" type="text" placeholder="e.g. 106753230 or https://..." bind:value={rawSourceInput} />
            {#if status === 'loading'}
              <span class="source-loading-badge">Loading...</span>
            {/if}
          </div>
          <small class="help-text">
            Enter a CoreMedia document ID (CMID) or paste a direct GeoJSON / TopoJSON URL.
          </small>
        </div>

        {#if status === 'loading'}
          <div style:padding="0.5rem 0">Loading metadata...</div>
        {/if}
        {#if status === 'error'}
          <div style:padding="0.5rem 0" style="color:var(--builder-color-danger, red)">{errorMessage}</div>
        {/if}
      </fieldset>

      {#if status === 'loaded'}
        {@render kindFields?.(draftConfig)}
      {/if}
    {:else if activeTab === 'style'}
      {#if status === 'loaded'}
        <p class="gj-note">Adjust how your GeoJSON layer displays.</p>

        <BuilderPropGeoJsonFilter bind:style={draftConfig} {properties} {getUniqueValues} />

        <BuilderPropGeoJsonColour bind:style={draftConfig} {properties} features={rawFeatures} />
      {:else}
        <div style:padding="1rem" style:text-align="center" style:color="var(--text-light, #888)">
          Loading data to configure styles...
        </div>
      {/if}
    {/if}
  </VerticalTabs>
</Modal>

<style>
  .gj-note {
    font-size: 0.85em;
    color: var(--text-light, #888);
    opacity: 0.8;
    margin-bottom: 0.75rem;
    padding: 0 0.25rem;
  }

  .source-input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }

  .source-input-row input {
    flex: 1;
    width: 100%;
    box-sizing: border-box;
  }

  .source-loading-badge {
    position: absolute;
    right: 0.5rem;
    font-size: 0.75rem;
    color: var(--text-light, #888);
    pointer-events: none;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-group label {
    font-size: 0.85rem;
    font-weight: 500;
  }

  .help-text {
    font-size: 0.75rem;
    color: var(--text-light, #888);
  }
</style>
