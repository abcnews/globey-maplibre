<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';

  let { config = $bindable() } = $props<{
    config: GeoJsonConfig;
  }>();

  // Parse current pointSize (e.g., "5p" or "10k")
  let value = $state(6);
  let unit = $state<'p' | 'k'>('p');

  $effect(() => {
    if (config.pointSize) {
      const match = config.pointSize.match(/^(\d+(?:\.\d+)?)([pk])$/);
      if (match) {
        value = Number(match[1]);
        unit = match[2] as 'p' | 'k';
      }
    } else {
      // Defaults
      value = 6;
      unit = 'p';
    }
  });

  function update() {
    config.pointSize = `${value}${unit}`;
  }
</script>

<fieldset>
  <legend>Point Size</legend>
  <div class="field-row">
    <div class="field">
      <label for="gj-point-size-val">Value</label>
      <input id="gj-point-size-val" type="number" step="0.5" min="0.1" bind:value onchange={update} />
    </div>
    <div class="field">
      <label for="gj-point-size-unit">Unit</label>
      <select id="gj-point-size-unit" bind:value={unit} onchange={update}>
        <option value="p">Pixels (Fixed)</option>
        <option value="k">Kilometres (Scaled)</option>
      </select>
    </div>
  </div>
</fieldset>

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
