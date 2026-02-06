<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { untrack } from 'svelte';

  let { config = $bindable() } = $props<{
    config: GeoJsonConfig;
  }>();

  // Ensure config.pointSize is initialized
  $effect(() => {
    untrack(() => {
      if (!config.pointSize) {
        config.pointSize = { value: 6, unit: 'p' };
      }
    });
  });
</script>

{#if config.pointSize}
  <fieldset>
    <legend>Point Size</legend>
    <div class="field-row">
      <div class="field">
        <label for="gj-point-size-val">Value</label>
        <input id="gj-point-size-val" type="number" step="0.5" min="0.1" bind:value={config.pointSize.value} />
      </div>
      <div class="field">
        <label for="gj-point-size-unit">Unit</label>
        <select id="gj-point-size-unit" bind:value={config.pointSize.unit}>
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
