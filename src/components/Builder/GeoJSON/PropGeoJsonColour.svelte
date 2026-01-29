<script lang="ts">
  import { untrack } from 'svelte';
  import { SequentialPalette, DivergentPalette } from '@abcnews/palette';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import ColorLegendPreview from './ColorLegendPreview.svelte';

  let {
    config = $bindable(),
    properties,
    features
  } = $props<{
    config: GeoJsonConfig;
    properties: string[];
    features: any[];
  }>();

  // Determine if the selected property contains numeric values for the color scale
  let isNumeric = $derived.by(() => {
    const prop = config.colorProp;
    if (config.colorMode !== 'scale' || !prop) return true;

    return features.some(f => {
      const v = f.properties?.[prop];
      return v !== undefined && v !== null && v !== '' && !isNaN(Number(v));
    });
  });

  // Ensure the color configuration object exists for override and scale modes
  $effect(() => {
    // Ensure nested objects exist based on mode/type
    if (config.colorMode === 'override' || config.colorMode === 'scale') {
      if (!config.colorConfig) {
        config.colorConfig = {
          minColor: '#ffffff',
          maxColor: '#ff0000',
          override: '#ff0000',
          paletteType: 'sequential',
          paletteVariant: SequentialPalette.Blue
        };
      }
    }
  });

  // Reset the palette variant to a valid default when the palette type changes
  $effect(() => {
    const cc = config.colorConfig;
    if (cc && cc.paletteType) {
      untrack(() => {
        // Reset variant if it's not valid for the type
        if (cc.paletteType === 'sequential') {
          if (!Object.values(SequentialPalette).includes(cc.paletteVariant as any)) {
            cc.paletteVariant = SequentialPalette.Blue;
          }
        } else if (cc.paletteType === 'divergent') {
          if (!Object.keys(DivergentPalette).includes(cc.paletteVariant as any)) {
            cc.paletteVariant = 'RedBlue';
          }
        }
      });
    }
  });

  // Automatically calculate the min/max range for numeric properties if not already set
  $effect(() => {
    const prop = config.colorProp;
    const cc = config.colorConfig;
    if (config.colorMode === 'scale' && prop && cc) {
      // Only calculate if at least one is missing
      if (cc.min !== undefined && cc.max !== undefined) return;

      const values = features
        .map(f => f.properties?.[prop])
        .filter(v => v !== undefined && v !== null && v !== '')
        .map(Number)
        .filter(v => !isNaN(v));

      if (values.length > 0) {
        untrack(() => {
          if (cc.min === undefined) cc.min = Math.floor(Math.min(...values));
          if (cc.max === undefined) cc.max = Math.ceil(Math.max(...values));
        });
      }
    }
  });
</script>

<fieldset>
  <legend>Colour</legend>

  <div class="gj-grid">
    <div>
      <label for="gj-color-mode">Mode</label>
      <select id="gj-color-mode" bind:value={config.colorMode}>
        <option value="simple">Simple Style</option>
        <option value="scale">Colour Scale</option>
        <option value="class">Class Based</option>
        <option value="override">Override</option>
      </select>
    </div>

    {#if config.colorMode === 'scale'}
      <div>
        <label for="gj-color-prop">Property</label>
        <select id="gj-color-prop" bind:value={config.colorProp}>
          <option value="">(Select)</option>
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

    <div class="gj-grid">
      <div style="grid-column: span 1">
        <span style:font-weight="bold" style:font-size="0.85em">Palette Type</span>
        <div style:display="flex" style:gap="1rem" style:margin-top="0.25rem">
          <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
            <input type="radio" name="paletteType" value="sequential" bind:group={config.colorConfig.paletteType} />
            Sequential
          </label>
          <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
            <input type="radio" name="paletteType" value="divergent" bind:group={config.colorConfig.paletteType} />
            Diverging
          </label>
        </div>
      </div>

      <div style="grid-column: span 1">
        {#if config.colorConfig.paletteType === 'sequential'}
          <label for="gj-palette-variant-s">Palette</label>
          <select id="gj-palette-variant-s" bind:value={config.colorConfig.paletteVariant}>
            {#each Object.values(SequentialPalette) as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        {:else if config.colorConfig.paletteType === 'divergent'}
          <label for="gj-palette-variant-d">Palette</label>
          <select id="gj-palette-variant-d" bind:value={config.colorConfig.paletteVariant}>
            {#each Object.keys(DivergentPalette) as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

    <ColorLegendPreview
      paletteType={config.colorConfig.paletteType}
      paletteVariant={config.colorConfig.paletteVariant}
    />

    <div class="gj-grid">
      <div>
        <label for="gj-min-val" style="display:block">Min Value</label>
        <input id="gj-min-val" type="number" bind:value={config.colorConfig.min} />
      </div>
      <div>
        <label for="gj-max-val" style="display:block">Max Value</label>
        <input id="gj-max-val" type="number" bind:value={config.colorConfig.max} />
      </div>
    </div>
  {/if}
</fieldset>

<style>
  .gj-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    align-items: end;
  }
  .gj-grid > div {
    min-width: 0;
  }
</style>
