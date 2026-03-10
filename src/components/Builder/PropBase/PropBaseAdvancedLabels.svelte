<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';

  let { options = $bindable() } = $props<{ options: DecodedObject }>();

  const defaultLabels = {
    countries: 3,
    states: false,
    cities: false,
    towns: false,
    oceans: false,
    continents: false,
    boundaries: 'national'
  };

  function updateMapLabel(key: keyof typeof defaultLabels, value: any) {
    const current = options.mapLabels || { ...defaultLabels };
    const next = { ...current };
    (next as any)[key] = value;
    options = {
      ...options,
      mapLabels: next
    };
  }
</script>

<div class="label-grid">
  <div class="label-section">
    <label class="section-title" for="ml-countries-slider">Countries (detail level)</label>
    <div class="slider-group">
      <input
        id="ml-countries-slider"
        type="range"
        min="0"
        max="3"
        step="1"
        value={options.mapLabels?.countries ?? 3}
        oninput={e => updateMapLabel('countries', Number(e.currentTarget.value))}
      />
      <span class="value">
        {#if (options.mapLabels?.countries ?? 3) === 0}
          None
        {:else if (options.mapLabels?.countries ?? 3) === 1}
          Major
        {:else if (options.mapLabels?.countries ?? 3) === 2}
          Most
        {:else}
          All
        {/if}
      </span>
    </div>
  </div>

  <div class="checkbox-grid">
    <label class="control-label">
      <input
        type="checkbox"
        checked={options.mapLabels?.states ?? false}
        onchange={e => updateMapLabel('states', e.currentTarget.checked)}
      />
      States
    </label>
    <label class="control-label">
      <input
        type="checkbox"
        checked={options.mapLabels?.continents ?? false}
        onchange={e => updateMapLabel('continents', e.currentTarget.checked)}
      />
      Continents
    </label>
    <label class="control-label">
      <input
        type="checkbox"
        checked={options.mapLabels?.oceans ?? false}
        onchange={e => updateMapLabel('oceans', e.currentTarget.checked)}
      />
      Oceans
    </label>
    <label class="control-label">
      <input
        type="checkbox"
        checked={options.mapLabels?.cities ?? false}
        onchange={e => updateMapLabel('cities', e.currentTarget.checked)}
      />
      Cities
    </label>
    <label class="control-label">
      <input
        type="checkbox"
        checked={options.mapLabels?.towns ?? false}
        onchange={e => updateMapLabel('towns', e.currentTarget.checked)}
      />
      Towns
    </label>
  </div>
</div>

<style>
  .label-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .section-title {
    display: block;
    margin-bottom: 0.25rem;
  }
  .slider-group {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .slider-group input {
    flex: 1;
  }
  .slider-group .value {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .control-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
</style>
