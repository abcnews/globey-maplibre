<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';

  let { options = $bindable() } = $props<{ options: DecodedObject }>();

  const defaultLabels = {
    countriesMajor: true,
    countriesMedium: true,
    countriesMinor: true,
    continents: false,
    states: false,
    cities: false,
    towns: false,
    oceans: false,
    nationalBoundaries: true,
    stateBoundaries: false
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

<div class="checkbox-grid">
  <label class="control-label">
    <input
      type="checkbox"
      checked={options.mapLabels?.countriesMajor ?? true}
      onchange={e => updateMapLabel('countriesMajor', e.currentTarget.checked)}
    />
    Major countries
  </label>
  <label class="control-label">
    <input
      type="checkbox"
      checked={options.mapLabels?.countriesMedium ?? true}
      onchange={e => updateMapLabel('countriesMedium', e.currentTarget.checked)}
    />
    Medium countries
  </label>
  <label class="control-label">
    <input
      type="checkbox"
      checked={options.mapLabels?.countriesMinor ?? true}
      onchange={e => updateMapLabel('countriesMinor', e.currentTarget.checked)}
    />
    Minor countries
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
      checked={options.mapLabels?.states ?? false}
      onchange={e => updateMapLabel('states', e.currentTarget.checked)}
    />
    States
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

<style>
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
