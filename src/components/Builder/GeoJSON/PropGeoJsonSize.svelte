<script lang="ts">
  import type { GeoJsonConfig, GeoJsonSize } from '../../../lib/marker';
  import { untrack } from 'svelte';

  let {
    config = $bindable(),
    prop,
    legend = 'Size'
  } = $props<{
    config: GeoJsonConfig;
    prop: 'pointSize' | 'lineWidth';
    legend?: string;
  }>();

  // Ensure the specific size property is initialized
  $effect(() => {
    untrack(() => {
      if (!config[prop]) {
        config[prop] = { value: prop === 'pointSize' ? 6 : 2, unit: 'p' };
      }
    });
  });

  const size = $derived(config[prop]);
</script>

{#if size}
  <fieldset>
    <legend>{legend}</legend>
    <div class="field-row">
      <div class="field">
        <label for="gj-{prop}-val">Value</label>
        <input id="gj-{prop}-val" type="number" step="0.5" min="0.1" bind:value={size.value} />
      </div>
      <div class="field">
        <label for="gj-{prop}-unit">Unit</label>
        <select id="gj-{prop}-unit" bind:value={size.unit}>
          <option value="p">Pixels (Fixed)</option>
          <option value="k">Kilometres (Scaled)</option>
        </select>
      </div>
    </div>
  </fieldset>
{/if}

<style>
  .field-row {
    display: flex;
    gap: 1rem;
  }
  .field {
    flex: 1;
  }
  input[type='number'] {
    width: 100%;
  }
  select {
    width: 100%;
  }
</style>
