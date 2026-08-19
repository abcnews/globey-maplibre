<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { Modal } from '@abcnews/components-builder';
  import { Pencil, Trash, X } from 'svelte-bootstrap-icons';
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
    const next = { ...current };
    (next as any)[key] = value;
    options = {
      ...options,
      mapLabels: next
    };
  }

  function clearLabels() {
    options = {
      ...options,
      mapLabels: {
        countriesMajor: false,
        countriesMedium: false,
        countriesMinor: false,
        continents: false,
        states: false,
        cities: false,
        towns: false,
        oceans: false,
        nationalBoundaries: options.mapLabels?.nationalBoundaries ?? true,
        stateBoundaries: options.mapLabels?.stateBoundaries ?? false
      }
    };
  }

  const baseLabels: Record<string, string> = {
    street: 'Street Map',
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
            <div class="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={options.mapLabels?.nationalBoundaries ?? true}
                  onchange={e => updateMapLabel('nationalBoundaries', e.currentTarget.checked)}
                />
                National
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.mapLabels?.stateBoundaries ?? false}
                  onchange={e => updateMapLabel('stateBoundaries', e.currentTarget.checked)}
                />
                State
              </label>
            </div>
          </fieldset>
        {/if}
      </div>
      <div>
        <fieldset>
          <legend
            >Labels
            <button
              class="btn-icon"
              aria-label="Clear all labels"
              title="Clear all labels"
              onclick={clearLabels}
            >
              <Trash />
            </button></legend
          >
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
        <fieldset class="sub-options">
          <legend>Animation</legend>
          <label>
            <input type="number" bind:value={options.animationDuration} />
            Duration (ms)
          </label>
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
  .radio-group,
  .checkbox-group {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .radio-group label,
  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
  }
</style>
