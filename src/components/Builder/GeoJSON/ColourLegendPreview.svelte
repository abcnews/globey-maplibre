<script lang="ts">
  import {
    SequentialPalette,
    DivergentPalette,
    getSequentialContinuousPaletteInterpolator,
    getDivergentContinuousPaletteInterpolator,
    ColourMode
  } from '@abcnews/palette';
  import { getSequentialInterpolator } from '../../../lib/sequentialPalette';
  import { getCustomPaletteInterpolator } from '../../../lib/colours';

  let { paletteType, paletteVariant, customPalette } = $props<{
    paletteType?: 'sequential' | 'divergent' | 'custom';
    paletteVariant?: string;
    customPalette?: string[];
  }>();

  let interpolator = $derived.by(() => {
    if (!paletteType || !paletteVariant) return null;

    try {
      if (paletteType === 'sequential') {
        if (Object.values(SequentialPalette).includes(paletteVariant as any)) {
          return getSequentialInterpolator(paletteVariant as SequentialPalette, ColourMode.Light);
        }
      }
      if (paletteType === 'divergent') {
        const variant = DivergentPalette[paletteVariant as keyof typeof DivergentPalette];
        if (variant) {
          return getDivergentContinuousPaletteInterpolator(variant, ColourMode.Light);
        }
      }
      if (paletteType === 'custom' && customPalette) {
        return getCustomPaletteInterpolator(customPalette);
      }
    } catch (e) {
      console.error('Error generating interpolator', e);
    }
    return null;
  });

  let previewGradient = $derived.by(() => {
    if (!interpolator) return '';
    try {
      return `linear-gradient(to right, ${interpolator(0)}, ${interpolator(0.5)}, ${interpolator(1)})`;
    } catch (e) {
      console.error('Error generating preview gradient', e);
      return '';
    }
  });
</script>

{#if previewGradient}
  <div class="colorbar" style:background={previewGradient}></div>
{/if}

<style>
  .colorbar {
    height: 1.5rem;
    width: 100%;
    margin-top: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border);
  }
</style>
