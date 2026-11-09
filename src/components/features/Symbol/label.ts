import type { EmbeddedImage, SymbolInset, SymbolLayer } from '../../../lib/data/jsonBlob.ts';

type LabelFields = Partial<Pick<SymbolLayer, 'annotation' | 'inset'>>;

/** The size an inset shows at when the browser couldn't measure its image, in CSS px. */
const FALLBACK_INSET_SIZE = 48;

/** Whether the symbol has annotation text to show. */
export const hasAnnotation = (layer: LabelFields) => Boolean(layer.annotation?.trim());

/** Whether the symbol has an inset image to show. */
export const hasInset = (layer: LabelFields) => Boolean(layer.inset?.image?.dataUri);

/** Whether the symbol shows a label of either kind. A symbol has one or the other, never both. */
export const hasLabel = (layer: LabelFields) => hasAnnotation(layer) || hasInset(layer);

/**
 * The size an inset shows at, in CSS px: the number handed to `Inset`'s `size`. The image is
 * expected to be @2x, so it is shown at half its pixel size. A circle or rounded square is a square
 * crop, so the shorter side sets it. A `source` inset keeps the image's shape, so `size` is its
 * width and the height follows the image, which is half its pixel height too.
 */
export function insetSize(
  { width, height }: Pick<EmbeddedImage, 'width' | 'height'>,
  shape: SymbolInset['shape'] = 'circle'
): number {
  if (!width || !height) return FALLBACK_INSET_SIZE;
  const side = shape === 'source' ? width : Math.min(width, height);
  return Math.max(1, Math.round(side / 2));
}
