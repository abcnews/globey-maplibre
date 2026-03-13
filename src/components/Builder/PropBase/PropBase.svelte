<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import { Modal } from '@abcnews/components-builder';
  import { Pencil, X } from 'svelte-bootstrap-icons';
  import { isOsmBase } from '../../CustomGlobe/mapStyle/utils';
  import PropBaseAdvancedLabels from './PropBaseAdvancedLabels.svelte';

  let { options = $bindable(), map } = $props<{ options: DecodedObject; map: maplibregl.Map }>();
  let isOpen = $state(false);

  function update(key: keyof DecodedObject, value: any) {
    options = {
      ...options,
      [key]: value
    };
  }

  function updateMapLabel(key: string, value: any) {
    const current = options.mapLabels || {
      countries: 3,
      states: false,
      cities: false,
      towns: false,
      oceans: false,
      continents: false,
      boundaries: 'national'
    };
    const next = { ...current };
    (next as any)[key] = value;
    options = {
      ...options,
      mapLabels: next
    };
  }

  const boundaryOptions: { value: 'none' | 'national' | 'state'; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'national', label: 'National' },
    { value: 'state', label: 'State' }
  ];

  const baseLabels: Record<string, string> = {
    street: 'Street Map',
    countries: 'Countries',
    satellite: 'Satellite'
  };

  const satelliteLabels: Record<string, string> = {
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
  <Modal onClose={() => (isOpen = false)} title="Map Base & Style" position="right">
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
        {#if isOsmBase(options.base)}
          <fieldset class="sub-options">
            <legend>Boundaries</legend>
            <div class="radio-group">
              {#each boundaryOptions as opt}
                <label>
                  <input
                    type="radio"
                    name="ml-boundaries"
                    value={opt.value}
                    checked={(options.mapLabels?.boundaries ?? 'national') === opt.value}
                    onchange={e => updateMapLabel('boundaries', e.currentTarget.value)}
                  />
                  {opt.label}
                </label>
              {/each}
            </div>
          </fieldset>
        {/if}
      </div>
      <div>
        <fieldset>
          <legend>Labels</legend>
          <PropBaseAdvancedLabels bind:options />
        </fieldset>
        <fieldset>
          <legend>Attribution</legend>

          <div class="builder__inline">
            <label class="builder__inline" style="flex:1"
              >Text
              <input
                id="text_attribution"
                type="text"
                placeholder="e.g. Map data © ..."
                value={options.attribution || ''}
                oninput={e => update('attribution', e.currentTarget.value)}
                style="flex:1;width:auto;"
              />
            </label>

            <button
              class="btn-icon"
              title="Clear attribution"
              aria-label="Clear attribution"
              onclick={() => update('attribution', '')}
            >
              <X width="16" height="16" />
            </button>
          </div>
          {#if isOsmBase(options.base)}
            <label style="display: flex; align-items: center; gap: 0.5rem;">
              <input
                type="checkbox"
                checked={options.hideOsm || false}
                onchange={e => update('hideOsm', e.currentTarget.checked)}
              />
              Hide OpenStreetMap
            </label>
          {/if}
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
