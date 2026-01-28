<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { GeoJsonConfig } from '../../lib/marker';
  import * as topojson from 'topojson-client';

  let {
    config: initialConfig,
    onsave,
    onclose
  } = $props<{
    config: GeoJsonConfig;
    onsave: (config: GeoJsonConfig) => void;
    onclose: () => void;
  }>();

  let config = $state<GeoJsonConfig>({ ...initialConfig });
  let loading = $state(false);
  let error = $state<string | undefined>();
  let properties = $state<string[]>([]);
  let featureCount = $state(0);
  let rawFeatures = $state<any[]>([]);
  let lastUrl = '';

  async function fetchAndParse(url: string) {
    if (!url) return;
    loading = true;
    error = undefined;
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
    } catch (e: any) {
      error = e.message;
      properties = [];
      featureCount = 0;
      rawFeatures = [];
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (config.url && config.url !== lastUrl) {
      lastUrl = config.url;
      fetchAndParse(config.url);
    }
  });

  function getUniqueValues(prop: string): string[] {
    const set = new Set<string>();
    rawFeatures.forEach(f => {
      if (f.properties && f.properties[prop] !== undefined) {
        set.add(String(f.properties[prop]));
      }
    });
    return Array.from(set).sort().slice(0, 100);
  }

  let filterValues = $derived(config.filter?.prop ? getUniqueValues(config.filter.prop) : []);
</script>

{#snippet footerChildren()}
  <button onclick={() => onsave(config)}>Save</button>
  <button onclick={onclose}>Cancel</button>
{/snippet}
<Modal onClose={onclose} title="Edit GeoJSON" {footerChildren}>
  <div class="field" style="min-width: 500px;">
    <label for="gj-url">URL</label>
    <input id="gj-url" type="text" bind:value={config.url} placeholder="https://example.com/data.json" />
  </div>

  {#if loading}
    <div>Loading metadata...</div>
  {:else if error}
    <div style="color:red">{error}</div>
  {:else if config.url}
    <div class="stat">{featureCount} features found</div>

    <div class="field">
      <label for="gj-type">Type</label>
      <select id="gj-type" bind:value={config.type}>
        <option value="areas">Areas</option>
        <option value="lines">Lines</option>
        <option value="points">Points</option>
        <option value="spikes">Spikes</option>
      </select>
    </div>

    <!-- Filter UI -->
    <fieldset>
      <legend>Filter</legend>
      <div class="field">
        <label for="gj-filter-prop">Property</label>
        <select
          id="gj-filter-prop"
          value={config.filter?.prop || ''}
          onchange={e => {
            const val = e.currentTarget.value;
            if (val) {
              config.filter = { prop: val, values: [] };
            } else {
              delete config.filter;
            }
          }}
        >
          <option value="">(None)</option>
          {#each properties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>

      {#if config.filter?.prop}
        <div class="field">
          <label>Values ({config.filter.values.length} hidden)</label>
          <div class="scroll-list">
            {#each filterValues as val}
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  checked={!config.filter!.values.includes(val)}
                  onchange={e => {
                    const checked = e.currentTarget.checked;
                    const current = config.filter!.values;
                    if (!checked) {
                      config.filter!.values = [...current, val];
                    } else {
                      config.filter!.values = current.filter(v => v !== val);
                    }
                  }}
                />
                {val}
              </label>
            {/each}
          </div>
        </div>
      {/if}
    </fieldset>

    <!-- Color Mode UI -->
    <fieldset>
      <legend>Color</legend>
      <div class="field">
        <label for="gj-color-mode">Mode</label>
        <select id="gj-color-mode" bind:value={config.colorMode}>
          <option value="simple">Simple Style</option>
          <option value="scale">Color Scale</option>
          <option value="class">Class Based</option>
          <option value="override">Override</option>
        </select>
      </div>

      {#if config.colorMode === 'simple'}
        <small>Uses <code>marker-color</code>, <code>fill</code>, <code>stroke</code> properties from GeoJSON.</small>
      {:else if config.colorMode === 'override'}
        <div class="field">
          <label for="gj-color-override">Color</label>
          {#if !config.colorConfig}
            {(config.colorConfig = {})}
          {/if}
          <input id="gj-color-override" type="color" bind:value={config.colorConfig!.override} />
        </div>
      {:else if config.colorMode === 'scale'}
        <div class="field">
          <label for="gj-color-prop">Property</label>
          <select id="gj-color-prop" bind:value={config.colorProp}>
            <option value="">(Select)</option>
            {#each properties as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>
        {#if !config.colorConfig}
          {(config.colorConfig = { min: 0, max: 100, minColor: '#ffffff', maxColor: '#ff0000' })}
        {/if}
        <div class="field-row">
          <div class="field">
            <label>Min</label>
            <input type="number" bind:value={config.colorConfig!.min} />
          </div>
          <div class="field">
            <label>Color</label>
            <input type="color" bind:value={config.colorConfig!.minColor} />
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Max</label>
            <input type="number" bind:value={config.colorConfig!.max} />
          </div>
          <div class="field">
            <label>Color</label>
            <input type="color" bind:value={config.colorConfig!.maxColor} />
          </div>
        </div>
      {:else if config.colorMode === 'class'}
        <div class="field">
          <label for="gj-class-prop">Property</label>
          <select id="gj-class-prop" bind:value={config.colorProp}>
            <option value="class">class</option>
            {#each properties as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>
      {/if}
    </fieldset>

    {#if config.type === 'spikes'}
      <fieldset>
        <legend>Spikes</legend>
        <div class="field">
          <label for="gj-spike-prop">Height Property</label>
          <select id="gj-spike-prop" bind:value={config.spike!.heightProp}>
            <option value="">(None)</option>
            {#each properties as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </div>
        {#if !config.spike}
          {(config.spike = { scalar: 1 })}
        {/if}
        <div class="field">
          <label for="gj-spike-scalar">Scalar</label>
          <input id="gj-spike-scalar" type="number" step="0.1" bind:value={config.spike!.scalar} />
        </div>
      </fieldset>
    {/if}
  {/if}
</Modal>

<style>
  .modal-content {
    padding: 1rem;
    background: white;
    max-width: 500px;
    margin: 0 auto;
  }
  .field {
    margin-bottom: 0.5rem;
  }
  .field label {
    display: block;
    font-weight: bold;
    margin-bottom: 0.2rem;
  }
  input,
  select {
    width: 100%;
    box-sizing: border-box;
  }
  .field-row {
    display: flex;
    gap: 0.5rem;
  }
  .actions {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
  .scroll-list {
    max-height: 150px;
    overflow-y: auto;
    border: 1px solid #ccc;
    padding: 0.5rem;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: normal;
  }
</style>
