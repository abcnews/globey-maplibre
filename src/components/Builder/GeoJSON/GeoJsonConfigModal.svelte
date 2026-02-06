<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import * as topojson from 'topojson-client';
  import PropGeoJsonFilter from './PropGeoJsonFilter.svelte';
  import PropGeoJsonColour from './PropGeoJsonColour.svelte';
  import PropGeoJsonPointSize from './PropGeoJsonPointSize.svelte';
  import PropGeoJsonHeight from './PropGeoJsonHeight.svelte';
  import { untrack } from 'svelte';
  import { isValidUrl } from '../../../lib/marker';

  let {
    config: initialConfig,
    onsave,
    onclose
  } = $props<{
    config: GeoJsonConfig;
    onsave: (config: GeoJsonConfig) => void;
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
</script>

{#snippet footerChildren()}
  <button onclick={() => onsave(config)}>Save</button>
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

    <PropGeoJsonFilter bind:config {properties} {getUniqueValues} />

    <PropGeoJsonColour bind:config {properties} features={rawFeatures} />

    {#if config.type === 'points'}
      <PropGeoJsonPointSize bind:config />
    {/if}

    {#if config.type === 'spikes'}
      <PropGeoJsonHeight bind:config {properties} features={rawFeatures} />
    {/if}
  {/if}
</Modal>
