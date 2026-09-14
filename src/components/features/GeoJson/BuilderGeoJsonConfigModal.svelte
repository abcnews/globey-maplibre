<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { fetchGeoJsonData } from './utils.ts';
  import { isValidUrl } from '../../../lib/marker/utils.ts';
  import BuilderPropGeoJsonFilter from './BuilderPropGeoJsonFilter.svelte';
  import BuilderPropGeoJsonColour from './BuilderPropGeoJsonColour.svelte';
  import BuilderPropGeoJsonSize from './BuilderPropGeoJsonSize.svelte';
  import VerticalTabs from '../../Builder/shared/VerticalTabs.svelte';
  import { untrack } from 'svelte';

  interface Props {
    /** The GeoJsonConfig object being edited or drafted */
    config: GeoJsonConfig;
    /** Callback fired when the modal requests to close */
    onclose?: (bounds?: [number, number][]) => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  let activeTab = $state<'config' | 'style'>('config');

  let rawSourceInput = $state<string>(
    untrack(() => {
      const snap = $state.snapshot(config);
      return snap?.url ? snap.url : (snap?.cmid ? String(snap.cmid) : '');
    })
  );

  let draftConfig = $state<GeoJsonConfig>(
    untrack(() => {
      const snap = $state.snapshot(config) || ({} as any);
      return {
        ...snap,
        type: snap.type ?? 'areas',
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
      console.error('[BuilderGeoJsonConfigModal fetchAndParse:error]', e);
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

  function commitDraft() {
    config.id = draftConfig.id || config.id;
    config.type = draftConfig.type;
    config.colourMode = draftConfig.colourMode;
    config.colourProp = draftConfig.colourProp;
    config.colourConfig = $state.snapshot(draftConfig.colourConfig);
    config.opacity = draftConfig.opacity;
    config.isOpaque = draftConfig.isOpaque;
    config.filter = $state.snapshot(draftConfig.filter);
    config.pointSize = $state.snapshot(draftConfig.pointSize);
    config.lineWidth = $state.snapshot(draftConfig.lineWidth);
    if (draftConfig.zIndex !== undefined) {
      config.zIndex = draftConfig.zIndex;
    }
  }

  function handleSave(goto = false) {
    const trimmed = rawSourceInput.trim();
    if (!trimmed) {
      alert('Please enter a valid CMID or URL.');
      return;
    }

    const isUrl = isUrlInput(trimmed);
    if (isUrl) {
      if (!isValidUrl(trimmed)) {
        console.warn('[BuilderGeoJsonConfigModal handleSave:invalid_url]', trimmed);
        alert('Preview URLs are not allowed. Please use a live-production or res/sites URL.');
        return;
      }
      config.url = trimmed;
      delete (config as any).cmid;
      commitDraft();
    } else {
      const numericCmid = Number(trimmed);
      if (!numericCmid || isNaN(numericCmid) || numericCmid <= 0) {
        console.warn('[BuilderGeoJsonConfigModal handleSave:invalid_cmid]', trimmed);
        alert('Please enter a valid CMID.');
        return;
      }
      config.cmid = numericCmid;
      delete (config as any).url;
      commitDraft();
    }
    console.log('[BuilderGeoJsonConfigModal handleSave] Saved config:', $state.snapshot(config));

    let bounds: [number, number][] | undefined = undefined;
    if (goto && rawFeatures.length > 0) {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      const processGeometry = (geom: any) => {
        if (!geom) return;
        if (geom.type === 'Point') {
          const [x, y] = geom.coordinates;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
          geom.coordinates.forEach(([x, y]: [number, number]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
          geom.coordinates.forEach((ring: any) => {
            ring.forEach(([x, y]: [number, number]) => {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            });
          });
        } else if (geom.type === 'MultiPolygon') {
          geom.coordinates.forEach((poly: any) => {
            poly.forEach((ring: any) => {
              ring.forEach(([x, y]: [number, number]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              });
            });
          });
        } else if (geom.type === 'GeometryCollection') {
          geom.geometries.forEach(processGeometry);
        }
      };

      rawFeatures.forEach(f => processGeometry(f.geometry));

      if (minX !== Infinity) {
        bounds = [
          [minX, minY],
          [maxX, maxY]
        ];
      }
    }

    onclose?.(bounds);
  }
</script>

{#snippet footerChildren()}
  <button onclick={() => handleSave(false)}>Save</button>
  <button onclick={() => handleSave(true)}>Save and Go To</button>
  <button onclick={() => onclose?.()}>Cancel</button>
{/snippet}

<Modal onClose={() => onclose?.()} title="Edit GeoJSON" {footerChildren}>
  <VerticalTabs
    tabs={[
      { id: 'config', label: 'Config' },
      { id: 'style', label: 'Style' }
    ]}
    bind:activeTab
  >
    {#if activeTab === 'config'}
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
            <input
              id="gj-source"
              type="text"
              placeholder="e.g. 106753230 or https://..."
              bind:value={rawSourceInput}
            />
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
        <fieldset>
          <legend>Geometry Type</legend>
          <div style:display="flex" style:gap="1rem">
            {#each ['areas', 'lines', 'points'] as type}
              <label
                style:display="flex"
                style:align-items="center"
                style:gap="0.5rem"
                style:cursor="pointer"
                style:text-transform="capitalize"
              >
                <input type="radio" name="gj-type" value={type} bind:group={draftConfig.type} />
                {type}
              </label>
            {/each}
          </div>
        </fieldset>

        {#if draftConfig.type === 'points'}
          <BuilderPropGeoJsonSize bind:config={draftConfig} prop="pointSize" legend="Point Size" />
        {/if}

        {#if draftConfig.type === 'lines'}
          <BuilderPropGeoJsonSize bind:config={draftConfig} prop="lineWidth" legend="Line Width" />
        {/if}
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
