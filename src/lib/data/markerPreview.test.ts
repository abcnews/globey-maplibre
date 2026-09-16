import { describe, it } from 'vitest';
import assert from 'node:assert';
import { applyMarkerOverrides } from './markerPreview.ts';
import type { DecodedObject } from '../marker/types.ts';

function baseOptions(): DecodedObject {
  return {
    coords: [0, 0],
    z: 2,
    base: 'street',
    projection: 'globe',
    geoJson: [{ name: 'fires', id: 'fires', cmid: 1, type: 'areas', colourMode: 'simple' } as any],
    icons: [{ name: 'city', id: 'city', cmid: 2, coords: [0, 0] } as any],
    mapLabels: { countriesMajor: true } as any,
    minimap: { enabled: true, bounds: [] }
  };
}

describe('applyMarkerOverrides', () => {
  it('excludes a layer with no override (off by default)', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.deepStrictEqual(result.geoJson, []);
    assert.deepStrictEqual(result.icons, []);
  });

  it('keeps a layer with an "on" override', () => {
    const result = applyMarkerOverrides(baseOptions(), { layers: [{ name: 'fires', state: 'on' }] });
    assert.strictEqual(result.geoJson?.length, 1);
    assert.strictEqual(result.geoJson?.[0].id, 'fires');
  });

  it('rewrites colourMode/colourConfig.basic with a # for a colour override', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      layers: [{ name: 'fires', state: 'on', colour: 'ff3300' }]
    });
    assert.strictEqual(result.geoJson?.[0].colourMode, 'basic');
    assert.strictEqual(result.geoJson?.[0].colourConfig?.basic, '#ff3300');
    assert.strictEqual(result.geoJson?.[0].colourConfig?.basicType, undefined);
  });

  it('applies bbox/base/labels/minimap overrides when set', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      bbox: [
        [1, 2],
        [3, 4]
      ],
      base: 'dark',
      labels: false,
      minimap: false
    });
    assert.deepStrictEqual(result.bounds, [
      [1, 2],
      [3, 4]
    ]);
    assert.strictEqual(result.base, 'dark');
    assert.strictEqual(result.mapLabels, undefined);
    assert.strictEqual(result.minimap?.enabled, false);
  });

  it('leaves base fields unchanged when overrides are absent', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(result.base, 'street');
    assert.strictEqual(result.bounds, undefined);
  });

  it('sets scroll-tied camera animation when cam is absent', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(result.animationMode, 'scroll');
    assert.strictEqual(result.animationDuration, undefined);
  });

  it('sets immediate camera animation from cam when present', () => {
    const result = applyMarkerOverrides(baseOptions(), { cam: 1500 });
    assert.strictEqual(result.animationMode, 'immediate');
    assert.strictEqual(result.animationDuration, 1500);
  });

  it('gives an "on" layer with no duration a scroll-tied animationClock', () => {
    const result = applyMarkerOverrides(baseOptions(), { layers: [{ name: 'fires', state: 'on' }] });
    assert.strictEqual(result.geoJson?.[0].animationClock, 'scroll');
  });

  it('gives an "on" layer with any duration an immediate animationClock, ignoring the value', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      layers: [{ name: 'fires', state: 'on', duration: 1 }]
    });
    assert.strictEqual(result.geoJson?.[0].animationClock, 'immediate');
  });

  it('fitGlobe wins over bbox and clears bounds', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      bbox: [
        [1, 2],
        [3, 4]
      ],
      fitGlobe: true
    });
    assert.strictEqual(result.fitGlobe, true);
    assert.deepStrictEqual(result.bounds, []);
  });

  it('fitGlobe false is applied explicitly, leaving bounds untouched', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: false });
    assert.strictEqual(result.fitGlobe, false);
    assert.strictEqual(result.bounds, undefined);
  });

  it('leaves fitGlobe unset when absent from the marker', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(result.fitGlobe, undefined);
  });

  it('applies a captured centre to coords when set', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: true, center: [151.2, -33.9] });
    assert.deepStrictEqual(result.coords, [151.2, -33.9]);
  });

  it('leaves coords unchanged when no centre is captured', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: true });
    assert.deepStrictEqual(result.coords, [0, 0]);
  });
});
