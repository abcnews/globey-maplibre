<script lang="ts">
  import { untrack } from 'svelte';
  import { SequentialPalette } from '@abcnews/palette';
  import type { GeoJsonStyle } from './expressions.ts';
  import ColourSchemePicker from '../../../shared/ColourSchemePicker.svelte';
  import BuilderPropColourScale from '../colourScale/BuilderPropColourScale.svelte';

  let {
    style = $bindable(),
    properties,
    features
  } = $props<{
    style: GeoJsonStyle;
    properties: string[];
    features: any[];
  }>();

  // Selected property numeric values
  let numericValues = $derived.by(() => {
    const prop = style.colourProp;
    if (!prop) return [];
    return features
      .map((f: any) => f.properties?.[prop])
      .filter((v: any) => v !== undefined && v !== null && v !== '')
      .map(Number)
      .filter((v: number) => !isNaN(v));
  });

  // Determine if the selected property contains numeric values for the colour scale
  let isNumeric = $derived(numericValues.length > 0);

  // Ensure the colour configuration object exists for override and scale modes
  $effect(() => {
    // Ensure nested objects exist based on mode/type
    if (style.colourMode === 'basic' || style.colourMode === 'scale') {
      if (!style.colourConfig) {
        style.colourConfig = {
          minColour: '#ffffff',
          maxColour: '#ff0000',
          basic: '#ff0000',
          basicType: 'normal',
          paletteType: 'sequential',
          paletteVariant: SequentialPalette.Blue
        };
      }
    }
  });

  // Default basicType if missing
  $effect(() => {
    if (style.colourMode === 'basic' && style.colourConfig && !style.colourConfig.basicType) {
      style.colourConfig.basicType = 'normal';
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
</script>

<fieldset>
  <legend>Colour</legend>

  <div class="gj-grid">
    <div>
      <label for="gj-colour-mode">Mode</label>
      <select id="gj-colour-mode" bind:value={style.colourMode}>
        <option value="simple">Simple Style</option>
        <option value="scale">Colour Scale</option>
        <option value="basic">Basic</option>
      </select>
    </div>

    {#if style.colourMode === 'scale'}
      <div>
        <label for="gj-colour-prop">Property</label>
        <select id="gj-colour-prop" bind:value={style.colourProp}>
          <option value="">(Select)</option>
          {#each properties as p (p)}
            <option value={p}>{p}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  {#if style.colourMode === 'simple'}
    <small
      >Uses <code>marker-color</code>, <code>fill</code>, <code>stroke</code> properties from GeoJSON. An editor like
      <a href="https://geojson.io" target="_blank">geojson.io</a> supports these.</small
    >
  {:else if style.colourMode === 'basic'}
    {#if style.colourConfig}
      <ColourSchemePicker
        idPrefix="gj-basic"
        scheme={style.colourConfig.basicType ?? 'normal'}
        customColour={style.colourConfig.basic}
        onchange={({ scheme, customColour }) => {
          style.colourConfig!.basicType = scheme;
          if (customColour) style.colourConfig!.basic = customColour;
        }}
      />
    {/if}
  {:else if style.colourMode === 'scale' && style.colourProp}
    {#if !isNumeric}
      <div style:color="var(--builder-color-danger, red)" style:font-size="0.85em" style:margin-top="0.5rem">
        <strong>Warning:</strong> The selected property does not appear to contain numeric values.
      </div>
    {/if}

    {#if style.colourConfig}
      <BuilderPropColourScale bind:colourConfig={style.colourConfig} values={numericValues} idPrefix="gj" />
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
