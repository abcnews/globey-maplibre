import {
  getDivergentContinuousPaletteInterpolator,
  SequentialPalette,
  DivergentPalette,
  ColourMode
} from '@abcnews/palette';
import { getCustomPaletteInterpolator } from '../../../../lib/colours.ts';
import type { GeoJsonColourConfig } from '../../../../lib/data/jsonBlob.ts';
import { getSequentialInterpolator } from '../../../../lib/sequentialPalette.ts';

/**
 * Turns a colour config's palette choice into a 0–1 → CSS colour function. The single source
 * of truth for colour scales across GeoJSON layers, spikes and gridded data.
 */
export function getPaletteInterpolator(colourConfig: GeoJsonColourConfig | undefined): ((t: number) => string) | null {
  const { paletteType, paletteVariant, customPalette } = colourConfig || {};
  if (!paletteType) return null;

  if (paletteType === 'sequential' && paletteVariant) {
    if (Object.values(SequentialPalette).includes(paletteVariant as any)) {
      return getSequentialInterpolator(paletteVariant as SequentialPalette, ColourMode.Light);
    }
  } else if (paletteType === 'divergent' && paletteVariant) {
    const variant = DivergentPalette[paletteVariant as keyof typeof DivergentPalette];
    if (variant) {
      return getDivergentContinuousPaletteInterpolator(variant, ColourMode.Light);
    }
  } else if (paletteType === 'custom' && customPalette) {
    return getCustomPaletteInterpolator(customPalette);
  }

  return null;
}

/** Number of colour stops in a continuous CSS gradient preview. */
const GRADIENT_STOPS = 8;

/**
 * CSS `linear-gradient` preview of a palette. With `classes`, draws hard-edged steps matching
 * the stepped colouring used by gridded layers.
 */
export function paletteGradient(colourConfig: GeoJsonColourConfig | undefined, classes?: number): string {
  const interpolator = getPaletteInterpolator(colourConfig);
  if (!interpolator) return '';

  if (classes && classes >= 2) {
    const steps = Array.from({ length: classes }, (_, index) => {
      const colour = interpolator(index / (classes - 1));
      return `${colour} ${(index / classes) * 100}% ${((index + 1) / classes) * 100}%`;
    });
    return `linear-gradient(to right, ${steps.join(', ')})`;
  }

  const stops = Array.from({ length: GRADIENT_STOPS + 1 }, (_, index) => interpolator(index / GRADIENT_STOPS));
  return `linear-gradient(to right, ${stops.join(', ')})`;
}
