import { describe, expect, it } from 'vitest';
import { gridExtent, sampleGridValues } from './stats.ts';

describe('sampleGridValues', () => {
  it('caps the sample size and skips no-data', () => {
    const values = Float32Array.from({ length: 10_000_000 }, (_, index) => (index % 7 ? index : NaN));
    const samples = sampleGridValues(values, 1000);
    expect(samples.length).toBeLessThanOrEqual(1000);
    expect(samples.some(Number.isNaN)).toBe(false);
  });
});

describe('gridExtent', () => {
  it('ignores NaN and handles large grids', () => {
    const values = Float32Array.from({ length: 5_000_000 }, (_, index) => index);
    values[0] = NaN;
    expect(gridExtent(values)).toEqual([1, 4_999_999]);
  });

  it('is undefined for an empty grid', () => {
    expect(gridExtent(Float32Array.from([NaN]))).toBeUndefined();
  });
});
