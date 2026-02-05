<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { Modal } from '@abcnews/components-builder';
  import { Pencil } from 'svelte-bootstrap-icons';
  import PropBaseAdvancedLabels from './PropBaseAdvancedLabels.svelte';

  let { options = $bindable(), map } = $props<{ options: DecodedObject; map: maplibregl.Map }>();
  let isOpen = $state(false);

  function update(key: keyof DecodedObject, value: any) {
    options = {
      ...options,
      [key]: value
    };
  }

  const baseLabels = {
    street: 'Street Map',
    countries: 'Countries',
    satellite: 'Satellite'
  };

  const satelliteLabels = {
    blue: 'Blue Marble',
    black: 'Black Marble'
  };
</script>

<fieldset>
  <legend
    >Map Base
    <button class="btn-icon" onclick={() => (isOpen = true)} aria-label="Edit map base" title="Edit map base">
      <Pencil />
    </button></legend
  >
  <div class="prop-base-summary">
    <span class="value">
      <strong>{baseLabels[options.base || 'street']}</strong>
      {#if options.base === 'satellite'}
        {satelliteLabels[options.satelliteVariant || 'blue']}
      {/if}
      <small>({options.projection === 'mercator' ? '2D' : 'Globe'})</small>
    </span>
  </div>
</fieldset>

{#if isOpen}
  <Modal onClose={() => (isOpen = false)} title="Map Base & Style">
    <div class="prop-base">
      <div class="prop-base__layer">
        <div>
          <fieldset>
            <legend>Base Layer</legend>
            <select value={options.base || 'street'} onchange={e => update('base', e.currentTarget.value)}>
              <option value="street">Street Map</option>
              <option value="countries">Countries</option>
              <option value="satellite">Satellite</option>
            </select>
          </fieldset>
          <fieldset>
            <legend>Projection</legend>
            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  name="projection"
                  value="globe"
                  checked={options.projection === 'globe' || !options.projection}
                  onchange={() => update('projection', 'globe')}
                />
                Globe
              </label>
              <label>
                <input
                  type="radio"
                  name="projection"
                  value="mercator"
                  checked={options.projection === 'mercator'}
                  onchange={() => update('projection', 'mercator')}
                />
                Flat
              </label>
            </div>
          </fieldset>
        </div>
        {#if options.base === 'satellite'}
          <fieldset class="sub-options">
            <legend>Satellite layer</legend>
            <div class="radio-group">
              <label>
                <input
                  type="radio"
                  name="satellite-variant"
                  value="blue"
                  checked={options.satelliteVariant === 'blue' || !options.satelliteVariant}
                  onchange={() => update('satelliteVariant', 'blue')}
                />
                Blue marble
              </label>
              <label>
                <input
                  type="radio"
                  name="satellite-variant"
                  value="black"
                  checked={options.satelliteVariant === 'black'}
                  onchange={() => update('satelliteVariant', 'black')}
                />
                Black marble
              </label>
            </div>
          </fieldset>
        {/if}
      </div>
      <div>
        <fieldset>
          <legend>Labels</legend>
          <PropBaseAdvancedLabels bind:options />
        </fieldset>
      </div>
    </div>

    {#snippet footerChildren()}
      <button onclick={() => (isOpen = false)}>Close</button>
    {/snippet}
  </Modal>
{/if}

<style>
  .prop-base {
    width: 30rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
  }
  .prop-base__layer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .prop-base-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
  }
  .value {
    flex: 1;
  }
  .radio-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .radio-group label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
</style>
