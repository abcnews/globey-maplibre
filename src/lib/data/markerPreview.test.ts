import { describe, it } from 'vitest';
import assert from 'node:assert';
import { applyMarkerOverrides } from './markerPreview.ts';
import { parseGlobeJsonBlob, type GlobeJsonBlob, type GeoJsonAreasLayer } from './jsonBlob.ts';

function baseOptions(): GlobeJsonBlob {
  return parseGlobeJsonBlob({
    map: { coords: [0, 0], z: 2, base: 'street', projection: 'globe', minimap: { enabled: true, bounds: [] } },
    layers: [
      { type: 'geojsonAreas', id: 'fires', cmid: 1, colourMode: 'simple' },
      { type: 'icon', id: 'city', cmid: 2, coords: [0, 0] },
      { type: 'gridded', id: 'temps', url: '/t.tif' },
      { type: 'mapLabels', id: 'builtinmaplabels', countriesMajor: true }
    ]
  });
}

/** The layers of one kind left in the result, in stack order. */
const kept = (result: GlobeJsonBlob, type: string) => result.layers.filter(l => l.type === type);
const firstGeoJson = (result: GlobeJsonBlob) => kept(result, 'geojsonAreas')[0] as GeoJsonAreasLayer | undefined;

describe('applyMarkerOverrides', () => {
  it('excludes a layer with no override (off by default)', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.deepStrictEqual(kept(result, 'geojsonAreas'), []);
    assert.deepStrictEqual(kept(result, 'icon'), []);
  });

  it('switches gridded layers on and off like other overridable kinds, so they can fade', () => {
    assert.deepStrictEqual(kept(applyMarkerOverrides(baseOptions(), {}), 'gridded'), []);

    const [layer] = kept(applyMarkerOverrides(baseOptions(), { layers: [{ name: 'temps', state: 'on' }] }), 'gridded');
    assert.strictEqual(layer?.id, 'temps');
    assert.strictEqual(layer?.animationClock, 'scroll');
  });

  it('keeps a layer with an "on" override', () => {
    const result = applyMarkerOverrides(baseOptions(), { layers: [{ name: 'fires', state: 'on' }] });
    assert.strictEqual(kept(result, 'geojsonAreas').length, 1);
    assert.strictEqual(firstGeoJson(result)?.id, 'fires');
  });

  it('matches a layer by its id', () => {
    const base = parseGlobeJsonBlob({
      layers: [{ type: 'raster', id: 'rasterab12', url: 'https://example.com/{z}/{x}/{y}.png' }]
    });
    const result = applyMarkerOverrides(base, { layers: [{ name: 'rasterab12', state: 'on' }] });
    assert.strictEqual(kept(result, 'raster').length, 1);
  });

  it('preserves the master blob stack order among the layers it keeps', () => {
    const base = parseGlobeJsonBlob({
      layers: [
        { type: 'geojsonAreas', id: 'bottom', cmid: 1 },
        { type: 'geojsonAreas', id: 'middle', cmid: 2 },
        { type: 'geojsonAreas', id: 'top', cmid: 3 }
      ]
    });
    const result = applyMarkerOverrides(base, {
      layers: [
        { name: 'top', state: 'on' },
        { name: 'bottom', state: 'on' }
      ]
    });
    assert.deepStrictEqual(
      result.layers.map(l => l.id),
      ['bottom', 'top']
    );
  });

  it('rewrites colourMode/colourConfig.basic with a # for a colour override', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      layers: [{ name: 'fires', state: 'on', colour: 'ff3300' }]
    });
    assert.strictEqual(firstGeoJson(result)?.colourMode, 'basic');
    assert.strictEqual(firstGeoJson(result)?.colourConfig?.basic, '#ff3300');
    // `undefined` (not 'normal') is what makes resolveSchemeColour use the hex.
    assert.strictEqual(firstGeoJson(result)?.colourConfig?.basicType, undefined);
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
    assert.deepStrictEqual(result.map.bounds, [
      [1, 2],
      [3, 4]
    ]);
    assert.strictEqual(result.map.base, 'dark');
    assert.deepStrictEqual(kept(result, 'mapLabels'), []);
    assert.strictEqual(result.map.minimap?.enabled, false);
  });

  it('keeps the map labels layer when the marker does not switch it off', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(kept(result, 'mapLabels').length, 1);
  });

  it('leaves base fields unchanged when overrides are absent', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(result.map.base, 'street');
    assert.strictEqual(result.map.bounds, undefined);
  });

  it('does not mutate the base blob', () => {
    const base = baseOptions();
    applyMarkerOverrides(base, { base: 'dark', layers: [{ name: 'fires', state: 'on', colour: 'ff3300' }] });
    assert.strictEqual(base.map.base, 'street');
    assert.strictEqual(base.layers.length, 4);
    assert.strictEqual((base.layers[0] as GeoJsonAreasLayer).colourMode, 'simple');
  });

  it('sets scroll-tied camera animation when cam is absent', () => {
    const result = applyMarkerOverrides(baseOptions(), {});
    assert.strictEqual(result.map.animationMode, 'scroll');
  });

  it('sets immediate camera animation from cam when present', () => {
    const result = applyMarkerOverrides(baseOptions(), { cam: 1500 });
    assert.strictEqual(result.map.animationMode, 'immediate');
    assert.strictEqual(result.map.animationDuration, 1500);
  });

  it('gives an "on" layer with no duration a scroll-tied animationClock', () => {
    const result = applyMarkerOverrides(baseOptions(), { layers: [{ name: 'fires', state: 'on' }] });
    assert.strictEqual(firstGeoJson(result)?.animationClock, 'scroll');
  });

  it('gives an "on" layer with any duration an immediate animationClock, ignoring the value', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      layers: [{ name: 'fires', state: 'on', duration: 1 }]
    });
    assert.strictEqual(firstGeoJson(result)?.animationClock, 'immediate');
  });

  it('fitGlobe wins over bbox and clears bounds', () => {
    const result = applyMarkerOverrides(baseOptions(), {
      bbox: [
        [1, 2],
        [3, 4]
      ],
      fitGlobe: true
    });
    assert.strictEqual(result.map.fitGlobe, true);
    assert.deepStrictEqual(result.map.bounds, []);
  });

  it('fitGlobe false is applied explicitly, leaving bounds untouched', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: false });
    assert.strictEqual(result.map.fitGlobe, false);
    assert.strictEqual(result.map.bounds, undefined);
  });

  it('applies a captured centre to coords when set', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: true, center: [151.2, -33.9] });
    assert.deepStrictEqual(result.map.coords, [151.2, -33.9]);
  });

  it('leaves coords unchanged when no centre is captured', () => {
    const result = applyMarkerOverrides(baseOptions(), { fitGlobe: true });
    assert.deepStrictEqual(result.map.coords, [0, 0]);
  });
});
