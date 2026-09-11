<script lang="ts">
  import type { DecodedObject } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { options } from '../store';
  import { X } from 'svelte-bootstrap-icons';

  let { map } = $props<{ map?: maplibregl.Map }>();

  function update(key: keyof DecodedObject, value: any) {
    $options = {
      ...$options,
      [key]: value
    };
  }
</script>

<fieldset class="map-config-fieldset">
  <legend>Map config</legend>

  <div class="form-row-group">
    <div class="form-row flex-1">
      <span class="control-label">Projection</span>
      <div class="radio-group">
        <label>
          <input
            type="radio"
            name="projection"
            value="globe"
            checked={$options.projection === 'globe' || !$options.projection}
            onchange={() => update('projection', 'globe')}
          />
          Globe
        </label>
        <label>
          <input
            type="radio"
            name="projection"
            value="mercator"
            checked={$options.projection === 'mercator'}
            onchange={() => update('projection', 'mercator')}
          />
          Flat
        </label>
      </div>
    </div>

    <div class="form-row flex-1">
      <label for="animation-duration" class="control-label">Animation (ms)</label>
      <input
        id="animation-duration"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        value={$options.animationDuration ?? ''}
        oninput={e => {
          const val = e.currentTarget.value.trim();
          update('animationDuration', val ? Number(val) : undefined);
        }}
        placeholder="e.g. 1000"
      />
    </div>
  </div>

  <div class="form-row">
    <label class="checkbox-label">
      <input
        type="checkbox"
        checked={$options.minimap?.enabled ?? false}
        onchange={e => {
          if (e.currentTarget.checked) {
            update('minimap', { enabled: true, bounds: $options.minimap?.bounds || [] });
          } else {
            update('minimap', undefined);
          }
        }}
      />
      Show minimap
    </label>
  </div>

  <div class="form-row">
    <label for="text-attribution" class="control-label">Attribution</label>
    <div class="input-with-clear">
      <input
        id="text-attribution"
        type="text"
        placeholder="e.g. Map data © ..."
        value={$options.attribution || ''}
        oninput={e => update('attribution', e.currentTarget.value)}
      />
      {#if $options.attribution}
        <button
          type="button"
          class="btn-icon clear-btn"
          title="Clear attribution"
          aria-label="Clear attribution"
          onclick={() => update('attribution', '')}
        >
          <X width="16" height="16" />
        </button>
      {/if}
    </div>
  </div>
</fieldset>

<style>
  .map-config-fieldset {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-row-group {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    width: 100%;
  }

  .flex-1 {
    flex: 1;
    min-width: 0;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .control-label {
    font-size: 0.85rem;
    color: var(--text-light, #888);
    font-weight: 500;
  }

  .radio-group {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    min-height: 1.8rem;
  }

  .radio-group label,
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--text, #ccc);
  }

  .input-with-clear {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
  }

  .input-with-clear input {
    width: 100%;
    padding-right: 2rem;
  }

  .clear-btn {
    position: absolute;
    right: 0.25rem;
    color: var(--text-light, #888);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    color: var(--text, #ccc);
  }
</style>
