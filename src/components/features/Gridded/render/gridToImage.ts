import type { GriddedLayer } from '../../../../lib/data/jsonBlob.ts';
import { parseColor } from '../../../../lib/colours.ts';
import { getPaletteInterpolator } from '../../utils/colourScale/palette.ts';
import type { DecodedGrid } from '../data/types.ts';
import { gridExtent } from './stats.ts';
import { timed } from '../timing.ts';

export type GridStyle = Pick<GriddedLayer, 'colourConfig' | 'noData' | 'hideBelowMin' | 'hideAboveMax' | 'classes'>;

/** Image-source corners: TL, TR, BR, BL as [lng, lat]. */
export type ImageCorners = [[number, number], [number, number], [number, number], [number, number]];

export interface GridPixels {
  width: number;
  height: number;
  /** RGBA, row 0 = north */
  data: Uint8ClampedArray;
  coordinates: ImageCorners;
}

/** Web Mercator can't show the poles; image sources beyond this latitude are clipped. */
export const MAX_MERCATOR_LAT = 85.0511;
/**
 * Largest image side we build; bigger grids are downsampled. The image is only ever the file's
 * own resolution (MapLibre stretches it over the map), so this only bites on very large files.
 */
const MAX_IMAGE_SIDE = 2048;
/** Palette lookup-table entries — plenty for a smooth ramp, and cheap to build. */
const LUT_SIZE = 256;

type Rgba = [number, number, number, number];
const TRANSPARENT: Rgba = [0, 0, 0, 0];

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const latitudeOf = (y: number) => ((2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180) / Math.PI;

// ---- Colour ----

/**
 * Builds a value → RGBA function from the layer's style. The palette is sampled once into a
 * lookup table so colouring millions of cells doesn't call the interpolator per cell.
 * No-data, and values beyond min/max that the style hides (`hideBelowMin`/`hideAboveMax`), come
 * back fully transparent; other out-of-range values take the nearest end colour. The returned tuples are shared — copy them, don't mutate them.
 */
export function createColourScale(style: GridStyle, extent: [number, number] = [0, 1]) {
  const { colourConfig, noData, hideBelowMin, hideAboveMax, classes } = style;
  const min = colourConfig?.min ?? extent[0];
  const max = colourConfig?.max ?? extent[1];
  const range = max - min || 1;
  const interpolator = getPaletteInterpolator(colourConfig) ?? ((t: number) => `rgb(${t * 255},${t * 255},${t * 255})`);
  const lut = Array.from({ length: LUT_SIZE }, (_, index): Rgba => [
    ...parseColor(interpolator(index / (LUT_SIZE - 1))),
    255
  ]);
  const classCount = classes && classes >= 2 ? classes : 0;

  return (value: number): Rgba => {
    if (Number.isNaN(value) || value === noData) return TRANSPARENT;

    const t = (value - min) / range;
    if ((t < 0 && hideBelowMin) || (t > 1 && hideAboveMax)) return TRANSPARENT;

    const clamped = Math.min(1, Math.max(0, t));
    // Stepped classes: each class takes the colour at its own position along the ramp.
    const stepped = classCount ? Math.min(Math.floor(clamped * classCount), classCount - 1) / (classCount - 1) : clamped;
    return lut[Math.round(stepped * (LUT_SIZE - 1))];
  };
}

// ---- Resampling ----

/**
 * Colours a grid into an RGBA image laid out in Web Mercator.
 *
 * MapLibre stretches an image source linearly between its corners in Mercator space. An
 * EPSG:4326 grid has evenly spaced *latitudes*, so drawing it 1:1 would push everything
 * towards the equator. Instead each output row is placed at an even Mercator step and filled
 * from whichever source row covers that latitude. EPSG:3857 grids are already even in
 * Mercator and map straight through.
 */
export function renderGridPixels(
  grid: DecodedGrid,
  style: GridStyle,
  /** Caps the image's longest side, e.g. for a small in-modal preview */
  maxSide = MAX_IMAGE_SIDE
): GridPixels {
  return timed(`render ${grid.width}×${grid.height} (max ${maxSide}px)`, () => buildPixels(grid, style, maxSide));
}

function buildPixels(grid: DecodedGrid, style: GridStyle, maxSide: number): GridPixels {
  const [west, south, east, north] = grid.bounds;
  const top = Math.min(north, MAX_MERCATOR_LAT);
  const bottom = Math.max(south, -MAX_MERCATOR_LAT);
  const topY = mercatorY(top);
  const bottomY = mercatorY(bottom);

  // Output size: keep the source's column count, and pick a row count that keeps pixels
  // roughly square in Mercator (never fewer rows than the source has).
  // Scale both axes together when the source is larger than `maxSide`, so cells stay square.
  const downscale = Math.min(1, maxSide / Math.max(grid.width, grid.height));
  const width = Math.max(1, Math.round(grid.width * downscale));
  const spanX = ((east - west) * Math.PI) / 180 || 1;
  const squareRows = Math.round((width * (topY - bottomY)) / spanX);
  const height = Math.max(1, Math.min(maxSide, Math.max(squareRows, Math.round(grid.height * downscale))));

  // Output row → source row.
  const sourceTopY = mercatorY(Math.min(north, 89.9999));
  const sourceBottomY = mercatorY(Math.max(south, -89.9999));
  const sourceRowOf = (outputRow: number) => {
    const y = topY - ((outputRow + 0.5) / height) * (topY - bottomY);
    const fraction =
      grid.crs === 3857 ? (sourceTopY - y) / (sourceTopY - sourceBottomY) : (north - latitudeOf(y)) / (north - south);
    return Math.min(grid.height - 1, Math.max(0, Math.floor(fraction * grid.height)));
  };
  const sourceColumnOf = (outputColumn: number) => Math.floor(((outputColumn + 0.5) * grid.width) / width);

  const colourOf = createColourScale(style, gridExtent(grid.values));
  const data = new Uint8ClampedArray(width * height * 4);
  const sourceColumns = Array.from({ length: width }, (_, column) => sourceColumnOf(column));

  // Hot path over every output pixel: plain loops, since this runs on every style change.
  for (let row = 0; row < height; row++) {
    const sourceRowStart = sourceRowOf(row) * grid.width;
    for (let column = 0; column < width; column++) {
      data.set(colourOf(grid.values[sourceRowStart + sourceColumns[column]]), (row * width + column) * 4);
    }
  }

  return {
    width,
    height,
    data,
    coordinates: [
      [west, top],
      [east, top],
      [east, bottom],
      [west, bottom]
    ]
  };
}

/**
 * Colours a grid into an `ImageData` for `ImageSource.updateImage({ image })`. MapLibre uploads
 * the pixels straight to a texture, skipping the PNG encode, blob URL and decode a URL needs.
 */
export function renderGridImageData(
  grid: DecodedGrid,
  style: GridStyle
): { image: ImageData; coordinates: ImageCorners } {
  const { width, height, data, coordinates } = renderGridPixels(grid, style);
  return { image: new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height), coordinates };
}
