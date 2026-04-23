import { describe, it, expect } from 'vitest';
import { calculateTargetView } from './utils';

describe('calculateTargetView - Aramac Example', () => {
  const aramacBounds: [number, number][] = [
    [145.224844, -22.9602161],
    [145.260066, -22.9602161],
    [145.260066, -22.9808101],
    [145.224844, -22.9808101]
  ];

  // The expected centre based on the average of the bounds
  const expectedCentre = [145.242455, -22.970513];

  it('calculates correct zoom and centre for iPhone Portrait (390 x 844)', () => {
    const view = calculateTargetView(aramacBounds, 390, 844, 'fill');

    expect(view).not.toBeNull();
    expect(view!.center[0]).toBeCloseTo(expectedCentre[0], 6);
    expect(view!.center[1]).toBeCloseTo(expectedCentre[1], 6);

    // (Calculated zoom for 390x844 fill mode)
    expect(view!.zoom).toBeCloseTo(14.692, 2);
  });

  it('calculates correct zoom and centre for iPad Landscape (1024 x 768)', () => {
    const view = calculateTargetView(aramacBounds, 1024, 768, 'fill');
    expect(view).not.toBeNull();
    expect(view!.center[0]).toBeCloseTo(expectedCentre[0], 6);
    expect(view!.center[1]).toBeCloseTo(expectedCentre[1], 6);

    // (Calculated zoom for 1024x768 fill mode)
    expect(view!.zoom).toBeCloseTo(14.5555, 2);
  });

  it('differs between fit and fill modes', () => {
    const fitView = calculateTargetView(aramacBounds, 1024, 768, 'fit');
    const fillView = calculateTargetView(aramacBounds, 1024, 768, 'fill');

    expect(fillView!.zoom).toBeGreaterThan(fitView!.zoom);
  });
});
