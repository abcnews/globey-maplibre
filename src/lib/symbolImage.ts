import { getSymbol, getSymbolAnchor, resolveColour, type SYMBOL_NAMES } from '@abcnews/components-dataviz';
import type { SymbolStyle } from './data/jsonBlob.ts';

type SymbolName = (typeof SYMBOL_NAMES)[number];

const resolvedColour = (style: SymbolStyle) => resolveColour({ colour: style.colour, scheme: style.scheme });

/**
 * MapLibre sprite id for a symbol. It includes everything that changes the pixels
 * (including the device pixel ratio), so each variant is registered once and reused.
 */
export const symbolImageId = (style: SymbolStyle, pixelRatio: number) =>
  `vector-${style.name}-${style.variant}-${style.scheme}-${resolvedColour(style).replace(/[^a-z0-9]/gi, '')}-${style.size}@${pixelRatio}`;

/** Where the symbol points, as fractions of its square image: the middle for most, the tip for a pin or arrow. */
const symbolAnchor = (style: SymbolStyle) =>
  getSymbolAnchor({ name: style.name as SymbolName, variant: style.variant, width: style.size });

/**
 * MapLibre's `icon-offset` (px at `icon-size` 1) that puts the symbol's anchor, not its middle, on
 * the map coordinate. A pin's tip is below its middle, so the icon is moved up.
 */
export function symbolIconOffset(style: SymbolStyle): [number, number] {
  const { x, y } = symbolAnchor(style);
  return [(0.5 - x) * style.size, (0.5 - y) * style.size];
}

/**
 * How far, in px, the symbol reaches from the map coordinate in any direction, plus a 1px gap.
 * An annotation is offset by this much so it clears the symbol: about half the size for a circle,
 * nearly the full size for a pin, whose body sits above the coordinate.
 */
export function symbolReach(style: SymbolStyle): number {
  const { x, y } = symbolAnchor(style);
  return Math.round(style.size * Math.max(x, 1 - x, y, 1 - y)) + 1;
}

/** The size `decodeUploadedImage` assumes for an image (e.g. an SVG) that has none of its own. */
const FALLBACK_IMAGE_SIZE = 256;

/** Uploaded images are @2x: shown at half their pixel size, so they stay sharp on high-density screens. */
export const UPLOADED_IMAGE_SCALE = 0.5;

/** Sprite id for an uploaded image: a short hash, since the data URI itself is far too long to use. */
export const uploadedImageId = (dataUri: string) => {
  const hash = Array.from(dataUri).reduce((running, character) => Math.imul(running ^ character.charCodeAt(0), 16777619), 2166136261);
  return `uploaded-${(hash >>> 0).toString(36)}-${dataUri.length}`;
};

/**
 * Decodes an uploaded image's data URI to pixels for `map.addImage`. It is drawn onto a canvas
 * so an SVG with no size of its own still gets pixel dimensions.
 */
export async function decodeUploadedImage(dataUri: string): Promise<ImageData> {
  const image = new Image();
  image.src = dataUri;
  await image.decode();
  const width = image.naturalWidth || FALLBACK_IMAGE_SIZE;
  const height = image.naturalHeight || FALLBACK_IMAGE_SIZE;
  const context = Object.assign(document.createElement('canvas'), { width, height }).getContext('2d');
  if (!context) throw new Error('Canvas is not available to draw the image.');
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

/**
 * Draws a symbol's SVG as an image `map.addImage` accepts. MapLibre can't load SVGs itself, so
 * the SVG is rasterised by the browser at `style.size × pixelRatio` pixels. Pass the same
 * `pixelRatio` to `addImage` so it is shown at `style.size` CSS px. `getSymbol` multiplies the
 * stroke widths by `pixelRatio`, so the lines stay the same CSS width at any density.
 */
export async function rasteriseSymbol(style: SymbolStyle, pixelRatio: number): Promise<HTMLImageElement> {
  const svg = getSymbol({
    name: style.name as SymbolName,
    variant: style.variant,
    width: style.size,
    scheme: style.scheme,
    colour: resolvedColour(style),
    pixelRatio
  });
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}
