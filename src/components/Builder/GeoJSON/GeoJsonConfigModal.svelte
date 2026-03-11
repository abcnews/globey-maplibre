<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import * as topojson from 'topojson-client';
  import PropGeoJsonFilter from './PropGeoJsonFilter.svelte';
  import PropGeoJsonColour from './PropGeoJsonColour.svelte';
  import PropGeoJsonSize from './PropGeoJsonSize.svelte';
  import PropGeoJsonHeight from './PropGeoJsonHeight.svelte';
  import { untrack } from 'svelte';
  import { isValidUrl } from '../../../lib/marker';

  let {
    config: initialConfig,
    onsave,
    onclose
  } = $props<{
    config: GeoJsonConfig;
    onsave: (config: GeoJsonConfig, goto?: boolean, bounds?: [number, number][]) => void;
    onclose: () => void;
  }>();

  let config = $state<GeoJsonConfig>(untrack(() => $state.snapshot(initialConfig)));
  let status = $state<'no-data' | 'loading' | 'loaded' | 'error'>(
    untrack(() => ($state.snapshot(initialConfig).url ? 'loading' : 'no-data'))
  );
  let errorMessage = $state<string | undefined>();
  let properties = $state<string[]>([]);
  let featureCount = $state(0);
  let rawFeatures = $state<any[]>([]);
  let lastUrl = '';

  async function fetchAndParse(url: string) {
    if (!url) {
      status = 'no-data';
      return;
    }
    if (!isValidUrl(url)) {
      status = 'error';
      errorMessage = 'Preview URLs are not allowed. Please use a live-production or res/sites URL.';
      return;
    }
    status = 'loading';
    errorMessage = undefined;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();

      let geojson: any = data;
      if (data.type === 'Topology') {
        const key = Object.keys(data.objects)[0];
        if (key) {
          geojson = topojson.feature(data, data.objects[key]);
        }
      }

      // Analyze properties
      const propsSet = new Set<string>();
      let count = 0;
      let features: any[] = [];
      if (geojson.features) {
        features = geojson.features;
        count = features.length;
        features.forEach((f: any) => {
          if (f.properties) {
            Object.keys(f.properties).forEach(k => propsSet.add(k));
          }
        });
      }
      properties = Array.from(propsSet).sort();
      featureCount = count;
      rawFeatures = features;
      status = 'loaded';
    } catch (e: any) {
      errorMessage = e.message;
      properties = [];
      featureCount = 0;
      rawFeatures = [];
      status = 'error';
    }
  }

  $effect(() => {
    if (config.url && config.url !== lastUrl) {
      lastUrl = config.url;
      fetchAndParse(config.url);
    } else if (!config.url) {
      status = 'no-data';
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

  $effect(() => {
    // Ensure nested objects exist based on type
    if (config.type === 'spikes') {
      if (!config.spike) config.spike = { scalar: 2000000, heightProp: '' };
    }
  });

  $effect(() => {
    // Ensure styles array exists to be manipulated by the UI
    if (!config.styles) {
      if ((config as any).colourMode) {
        // Migration from old to new inside the UI state, happens when an old config object
        // is passed into the modal instead of having been parsed by the new codec
        config.styles = [
          {
            colourMode: (config as any).colourMode,
            colourProp: (config as any).colourProp,
            colourConfig: (config as any).colourConfig,
            filter: (config as any).filter,
            opacity: (config as any).opacity ?? 1
          } as any
        ];
        delete (config as any).colourMode;
        delete (config as any).colourProp;
        delete (config as any).colourConfig;
        delete (config as any).filter;
        delete (config as any).opacity;
      } else {
        config.styles = [{ colourMode: 'override', opacity: 1 }];
      }
    }
  });

  function handleSave(goto = false) {
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
    onsave(config, goto, bounds);
  }

  function addStyle() {
    if (!config.styles) config.styles = [];
    config.styles.push({ colourMode: 'override', opacity: 1 });
  }

  function removeStyle(index: number) {
    if (config.styles) {
      config.styles.splice(index, 1);
    }
  }
</script>

{#snippet footerChildren()}
  <button onclick={() => handleSave(false)}>Save</button>
  <button onclick={() => handleSave(true)}>Save and Go To</button>
  <button onclick={onclose}>Cancel</button>
{/snippet}

<Modal onClose={onclose} title="Edit GeoJSON" {footerChildren}>
  <fieldset style="min-width: 500px;">
    <legend
      >Data source
      {#if status === 'loaded'}
        (<small class="stat">{featureCount} features</small>)
      {/if}</legend
    >
    <label for="gj-url">URL</label>
    <input id="gj-url" type="text" bind:value={config.url} placeholder="https://example.com/data.json" />

    {#if status === 'loading'}
      <div>Loading metadata...</div>
    {/if}
    {#if status === 'error'}
      <div style="color:var(--builder-color-danger, red)">{errorMessage}</div>
    {/if}
  </fieldset>

  {#if status === 'loaded'}
    <fieldset>
      <legend>Geometry Type</legend>
      <div style:display="flex" style:gap="1rem">
        {#each ['areas', 'lines', 'points', 'spikes'] as type}
          <label
            style:display="flex"
            style:align-items="center"
            style:gap="0.5rem"
            style:cursor="pointer"
            style:text-transform="capitalize"
          >
            <input type="radio" name="gj-type" value={type} bind:group={config.type} />
            {type}
          </label>
        {/each}
      </div>
    </fieldset>

    {#if config.styles}
      {#each config.styles as style, i}
        <div style:border="1px solid #ccc" style:padding="1rem" style:border-radius="4px" style:margin-bottom="1rem">
          <div
            style:display="flex"
            style:justify-content="space-between"
            style:align-items="center"
            style:margin-bottom="1rem"
          >
            <h4 style:margin="0">Style {i + 1}</h4>
            <div style:display="flex" style:gap="0.5rem">
              {#if config.styles && config.styles.length > 1}
                <button type="button" class="gj-btn-small" onclick={() => removeStyle(i)}>Remove</button>
              {/if}
            </div>
          </div>
          <PropGeoJsonFilter bind:style={config.styles[i]} {properties} {getUniqueValues} />

          <PropGeoJsonColour bind:style={config.styles[i]} {properties} features={rawFeatures} />

          <fieldset>
            <legend>Opacity</legend>
            <div style:display="flex" style:align-items="center" style:gap="1rem">
              <input type="range" min="0" max="1" step="0.05" bind:value={config.styles[i].opacity} style="flex: 1" />
              <span style:font-variant-numeric="tabular-nums">{(config.styles[i].opacity ?? 1).toFixed(2)}</span>
            </div>
          </fieldset>
        </div>
      {/each}

      <div style:margin-bottom="1rem">
        <button type="button" onclick={addStyle}>+ Add Another Style</button>
      </div>
    {/if}

    {#if config.type === 'points' || config.type === 'spikes'}
      <PropGeoJsonSize bind:config prop="pointSize" legend="Point Size" />
    {/if}

    {#if config.type === 'lines'}
      <PropGeoJsonSize bind:config prop="lineWidth" legend="Line Width" />
    {/if}

    {#if config.type === 'spikes'}
      <PropGeoJsonHeight bind:config {properties} features={rawFeatures} />
    {/if}
  {/if}
</Modal>

<style>
  .gj-btn-small {
    padding: 0.25rem 0.5rem;
    font-size: 0.8em;
  }
</style>
