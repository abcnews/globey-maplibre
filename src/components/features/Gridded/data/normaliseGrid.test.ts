import { describe, expect, it } from 'vitest';
import { normaliseGrid } from './normaliseGrid.ts';
import type { DecodedGrid } from './types.ts';

const grid = (values: number[], bounds: DecodedGrid['bounds'], width = 2): DecodedGrid => ({
  width,
  height: values.length / width,
  values: Float32Array.from(values),
  bounds,
  crs: 4326,
  bandCount: 1
});

describe('normaliseGrid', () => {
  it('rolls a global 0–360 grid so it spans −180…180', () => {
    const result = normaliseGrid(grid([1, 2, 3, 4], [0, -90, 360, 90], 4));
    expect(result.bounds).toEqual([-180, -90, 180, 90]);
    expect(Array.from(result.values)).toEqual([3, 4, 1, 2]);
  });

  it('shifts a regional grid east of 180° into −180…180', () => {
    expect(normaliseGrid(grid([1, 2], [200, 0, 220, 10])).bounds).toEqual([-160, 0, -140, 10]);
  });

  it('leaves a −180…180 grid alone', () => {
    const input = grid([1, 2], [-180, -90, 180, 90]);
    expect(normaliseGrid(input)).toEqual(input);
  });
});
