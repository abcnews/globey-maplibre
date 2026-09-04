import { describe, it, expect } from 'vitest';
import { unwrapLongitude, normaliseLongitude, buildViewportRing } from './utils.ts';

describe('unwrapLongitude', () => {
  it('leaves a longitude already near the reference untouched', () => {
    expect(unwrapLongitude(20, 25)).toBe(20);
  });

  it('pulls a normalised eastern corner past the antimeridian', () => {
    // Viewport centred on 180: maplibre reports the eastern edge as -170, really 190.
    expect(unwrapLongitude(-170, 180)).toBe(190);
  });

  it('pulls a normalised western corner back below the antimeridian', () => {
    expect(unwrapLongitude(170, -180)).toBe(-190);
  });

  it('handles references more than one turn away', () => {
    expect(unwrapLongitude(10, 730)).toBe(730);
  });
});

describe('normaliseLongitude', () => {
  it('wraps values back into [-180, 180]', () => {
    expect(normaliseLongitude(190)).toBe(-170);
    expect(normaliseLongitude(-190)).toBe(170);
    expect(normaliseLongitude(45)).toBe(45);
  });
});

describe('buildViewportRing', () => {
  it('closes the ring by repeating the first corner', () => {
    const ring = buildViewportRing(
      [
        [10, 5],
        [20, 5],
        [20, -5],
        [10, -5]
      ],
      15
    );
    expect(ring).toHaveLength(5);
    expect(ring[4]).toEqual(ring[0]);
  });

  it('keeps a viewport straddling the antimeridian continuous', () => {
    // Corners as maplibre reports them for a globe centred on ~180.
    const ring = buildViewportRing(
      [
        [170, 20],
        [-170, 20],
        [-170, -20],
        [170, -20]
      ],
      179
    );

    const lngs = ring.map(([lng]) => lng);
    expect(lngs).toEqual([170, 190, 190, 170, 170]);

    // No segment jumps more than the true viewport width.
    const jumps = lngs.slice(1).map((lng, i) => Math.abs(lng - lngs[i]));
    expect(Math.max(...jumps)).toBeLessThanOrEqual(20);
  });

  it('leaves an ordinary mid-map viewport unchanged', () => {
    const corners: [number, number][] = [
      [-10, 20],
      [30, 20],
      [30, -20],
      [-10, -20]
    ];
    const ring = buildViewportRing(corners, 10);
    expect(ring.slice(0, 4)).toEqual(corners);
  });
});
