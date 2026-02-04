<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import PropBaseAdvancedLabels from './PropBaseAdvancedLabels.svelte';

  let { options = $bindable(), map } = $props<{ options: DecodedObject; map: maplibregl.Map }>();

  function update(key: keyof DecodedObject, value: any) {
    options = {
      ...options,
      [key]: value
    };
  }
</script>

<fieldset>
  <legend>Map Base</legend>
  <div style:display="flex" style:gap="1rem">
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="map-base"
        value="street"
        checked={options.base === 'street' || !options.base}
        onchange={() => update('base', 'street')}
      />
      Street Map
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="map-base"
        value="countries"
        checked={options.base === 'countries'}
        onchange={() => update('base', 'countries')}
      />
      Countries
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.5rem" style:cursor="pointer">
      <input
        type="radio"
        name="map-base"
        value="satellite"
        checked={options.base === 'satellite'}
        onchange={() => update('base', 'satellite')}
      />
      Satellite
    </label>
  </div>

  {#if options.base !== 'countries'}
    <PropBaseAdvancedLabels bind:options />
  {/if}

  <div style:margin-top="0.75rem" style:display="flex" style:gap="1rem">
    <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:cursor="pointer">
      <input
        type="radio"
        name="projection"
        value="globe"
        checked={options.projection === 'globe' || !options.projection}
        onchange={() => update('projection', 'globe')}
      />
      Globe
    </label>
    <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:cursor="pointer">
      <input
        type="radio"
        name="projection"
        value="mercator"
        checked={options.projection === 'mercator'}
        onchange={() => update('projection', 'mercator')}
      />
      Flat (2D)
    </label>
  </div>
</fieldset>

<style>
</style>
