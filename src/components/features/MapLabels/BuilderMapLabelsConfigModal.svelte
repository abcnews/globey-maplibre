<script lang="ts">
  import { Modal } from '@abcnews/components-builder';
  import type { MapLabelsLayer } from '../../../lib/data/jsonBlob.ts';
  import type { MapLabelFlags } from '../../../lib/data/layerHelpers.ts';

  interface Props {
    /** The MapLabelsLayer object being edited or drafted */
    config: Partial<MapLabelsLayer>;
    /** Callback fired when the modal requests to close */
    onclose?: () => void;
  }

  let { config = $bindable(), onclose }: Props = $props();

  function updateCheckbox(key: keyof MapLabelFlags, value: boolean) {
    config[key] = value;
  }

  function selectAll() {
    config.countriesMajor = true;
    config.countriesMedium = true;
    config.countriesMinor = true;
    config.continents = true;
    config.states = true;
    config.cities = true;
    config.towns = true;
    config.oceans = true;
  }

  function deselectAll() {
    config.countriesMajor = false;
    config.countriesMedium = false;
    config.countriesMinor = false;
    config.continents = false;
    config.states = false;
    config.cities = false;
    config.towns = false;
    config.oceans = false;
  }
</script>

<Modal title="Map Labels" onClose={() => onclose?.()} position="right">
  <div class="map-labels-modal">
    <div class="preset-toolbar">
      <button type="button" class="btn-preset" onclick={selectAll}>Select All</button>
      <button type="button" class="btn-preset" onclick={deselectAll}>Deselect All</button>
    </div>

    <fieldset>
      <legend>Places & Regions</legend>
      <div class="checkbox-grid">
        <label>
          <input
            type="checkbox"
            checked={config.countriesMajor ?? true}
            onchange={e => updateCheckbox('countriesMajor', e.currentTarget.checked)}
          />
          Major countries
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.countriesMedium ?? true}
            onchange={e => updateCheckbox('countriesMedium', e.currentTarget.checked)}
          />
          Medium countries
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.countriesMinor ?? true}
            onchange={e => updateCheckbox('countriesMinor', e.currentTarget.checked)}
          />
          Minor countries
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.continents ?? true}
            onchange={e => updateCheckbox('continents', e.currentTarget.checked)}
          />
          Continents
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.states ?? true}
            onchange={e => updateCheckbox('states', e.currentTarget.checked)}
          />
          States / Provinces
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.cities ?? true}
            onchange={e => updateCheckbox('cities', e.currentTarget.checked)}
          />
          Cities
        </label>
        <label>
          <input
            type="checkbox"
            checked={config.towns ?? true}
            onchange={e => updateCheckbox('towns', e.currentTarget.checked)}
          />
          Towns
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Water Features</legend>
      <div class="checkbox-grid">
        <label>
          <input
            type="checkbox"
            checked={config.oceans ?? true}
            onchange={e => updateCheckbox('oceans', e.currentTarget.checked)}
          />
          Oceans & Seas
        </label>
      </div>
    </fieldset>
  </div>

  {#snippet footerChildren()}
    <button type="button" onclick={() => onclose?.()}>OK</button>
  {/snippet}
</Modal>

<style>
  .map-labels-modal {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    min-width: 380px;
  }

  .preset-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .btn-preset {
    font-size: 0.75rem;
    padding: 0.25rem 0.6rem;
    background: var(--background-alt, #2c2c2f);
    border: 1px solid var(--border, rgba(122, 123, 135, 0.5));
    color: var(--text, #ccc);
    border-radius: 3px;
    cursor: pointer;
  }

  .btn-preset:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  .checkbox-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.6rem 0.75rem;
  }

  .checkbox-grid label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    user-select: none;
  }
</style>
