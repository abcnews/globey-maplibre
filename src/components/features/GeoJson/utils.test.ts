import { describe, it, expect, assert, vi, afterEach } from 'vitest';
import {
  generateId,
  getFeatureStateEvaluator,
  getColourEvaluator,
  getHeightEvaluator,
  getKilometreZoomScaleExpression,
  fetchGeoJsonData,
  buildFilterExpression,
  buildColourExpression,
  HIDDEN_FEATURE_STATE,
  EARTH_CIRCUMFERENCE_KM,
  TILE_SIZE_PX
} from './utils.ts';
import type { GeoJsonConfig } from '../../../lib/marker';

describe('GeoJson Utils & Feature State Evaluators', () => {
  describe('generateId', () => {
    it('should generate stable IDs from URLs', () => {
      const url = 'https://example.com/data.json';
      const id1 = generateId(url);
      const id2 = generateId(url);
      assert.strictEqual(id1, id2);
      assert.ok(id1.startsWith('gj-'));
    });

    it('should return "none" for empty URLs', () => {
      assert.strictEqual(generateId(''), 'none');
    });
  });

  describe('getKilometreZoomScaleExpression', () => {
    it('should build an exponential zoom interpolation expression based on Earth circumference', () => {
      const expr = getKilometreZoomScaleExpression(100);
      assert.strictEqual(expr[0], 'interpolate');
      assert.deepStrictEqual(expr[1], ['exponential', 2]);
      assert.deepStrictEqual(expr[2], ['zoom']);
      assert.strictEqual(expr[3], 0);
      const expectedSizeAtZoom0 = (100 / EARTH_CIRCUMFERENCE_KM) * TILE_SIZE_PX;
      assert.strictEqual(expr[4], expectedSizeAtZoom0);
      assert.strictEqual(expr[5], 22);
      assert.strictEqual(expr[6], expectedSizeAtZoom0 * Math.pow(2, 22));
    });
  });

  describe('Feature State Evaluator (Basic Mode)', () => {
    it('should return preset normal styling by default', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'basic',
        colourConfig: { basicType: 'normal' }
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);

      assert.strictEqual(state.color, '#00267E');
      assert.strictEqual(state.radius, 6);
      assert.strictEqual(state.strokeWidth, 1);
      assert.strictEqual(state.fillOpacity, 0.6);
      assert.strictEqual(state.strokeOpacity, 1.0);
    });

    it('should return preset highlighted styling', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'basic',
        colourConfig: { basicType: 'highlighted' }
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);

      assert.strictEqual(state.color, '#FF3C27');
      assert.strictEqual(state.radius, 8);
      assert.strictEqual(state.strokeWidth, 2);
      assert.strictEqual(state.fillOpacity, 0.6);
      assert.strictEqual(state.strokeOpacity, 1.0);
    });

    it('should respect custom basic colour', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'areas',
        colourMode: 'basic',
        colourConfig: { basic: '#00ff00' }
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);

      assert.strictEqual(state.fillColor, '#00ff00');
    });

    it('should respect isOpaque setting', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'areas',
        colourMode: 'basic',
        isOpaque: true,
        opacity: 0.8
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);

      assert.strictEqual(state.fillOpacity, 0.8);
    });
  });

  describe('Feature State Evaluator (Simple Mode)', () => {
    it('should extract styling from feature properties', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'simple'
      };
      const evaluate = getFeatureStateEvaluator(config);
      const feature = {
        properties: {
          'marker-color': '#112233',
          'marker-size': 'large',
          'stroke-width': 3,
          'stroke-opacity': 0.7,
          'fill-opacity': 0.4
        }
      };
      const state = evaluate(feature, 0);

      assert.strictEqual(state.color, '#112233');
      assert.strictEqual(state.radius, 9);
      assert.strictEqual(state.strokeWidth, 3);
      assert.strictEqual(state.strokeOpacity, 0.7);
      assert.strictEqual(state.fillOpacity, 0.4);
    });
  });

  describe('Feature State Evaluator (Scale Mode)', () => {
    it('should interpolate colours for sequential palette', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'scale',
        colourProp: 'val',
        colourConfig: {
          min: 0,
          max: 100,
          paletteType: 'sequential',
          paletteVariant: 'blue'
        }
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state0 = evaluate({ properties: { val: 0 } }, 0);
      const state100 = evaluate({ properties: { val: 100 } }, 1);

      assert.ok(state0.color);
      assert.ok(state100.color);
      assert.notStrictEqual(state0.color, state100.color);
    });

    it('should interpolate minColour to maxColour linearly', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'scale',
        colourProp: 'val',
        colourConfig: {
          min: 0,
          max: 100,
          minColour: '#000000',
          maxColour: '#ffffff'
        }
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state0 = evaluate({ properties: { val: 0 } }, 0);
      const state100 = evaluate({ properties: { val: 100 } }, 1);

      assert.strictEqual(state0.color, '#000000');
      assert.strictEqual(state100.color, '#ffffff');
    });
  });

  describe('Feature State Evaluator (Filter)', () => {
    it('should style matching features and hide non-matching ones', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'basic',
        colourConfig: { basic: '#004cff' },
        filter: { prop: 'status', values: ['hit'] }
      };

      const evaluate = getFeatureStateEvaluator(config);

      const hitState = evaluate({ properties: { status: 'hit' } }, 0);
      assert.strictEqual(hitState.color, '#004cff');

      const missState = evaluate({ properties: { status: 'miss' } }, 1);
      assert.deepStrictEqual(missState, HIDDEN_FEATURE_STATE);
    });

    it('should style every feature when no filter is configured', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        colourMode: 'basic',
        colourConfig: { basic: '#ff0000' }
      };

      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);
      assert.strictEqual(state.color, '#ff0000');
    });
  });

  describe('buildFilterExpression', () => {
    it('builds a native "in" filter from a GeoJsonFilter', () => {
      const expr = buildFilterExpression({ prop: 'status', values: ['hit', 'maybe'] });
      expect(expr).toEqual(['in', ['get', 'status'], ['literal', ['hit', 'maybe']]]);
    });

    it('returns undefined when there is no filter or no values', () => {
      expect(buildFilterExpression(undefined)).toBeUndefined();
      expect(buildFilterExpression({ prop: 'status', values: [] })).toBeUndefined();
    });
  });

  describe('buildColourExpression', () => {
    it('returns a constant colour for basic mode', () => {
      const config: GeoJsonConfig = { type: 'areas', colourMode: 'basic', colourConfig: { basic: '#00ff00' } };
      expect(buildColourExpression(config, 'fill')).toBe('#00ff00');
    });

    it('builds a data-driven interpolate expression for scale mode', () => {
      const config: GeoJsonConfig = {
        type: 'areas',
        colourMode: 'scale',
        colourProp: 'val',
        colourConfig: { min: 0, max: 100, minColour: '#000000', maxColour: '#ffffff' }
      };
      const expr = buildColourExpression(config, 'fill');
      expect(expr[0]).toBe('interpolate');
      expect(expr[1]).toEqual(['linear']);
      expect(expr[2]).toEqual(['to-number', ['get', 'val'], 0]);
      expect(expr.slice(3)).toEqual([0, '#000000', 100, '#ffffff']);
    });

    it('reads simplestyle-spec properties per-feature for simple mode', () => {
      const config: GeoJsonConfig = { type: 'areas', colourMode: 'simple' };
      expect(buildColourExpression(config, 'fill')).toEqual([
        'coalesce',
        ['get', 'fill'],
        ['get', 'fill-color'],
        '#00267E'
      ]);
    });
  });

  describe('getColourEvaluator & getHeightEvaluator', () => {
    it('should return colour directly for spikes', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'spikes',
        colourMode: 'basic',
        colourConfig: { basic: '#123456' }
      };
      const evaluator = getColourEvaluator(config);
      assert.strictEqual(evaluator({ properties: {} }), '#123456');
    });

    it('should calculate spike height properly', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'spikes',
        spike: {
          heightProp: 'pop',
          min: 0,
          max: 100,
          scalar: 100000
        }
      };
      const heightEvaluator = getHeightEvaluator(config);
      const h50 = heightEvaluator({ hVal: 50 });
      assert.strictEqual(h50, 50000);
    });
  });

  describe('fetchGeoJsonData', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('should throw error when neither CMID nor URL is provided', async () => {
      await expect(fetchGeoJsonData({})).rejects.toThrow('Neither CMID nor URL provided');
    });

    it('should throw error for preview URLs', async () => {
      await expect(
        fetchGeoJsonData({ url: 'https://preview.wcms.abc-cdn.net.au/data.json' })
      ).rejects.toThrow('Invalid or preview URL provided');
    });

    it('should fetch GeoJSON from valid URL and assign feature IDs if missing', async () => {
      const mockGeoJson = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [151.2, -33.8] }, properties: { name: 'Sydney' } },
          { id: 'custom-id', type: 'Feature', geometry: { type: 'Point', coordinates: [144.9, -37.8] }, properties: { name: 'Melbourne' } }
        ]
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGeoJson
      });

      const result = await fetchGeoJsonData({ url: 'https://live-production.wcms.abc-cdn.net.au/cities.geojson' });
      assert.strictEqual(result.type, 'FeatureCollection');
      assert.strictEqual(result.features.length, 2);
      assert.strictEqual(result.features[0].id, 0);
      assert.strictEqual(result.features[1].id, 'custom-id');
    });

    it('should convert TopoJSON to GeoJSON when fetched from URL', async () => {
      const mockTopoJson = {
        type: 'Topology',
        objects: {
          collection: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [151.2, -33.8], properties: { name: 'Point A' } }
            ]
          }
        },
        arcs: [],
        transform: { scale: [1, 1], translate: [0, 0] }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTopoJson
      });

      const result = await fetchGeoJsonData({ url: 'https://live-production.wcms.abc-cdn.net.au/map.topojson' });
      assert.strictEqual(result.type, 'FeatureCollection');
      assert.strictEqual(result.features.length, 1);
      assert.strictEqual(result.features[0].properties.name, 'Point A');
      assert.strictEqual(result.features[0].id, 0);
    });
  });
});
