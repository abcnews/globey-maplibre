<script lang="ts">
  import { untrack } from 'svelte';
  import { SequentialPalette, DivergentPalette } from '@abcnews/palette';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import ColorLegendPreview from './ColorLegendPreview.svelte';

  import DistributionInput from './DistributionInput.svelte';

  let {
    config = $bindable(),
    properties,
    features
  } = $props<{
    config: GeoJsonConfig;
    properties: string[];
    features: any[];
  }>();

  // Selected property numeric values
  let numericValues = $derived.by(() => {
    const prop = config.colourProp;
    if (!prop) return [];
    return features
      .map(f => f.properties?.[prop])
      .filter(v => v !== undefined && v !== null && v !== '')
      .map(Number)
      .filter(v => !isNaN(v));
  });

  // Determine if the selected property contains numeric values for the colour scale
  let isNumeric = $derived(numericValues.length > 0);

  // Ensure the colour configuration object exists for override and scale modes
  $effect(() => {
    // Ensure nested objects exist based on mode/type
    if (config.colourMode === 'override' || config.colourMode === 'scale') {
      if (!config.colourConfig) {
        config.colourConfig = {
          minColour: '#ffffff',
          maxColour: '#ff0000',
          override: '#ff0000',
          paletteType: 'sequential',
          paletteVariant: SequentialPalette.Blue
        };
      }
    }
  });

  // Reset the palette variant to a valid default when the palette type changes
  $effect(() => {
    const cc = config.colourConfig;
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
    const prop = config.colourProp;
    const cc = config.colourConfig;
    if (config.colourMode === 'scale' && prop && cc) {
      // Only calculate if at least one is missing
      if (cc.min !== undefined && cc.max !== undefined) return;

      if (numericValues.length > 0) {
        untrack(() => {
          if (cc.min === undefined) cc.min = Math.floor(Math.min(...numericValues));
          if (cc.max === undefined) cc.max = Math.ceil(Math.max(...numericValues));
        });
      }
    }
  });
</script>

<fieldset>
  <legend>Colour</legend>

  <div class="gj-grid">
    <div>
      <label for="gj-colour-mode">Mode</label>
      <select id="gj-colour-mode" bind:value={config.colourMode}>
        <option value="simple">Simple Style</option>
        <option value="scale">Colour Scale</option>
        <option value="class">Class Based</option>
        <option value="override">Override</option>
      </select>
    </div>

    {#if config.colourMode === 'scale'}
      <div>
        <label for="gj-colour-prop">Property</label>
        <select id="gj-colour-prop" bind:value={config.colourProp}>
          <option value="">(Select)</option>
          {#each properties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if config.colourMode === 'simple'}
    <small>Uses <code>marker-color</code>, <code>fill</code>, <code>stroke</code> properties from GeoJSON.</small>
  {:else if config.colourMode === 'override'}
    <label for="gj-colour-override">Colour</label>
    {#if config.colourConfig}
      <input id="gj-colour-override" type="color" bind:value={config.colourConfig.override} />
    {/if}
  {:else if config.colourMode === 'scale' && config.colourProp}
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
            <input type="radio" name="paletteType" value="sequential" bind:group={config.colourConfig.paletteType} />
            Sequential
          </label>
          <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
            <input type="radio" name="paletteType" value="divergent" bind:group={config.colourConfig.paletteType} />
            Diverging
          </label>
        </div>
      </div>

      <div style="grid-column: span 1">
        {#if config.colourConfig.paletteType === 'sequential'}
          <label for="gj-palette-variant-s">Palette</label>
          <select id="gj-palette-variant-s" bind:value={config.colourConfig.paletteVariant}>
            {#each Object.values(SequentialPalette) as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        {:else if config.colourConfig.paletteType === 'divergent'}
          <label for="gj-palette-variant-d">Palette</label>
          <select id="gj-palette-variant-d" bind:value={config.colourConfig.paletteVariant}>
            {#each Object.keys(DivergentPalette) as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        {/if}
      </div>
    </div>

    <ColorLegendPreview
      paletteType={config.colourConfig.paletteType}
      paletteVariant={config.colourConfig.paletteVariant}
    />

    <DistributionInput values={numericValues} bind:min={config.colourConfig.min} bind:max={config.colourConfig.max} />
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
