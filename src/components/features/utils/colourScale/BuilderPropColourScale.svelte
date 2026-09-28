<script lang="ts">
  import { untrack } from 'svelte';
  import { SequentialPalette, DivergentPalette } from '@abcnews/palette';
  import type { GeoJsonColourConfig } from '../../../../lib/data/jsonBlob.ts';
  import ColourLegendPreview from './ColourLegendPreview.svelte';
  import DistributionInput from './DistributionInput.svelte';

  /**
   * Palette picker + histogram with min/max handles. Shared by GeoJSON scale mode and gridded
   * layers; edits `colourConfig` in place.
   */
  interface Props {
    colourConfig: GeoJsonColourConfig;
    /** Numeric values for the histogram (a sample is fine) */
    values: number[];
    /** Number of stepped classes, for the legend preview */
    classes?: number;
    /** Prefix for element ids, so two instances can coexist */
    idPrefix?: string;
  }

  let { colourConfig = $bindable(), values, classes, idPrefix = 'scale' }: Props = $props();

  // Reset the palette variant to a valid default when the palette type changes
  $effect(() => {
    const paletteType = colourConfig.paletteType;
    untrack(() => {
      if (paletteType === 'sequential' && !Object.values(SequentialPalette).includes(colourConfig.paletteVariant as any)) {
        colourConfig.paletteVariant = SequentialPalette.Blue;
      } else if (paletteType === 'divergent' && !Object.keys(DivergentPalette).includes(colourConfig.paletteVariant as any)) {
        colourConfig.paletteVariant = 'RedBlue';
      }
    });
  });

  let customPaletteText = $state(untrack(() => colourConfig.customPalette?.join(', ') ?? ''));

  // Keep the custom palette in sync with the text box while custom is selected
  $effect(() => {
    if (colourConfig.paletteType !== 'custom') return;
    colourConfig.customPalette = customPaletteText
      .split(',')
      .map(colour => colour.trim())
      .filter(colour => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colour));
  });
</script>

<div class="scale-grid">
  <div>
    <span class="label">Palette Type</span>
    <div class="radios">
      {#each [['sequential', 'Sequential'], ['divergent', 'Diverging'], ['custom', 'Custom']] as [value, label] (value)}
        <label>
          <input type="radio" name="{idPrefix}-palette-type" {value} bind:group={colourConfig.paletteType} />
          {label}
        </label>
      {/each}
    </div>
  </div>

  <div>
    {#if colourConfig.paletteType === 'sequential'}
      <label for="{idPrefix}-palette-s">Palette</label>
      <select id="{idPrefix}-palette-s" bind:value={colourConfig.paletteVariant}>
        {#each Object.values(SequentialPalette) as palette (palette)}
          <option value={palette}>{palette}</option>
        {/each}
      </select>
    {:else if colourConfig.paletteType === 'divergent'}
      <label for="{idPrefix}-palette-d">Palette</label>
      <select id="{idPrefix}-palette-d" bind:value={colourConfig.paletteVariant}>
        {#each Object.keys(DivergentPalette) as palette (palette)}
          <option value={palette}>{palette}</option>
        {/each}
      </select>
    {:else if colourConfig.paletteType === 'custom'}
      <label for="{idPrefix}-palette-custom">Colours (comma separated)</label>
      <input
        id="{idPrefix}-palette-custom"
        type="text"
        placeholder="#ff0000, #00ff00, #0000ff"
        bind:value={customPaletteText}
      />
    {/if}
  </div>
</div>

<ColourLegendPreview {colourConfig} {classes} />

<DistributionInput {values} bind:min={colourConfig.min} bind:max={colourConfig.max} />

<style>
  .scale-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    align-items: end;
  }
  .scale-grid > div {
    min-width: 0;
  }
  .label {
    font-weight: bold;
    font-size: 0.85em;
  }
  .radios {
    display: flex;
    gap: 1rem;
    margin-top: 0.25rem;
  }
  .radios label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: normal;
  }
</style>
