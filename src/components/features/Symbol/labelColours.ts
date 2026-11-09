import { resolveColour } from '@abcnews/components-dataviz';
import type { SymbolLabelStyle } from '../../../lib/data/jsonBlob.ts';

/** Filled annotations have no scheme-aware defaults of their own, so the scheme is set here. */
const SCHEME_DEFAULTS = {
  light: { background: '#FFFFFF', text: '#000000' },
  dark: { background: '#000000', text: '#FFFFFF' }
} as const;

/**
 * The text and background colours for a symbol's label (an annotation or an inset).
 *
 * `colour` and `scheme` are the layer's. `colourMode` says where the colour goes: nowhere
 * (`default`), the text, or the background. With the colour on the background the text takes the
 * scheme's background colour, so the label reads as inverted. `background` is the fill of a filled
 * annotation, the 1px border of an outline one, or the border of an inset (`border` mode, which an
 * inset uses instead of `background`). The caller decides which.
 */
export function resolveLabelColours(
  style: SymbolLabelStyle | undefined,
  colour: string,
  scheme: 'light' | 'dark'
): { text: string; background: string } {
  const defaults = SCHEME_DEFAULTS[scheme];
  const mode = style?.colourMode ?? 'default';
  if (mode === 'default') return { text: defaults.text, background: defaults.background };

  const accent = resolveColour({ colour, scheme });
  if (mode === 'border') return { text: defaults.text, background: accent };

  // With no background there is nothing to colour but the text, so a saved "background" is ignored.
  const isBackgroundColoured = mode === 'background' && style?.showBackground !== false;

  return isBackgroundColoured
    ? { text: defaults.background, background: accent }
    : { text: accent, background: defaults.background };
}
