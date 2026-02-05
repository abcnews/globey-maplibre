<script lang="ts">
  import { untrack } from 'svelte';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import DistributionInput from './DistributionInput.svelte';

  let {
    config = $bindable(),
    properties,
    features
  } = $props<{
    config: GeoJsonConfig;
    properties: string[];
    features: any[];
  }>();

  // Selected property numeric values for histogram
  let numericValues = $derived.by(() => {
    const prop = config.spike?.heightProp;
    if (!prop) return [];
    return features
      .map(f => f.properties?.[prop])
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(Number)
      .filter(v => !isNaN(v));
  });

  let isNumeric = $derived(numericValues.length > 0);

  // Initialize spike config if missing
  $effect(() => {
    if (!config.spike) {
      config.spike = {
        heightProp: '',
        scalar: 50000 // Default max height in meters
      };
    }
  });

  // Automatically calculate min/max if property changes
  $effect(() => {
    const prop = config.spike?.heightProp;
    const spike = config.spike;
    if (prop && spike) {
      if (spike.min !== undefined && spike.max !== undefined) return;
      if (numericValues.length > 0) {
        untrack(() => {
          if (spike.min === undefined) spike.min = Math.floor(Math.min(...numericValues));
          if (spike.max === undefined) spike.max = Math.ceil(Math.max(...numericValues));
        });
      }
    }
  });
</script>

<fieldset>
  <legend>Height</legend>
  <div class="gj-grid">
    <div>
      <label for="gj-spike-prop">Property</label>
      <select id="gj-spike-prop" bind:value={config.spike!.heightProp}>
        <option value="">(None)</option>
        {#each properties as p}
          <option value={p}>{p}</option>
        {/each}
      </select>
    </div>
    <div>
      <label for="gj-spike-scalar">Max Height (m)</label>
      <input id="gj-spike-scalar" type="number" step="1000" bind:value={config.spike!.scalar} />
    </div>
  </div>

  {#if config.spike!.heightProp}
    {#if !isNumeric}
      <div style:color="var(--builder-color-danger, red)" style:font-size="0.85em" style:margin-top="0.5rem">
        <strong>Warning:</strong> The selected property does not appear to contain numeric values.
      </div>
    {/if}

    <DistributionInput values={numericValues} bind:min={config.spike!.min} bind:max={config.spike!.max} />
  {/if}
</fieldset>

<style>
  .gj-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    align-items: end;
    margin-bottom: 0.5rem;
  }
  .gj-grid > div {
    min-width: 0;
  }
</style>
