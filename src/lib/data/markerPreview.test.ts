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
});
