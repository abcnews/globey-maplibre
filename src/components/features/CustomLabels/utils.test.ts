import { describe, it, expect } from 'vitest';
import type { Label, LabelStyle } from '../../../lib/marker';
import { resolveLabelTransition } from './utils.ts';

const label = (name: string, coords: [number, number], style: LabelStyle = 'country-large'): Label => ({
  name,
  coords,
  style,
  number: 0
});

const X = label('X', [10, 10]);
const Y = label('Y', [20, 20]);
const Z = label('Z', [30, 30]);

describe('resolveLabelTransition', () => {
  it('keeps labels present in both panels fully opaque', () => {
    const out = resolveLabelTransition([X, Y], [Y, X], 0.5);
    expect(out.every(f => f.opacity === 1)).toBe(true);
    expect(out.map(f => f.name).sort()).toEqual(['X', 'Y']);
  });

  it('fades a leaving label out with 1 - easedT and an entering label in with easedT', () => {
    const out = resolveLabelTransition([X, Y], [Y, Z], 0.25);
    const opacity = Object.fromEntries(out.map(f => [f.name, f.opacity]));
    expect(opacity.X).toBeCloseTo(0.75, 6); // leaving
    expect(opacity.Y).toBe(1); // persistent
    expect(opacity.Z).toBeCloseTo(0.25, 6); // entering
  });

  it('holds the outgoing position/style for persistent labels', () => {
    const movedY = label('Y', [99, 99], 'water-large');
    const [feature] = resolveLabelTransition([Y], [movedY], 0.5);
    expect(feature.coords).toEqual([20, 20]);
    expect(feature.style).toBe('country-large');
    expect(feature.opacity).toBe(1);
  });

  it('treats identical labels as persistent at every easedT', () => {
    const labels = [X, Y, Z];
    for (const t of [0, 0.5, 1]) {
      const out = resolveLabelTransition(labels, labels, t);
      expect(out).toHaveLength(3);
      expect(out.every(f => f.opacity === 1)).toBe(true);
    }
  });

  it('treats every label as entering when the outgoing panel has none', () => {
    const out = resolveLabelTransition([], [X, Y], 1);
    expect(out.map(f => f.opacity)).toEqual([1, 1]);
    const zero = resolveLabelTransition([], [X, Y], 0);
    expect(zero.map(f => f.opacity)).toEqual([0, 0]);
  });

  it('treats every label as leaving when the incoming panel has none', () => {
    const out = resolveLabelTransition([X, Y], [], 1);
    expect(out.map(f => f.opacity)).toEqual([0, 0]);
  });

  it('drops labels with no coordinates', () => {
    const broken = { name: 'B', style: 'country-large', number: 0 } as unknown as Label;
    const out = resolveLabelTransition([X, broken], [X], 0.5);
    expect(out.map(f => f.name)).toEqual(['X']);
  });
});
