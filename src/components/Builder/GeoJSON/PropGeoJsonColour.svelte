<script lang="ts">
  import { untrack } from 'svelte';
  import type { GeoJsonConfig } from '../../../lib/marker';

  let {
    config = $bindable(),
    properties,
    features
  } = $props<{
    config: GeoJsonConfig;
    properties: string[];
    features: any[];
  }>();

  let isNumeric = $state(true);

  $effect(() => {
    // Ensure nested objects exist based on mode/type
    if (config.colorMode === 'override' || config.colorMode === 'scale') {
      if (!config.colorConfig) {
        config.colorConfig = { min: 0, max: 100, minColor: '#ffffff', maxColor: '#ff0000', override: '#ff0000' };
      }
    }
  });

  $effect(() => {
    const prop = config.colorProp;
    if (config.colorMode === 'scale' && prop) {
      untrack(() => {
        const values = features
          .map(f => f.properties?.[prop])
          .filter(v => v !== undefined && v !== null && v !== '')
          .map(Number)
          .filter(v => !isNaN(v));

        if (values.length > 0) {
          isNumeric = true;
          if (config.colorConfig) {
            config.colorConfig.min = Math.floor(Math.min(...values));
            config.colorConfig.max = Math.ceil(Math.max(...values));
          }
        } else {
          isNumeric = false;
        }
      });
    } else {
      isNumeric = true;
    }
  });
</script>

<fieldset>
  <legend>Colour</legend>

  <div class="builder__inline">
    <div style:flex="1">
      <label for="gj-color-mode">Mode</label>
      <select id="gj-color-mode" bind:value={config.colorMode}>
        <option value="simple">Simple Style</option>
        <option value="scale">Color Scale</option>
        <option value="class">Class Based</option>
        <option value="override">Override</option>
      </select>
    </div>

    {#if config.colorMode === 'scale'}
      <div style:flex="1">
        <label for="gj-color-prop">Property</label>
        <select id="gj-color-prop" bind:value={config.colorProp}>
          <option value="">(Select)</option>
          {#each properties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>
    {:else if config.colorMode === 'class'}
      <div style:flex="1">
        <label for="gj-class-prop">Property</label>
        <select id="gj-class-prop" bind:value={config.colorProp}>
          <option value="class">class</option>
          {#each properties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if config.colorMode === 'simple'}
    <small>Uses <code>marker-color</code>, <code>fill</code>, <code>stroke</code> properties from GeoJSON.</small>
  {:else if config.colorMode === 'override'}
    <label for="gj-color-override">Colour</label>
    {#if config.colorConfig}
      <input id="gj-color-override" type="color" bind:value={config.colorConfig.override} />
    {/if}
  {:else if config.colorMode === 'scale' && config.colorProp}
    {#if !isNumeric}
      <div style:color="var(--builder-color-danger, red)" style:font-size="0.85em" style:margin-top="0.5rem">
        <strong>Warning:</strong> The selected property does not appear to contain numeric values.
      </div>
    {/if}

    {#if config.colorConfig}
      <div style:display="flex" style:gap="0.5rem">
        <div style:flex="1">
          <label>Min</label>
          <input type="number" bind:value={config.colorConfig.min} />
        </div>
        <div style:flex="1">
          <label>Colour</label>
          <input type="color" bind:value={config.colorConfig.minColor} />
        </div>
      </div>
      <div style:display="flex" style:gap="0.5rem">
        <div style:flex="1">
          <label>Max</label>
          <input type="number" bind:value={config.colorConfig.max} />
        </div>
        <div style:flex="1">
          <label>Colour</label>
          <input type="color" bind:value={config.colorConfig.maxColor} />
        </div>
      </div>
    {/if}
  {/if}
</fieldset>
