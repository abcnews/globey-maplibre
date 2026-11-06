import { getSymbol, resolveColour, type SYMBOL_NAMES } from '@abcnews/components-dataviz';
import type { SymbolStyle } from './data/jsonBlob.ts';

type SymbolName = (typeof SYMBOL_NAMES)[number];

/** Width of a vector symbol on the map, in CSS px. */
export const SYMBOL_WIDTH = 20;

const resolvedColour = (style: SymbolStyle) => resolveColour({ colour: style.colour, scheme: style.scheme });

/**
 * MapLibre sprite id for a symbol. It includes everything that changes the pixels
 * (including the device pixel ratio), so each variant is registered once and reused.
 */
export const symbolImageId = (style: SymbolStyle, pixelRatio: number) =>
  `vector-${style.name}-${style.variant}-${style.scheme}-${resolvedColour(style).replace(/[^a-z0-9]/gi, '')}-${SYMBOL_WIDTH}@${pixelRatio}`;

/**
 * Draws a symbol's SVG as an image `map.addImage` accepts. MapLibre can't load SVGs itself, so
 * the SVG is rasterised by the browser at `SYMBOL_WIDTH × pixelRatio` pixels. Pass the same
 * `pixelRatio` to `addImage` so it is shown at `SYMBOL_WIDTH`. `getSymbol` multiplies the
 * stroke widths by `pixelRatio`, so the lines stay the same CSS width at any density.
 */
export async function rasteriseSymbol(style: SymbolStyle, pixelRatio: number): Promise<HTMLImageElement> {
  const svg = getSymbol({
    name: style.name as SymbolName,
    variant: style.variant,
    width: SYMBOL_WIDTH,
    scheme: style.scheme,
    colour: resolvedColour(style),
    pixelRatio
  });
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}
