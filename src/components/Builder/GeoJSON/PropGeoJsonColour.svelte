<script lang="ts">
  import { untrack } from 'svelte';
  import { SequentialPalette, DivergentPalette } from '@abcnews/palette';
  import type { GeoJsonStyleConfig } from '../../../lib/marker';
  import ColourLegendPreview from './ColourLegendPreview.svelte';

  import DistributionInput from './DistributionInput.svelte';

  let {
    style = $bindable(),
    properties,
    features
  } = $props<{
    style: GeoJsonStyleConfig;
    properties: string[];
    features: any[];
  }>();

  // Selected property numeric values
  let numericValues = $derived.by(() => {
    const prop = style.colourProp;
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
    if (style.colourMode === 'override' || style.colourMode === 'scale') {
      if (!style.colourConfig) {
        style.colourConfig = {
          minColour: '#ffffff',
          maxColour: '#ff0000',
          override: '#ff0000',
          overrideType: 'custom',
          paletteType: 'sequential',
          paletteVariant: SequentialPalette.Blue
        };
      }
    }
  });

  // Default overrideType if missing
  $effect(() => {
    if (style.colourMode === 'override' && style.colourConfig && !style.colourConfig.overrideType) {
      style.colourConfig.overrideType = 'custom';
    }
  });

  // Reset the palette variant to a valid default when the palette type changes
  $effect(() => {
    const cc = style.colourConfig;
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
    const prop = style.colourProp;
    const cc = style.colourConfig;
    if (style.colourMode === 'scale' && prop && cc) {
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

  let customPaletteStr = $state(style.colourConfig?.customPalette?.join(', ') || '');

  $effect(() => {
    if (style.colourConfig?.paletteType === 'custom') {
      const colours = customPaletteStr
        .split(',')
        .map(s => s.trim())
        .filter(s => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s));

      style.colourConfig.customPalette = colours;
    }
  });
</script>

<fieldset>
  <legend>Colour</legend>

  <div class="gj-grid">
    <div>
      <label for="gj-colour-mode">Mode</label>
      <select id="gj-colour-mode" bind:value={style.colourMode}>
        <option value="simple">Simple Style</option>
        <option value="scale">Colour Scale</option>
        <option value="override">Override</option>
      </select>
    </div>

    {#if style.colourMode === 'scale'}
      <div>
        <label for="gj-colour-prop">Property</label>
        <select id="gj-colour-prop" bind:value={style.colourProp}>
          <option value="">(Select)</option>
          {#each properties as p}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if style.colourMode === 'simple'}
    <small>Uses <code>marker-color</code>, <code>fill</code>, <code>stroke</code> properties from GeoJSON.</small>
  {:else if style.colourMode === 'override'}
    {#if style.colourConfig}
      <div class="gj-grid">
        <div>
          <label for="gj-override-type">Preset</label>
          <select id="gj-override-type" bind:value={style.colourConfig.overrideType}>
            <option value="normal">Normal</option>
            <option value="highlighted">Highlighted</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        {#if style.colourConfig.overrideType === 'custom'}
          <div>
            <label for="gj-colour-override">Colour</label>
            <input id="gj-colour-override" type="color" bind:value={style.colourConfig.override} />
          </div>
        {/if}
      </div>
    {/if}
  {:else if style.colourMode === 'scale' && style.colourProp}
    {#if !isNumeric}
      <div style:color="var(--builder-color-danger, red)" style:font-size="0.85em" style:margin-top="0.5rem">
        <strong>Warning:</strong> The selected property does not appear to contain numeric values.
      </div>
    {/if}

    {#if style.colourConfig}
      <div class="gj-grid">
        <div style="grid-column: span 1">
          <span style:font-weight="bold" style:font-size="0.85em">Palette Type</span>
          <div style:display="flex" style:gap="1rem" style:margin-top="0.25rem">
            <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
              <input type="radio" name="paletteType" value="sequential" bind:group={style.colourConfig.paletteType} />
              Sequential
            </label>
            <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
              <input type="radio" name="paletteType" value="divergent" bind:group={style.colourConfig.paletteType} />
              Diverging
            </label>
            <label style:display="flex" style:align-items="center" style:gap="0.25rem" style:font-weight="normal">
              <input type="radio" name="paletteType" value="custom" bind:group={style.colourConfig.paletteType} />
              Custom
            </label>
          </div>
        </div>

        <div style="grid-column: span 1">
          {#if style.colourConfig.paletteType === 'sequential'}
            <label for="gj-palette-variant-s">Palette</label>
            <select id="gj-palette-variant-s" bind:value={style.colourConfig.paletteVariant}>
              {#each Object.values(SequentialPalette) as p}
                <option value={p}>{p}</option>
              {/each}
            </select>
          {:else if style.colourConfig.paletteType === 'divergent'}
            <label for="gj-palette-variant-d">Palette</label>
            <select id="gj-palette-variant-d" bind:value={style.colourConfig.paletteVariant}>
              {#each Object.keys(DivergentPalette) as p}
                <option value={p}>{p}</option>
              {/each}
            </select>
          {:else if style.colourConfig.paletteType === 'custom'}
            <label for="gj-custom-palette">Colours (comma separated)</label>
            <input
              id="gj-custom-palette"
              type="text"
              placeholder="#ff0000, #00ff00, #0000ff"
              bind:value={customPaletteStr}
            />
          {/if}
        </div>
      </div>

      <ColourLegendPreview
        paletteType={style.colourConfig.paletteType}
        paletteVariant={style.colourConfig.paletteVariant}
        customPalette={style.colourConfig.customPalette}
      />

      <DistributionInput values={numericValues} bind:min={style.colourConfig.min} bind:max={style.colourConfig.max} />
    {/if}
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
