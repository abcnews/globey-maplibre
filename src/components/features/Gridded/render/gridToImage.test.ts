import { describe, expect, it } from 'vitest';
import type { DecodedGrid } from '../data/types.ts';
import { createColourScale, MAX_MERCATOR_LAT, renderGridPixels } from './gridToImage.ts';

const colourConfig = { paletteType: 'custom' as const, customPalette: ['#000000', '#ffffff'], min: 0, max: 10 };

describe('createColourScale', () => {
  it('maps min/max to the palette ends and hides no-data', () => {
    const colourOf = createColourScale({ colourConfig, hideBelowMin: false, hideAboveMax: false, noData: -1 });
    expect(colourOf(0)).toEqual([0, 0, 0, 255]);
    expect(colourOf(10)).toEqual([255, 255, 255, 255]);
    expect(colourOf(20)).toEqual([255, 255, 255, 255]);
    expect(colourOf(NaN)[3]).toBe(0);
    expect(colourOf(-1)[3]).toBe(0);
  });

  it('makes values below min transparent when asked, and still clamps the top', () => {
    const colourOf = createColourScale({ colourConfig, hideBelowMin: true, hideAboveMax: false });
    expect(colourOf(-0.1)[3]).toBe(0);
    expect(colourOf(0)[3]).toBe(255);
    expect(colourOf(11)).toEqual([255, 255, 255, 255]);
  });

  it('makes values above max transparent when asked, and still clamps the bottom', () => {
    const colourOf = createColourScale({ colourConfig, hideBelowMin: false, hideAboveMax: true });
    expect(colourOf(11)[3]).toBe(0);
    expect(colourOf(10)[3]).toBe(255);
    expect(colourOf(-0.1)).toEqual([0, 0, 0, 255]);
  });

  it('steps into classes', () => {
    const colourOf = createColourScale({ colourConfig, hideBelowMin: false, hideAboveMax: false, classes: 2 });
    expect(colourOf(4.9)).toEqual([0, 0, 0, 255]);
    expect(colourOf(5.1)).toEqual([255, 255, 255, 255]);
  });
});

describe('renderGridPixels', () => {
  /** A global lat/lng grid, one column, one row per 30° band: north half 10, south half 0. */
  const grid: DecodedGrid = {
    width: 1,
    height: 6,
    values: Float32Array.from([10, 10, 10, 0, 0, 0]),
    bounds: [-180, -90, 180, 90],
    crs: 4326
  };

  it('clips to Web Mercator latitudes', () => {
    const { coordinates } = renderGridPixels(grid, { colourConfig, hideBelowMin: false, hideAboveMax: false });
    expect(coordinates[0]).toEqual([-180, MAX_MERCATOR_LAT]);
    expect(coordinates[2]).toEqual([180, -MAX_MERCATOR_LAT]);
  });

  it('keeps the equator in the middle row', () => {
    const { height, data } = renderGridPixels(grid, { colourConfig, hideBelowMin: false, hideAboveMax: false });
    const redAt = (row: number) => data[row * 4];
    expect(redAt(Math.floor(height / 2) - 1)).toBe(255);
    expect(redAt(Math.floor(height / 2))).toBe(0);
  });

  it('keeps the image within maxSide', () => {
    const { width, height } = renderGridPixels(grid, { colourConfig, hideBelowMin: false, hideAboveMax: false }, 4);
    expect(Math.max(width, height)).toBeLessThanOrEqual(4);
  });

  it('stretches polar rows the way Mercator does', () => {
    // 60–90°N is a third of the northern half in degrees, but in Mercator clipped at 85° it
    // covers (π − ln tan 75°) / π ≈ 58% of it.
    const width = 60;
    const polar: DecodedGrid = {
      ...grid,
      width,
      values: Float32Array.from({ length: width * 6 }, (_, index) => (index < width ? 10 : 0))
    };
    const { height, data } = renderGridPixels(polar, { colourConfig, hideBelowMin: false, hideAboveMax: false });
    const whiteRows = Array.from({ length: height }, (_, row) => data[row * width * 4]).filter(red => red === 255).length;
    expect(whiteRows / (height / 2)).toBeCloseTo(0.58, 1);
  });
});
