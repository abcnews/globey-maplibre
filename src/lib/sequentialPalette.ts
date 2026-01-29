import {
  getSequentialContinuousPaletteInterpolator,
  ColourMode,
  type SequentialPalette
} from '@abcnews/palette';

export const SEQUENTIAL_PALETTE_OFFSET_PCT = 0.05;

/**
 * Gets a sequential palette interpolator that applies a global offset 
 * to ensure visibility against white backgrounds.
 * @param variant The sequential palette variant
 * @param mode The colour mode (defaults to Light)
 * @returns An interpolator function
 */
export function getSequentialInterpolator(variant: SequentialPalette, mode: ColourMode = ColourMode.Light) {
  const baseInterpolator = getSequentialContinuousPaletteInterpolator(variant, mode);
  
  return (t: number) => {
    // Remap t from [0, 1] to [OFFSET, 1]
    const adjustedT = SEQUENTIAL_PALETTE_OFFSET_PCT + t * (1 - SEQUENTIAL_PALETTE_OFFSET_PCT);
    return baseInterpolator(adjustedT);
  };
}
