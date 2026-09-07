import { describe, it, expect } from 'vitest';
import {
  clockStateKey,
  computeDesiredPosition,
  lerp,
  lerpColour,
  lerpCoords,
  tweenStopsExpression
} from './utils.ts';

describe('computeDesiredPosition', () => {
  it('holds on the first panel during the prelude', () => {
    expect(
      computeDesiredPosition({ currentPanel: 0, virtualPanel: -1, panelPct: 0.6, panelCount: 4, mode: 'scroll' })
    ).toBe(0);
  });

  it('holds on the last panel during the outro', () => {
    expect(
      computeDesiredPosition({ currentPanel: 3, virtualPanel: 4, panelPct: 0.4, panelCount: 4, mode: 'scroll' })
    ).toBe(3);
  });

  it('tracks scroll position in scroll mode', () => {
    expect(
      computeDesiredPosition({ currentPanel: 1, virtualPanel: 1, panelPct: 0.25, panelCount: 4, mode: 'scroll' })
    ).toBe(1.25);
  });

  it('snaps to the whole panel index in immediate mode, ignoring panelPct', () => {
    expect(
      computeDesiredPosition({ currentPanel: 2, virtualPanel: 2, panelPct: 0.9, panelCount: 4, mode: 'immediate' })
    ).toBe(2);
  });

  it('clamps to the last segment when scrolling past the final panel', () => {
    expect(
      computeDesiredPosition({ currentPanel: 3, virtualPanel: 3, panelPct: 0.8, panelCount: 4, mode: 'scroll' })
    ).toBe(3);
  });

  it('returns 0 when there are no panels', () => {
    expect(
      computeDesiredPosition({ currentPanel: 0, virtualPanel: 0, panelPct: 0, panelCount: 0, mode: 'scroll' })
    ).toBe(0);
  });
});

describe('lerp', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(lerp(10, 20, 0)).toBe(10);
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns the midpoint at t=0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
  });
});

describe('lerpColour', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(lerpColour('#000000', '#ffffff', 0)).toBe('rgb(0,0,0)');
    expect(lerpColour('#000000', '#ffffff', 1)).toBe('rgb(255,255,255)');
  });

  it('blends halfway at t=0.5', () => {
    expect(lerpColour('#000000', '#ffffff', 0.5)).toBe('rgb(128,128,128)');
  });

  it('falls back to the defined colour when one side is missing', () => {
    expect(lerpColour(undefined, '#ff0000', 0.5)).toBe('#ff0000');
    expect(lerpColour('#00ff00', undefined, 0.5)).toBe('#00ff00');
  });
});

describe('lerpCoords', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(lerpCoords([0, 0], [10, 20], 0)).toEqual([0, 0]);
    expect(lerpCoords([0, 0], [10, 20], 1)).toEqual([10, 20]);
  });

  it('interpolates latitude and longitude linearly for a short hop', () => {
    const [lng, lat] = lerpCoords([0, 0], [10, 20], 0.5);
    expect(lng).toBeCloseTo(5, 6);
    expect(lat).toBeCloseTo(10, 6);
  });

  it('crosses the antimeridian by the short path (Fiji → Samoa)', () => {
    const [lng] = lerpCoords([178.065, -17.7134], [-172.1046, -13.759], 0.5);
    // Short path travels east across ±180, not west through longitude 0.
    expect(Math.abs(lng)).toBeGreaterThan(170);
  });
});

describe('tweenStopsExpression', () => {
  it('returns a single value unchanged', () => {
    expect(tweenStopsExpression([0.5])).toBe(0.5);
    expect(tweenStopsExpression(['#abcdef'])).toBe('#abcdef');
  });

  it('builds an interpolate over the tween position with one stop per panel', () => {
    const expr = tweenStopsExpression([0, 1, 0]);
    expect(expr[0]).toBe('interpolate');
    expect(expr[1]).toEqual(['linear']);
    expect(expr[2]).toEqual(['number', ['global-state', 'tweenPos'], 0]);
    expect(expr.slice(3)).toEqual([0, 0, 1, 1, 2, 0]);
  });

  it('uses a custom global-state key when given one', () => {
    const expr = tweenStopsExpression([0, 1], 'foo');
    expect(expr[2]).toEqual(['number', ['global-state', 'foo'], 0]);
  });
});

describe('clockStateKey', () => {
  it('maps immediate mode to the play-on-arrival key', () => {
    expect(clockStateKey('immediate')).toBe('tweenPosImmediate');
  });

  it('maps scroll mode to the scroll-tied key', () => {
    expect(clockStateKey('scroll')).toBe('tweenPosScroll');
  });

  it('builds a stops expression bound to a clock key', () => {
    const expr = tweenStopsExpression([0, 1, 0], clockStateKey('immediate'));
    expect(expr[2]).toEqual(['number', ['global-state', 'tweenPosImmediate'], 0]);
  });
});

describe('computeDesiredPosition — one input, two clock targets', () => {
  const input = { currentPanel: 2, virtualPanel: 2, panelPct: 0.4, panelCount: 5 };

  it('gives the scroll clock a fractional target and the immediate clock a whole one', () => {
    expect(computeDesiredPosition({ ...input, mode: 'scroll' })).toBe(2.4);
    expect(computeDesiredPosition({ ...input, mode: 'immediate' })).toBe(2);
  });
});
