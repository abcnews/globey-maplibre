import { describe, it, expect, assert, vi, afterEach } from 'vitest';
import {
  generateId,
  getFeatureStateEvaluator,
  getColourEvaluator,
  getHeightEvaluator,
  getPaletteInterpolator,
  getKilometreZoomScaleExpression,
  fetchGeoJsonData,
  buildFeatureClasses,
  classPaintExpression,
  FEATURE_CLASS_PROP,
  HIDDEN_FEATURE_STATE,
  COLOUR_SCALE_STEPS,
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
        styles: [{ colourMode: 'basic', colourConfig: { basicType: 'normal' } }]
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
        styles: [{ colourMode: 'basic', colourConfig: { basicType: 'highlighted' } }]
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
        styles: [{ colourMode: 'basic', colourConfig: { basic: '#00ff00' } }]
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state = evaluate({ properties: {} }, 0);

      assert.strictEqual(state.fillColor, '#00ff00');
    });

    it('should respect isOpaque setting', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'areas',
        styles: [{ colourMode: 'basic', isOpaque: true, opacity: 0.8 }]
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
        styles: [{ colourMode: 'simple' }]
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
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: {
              min: 0,
              max: 100,
              paletteType: 'sequential',
              paletteVariant: 'blue'
            }
          }
        ]
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
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: {
              min: 0,
              max: 100,
              minColour: '#000000',
              maxColour: '#ffffff'
            }
          }
        ]
      };
      const evaluate = getFeatureStateEvaluator(config);
      const state0 = evaluate({ properties: { val: 0 } }, 0);
      const state100 = evaluate({ properties: { val: 100 } }, 1);

      assert.strictEqual(state0.color, '#000000');
      assert.strictEqual(state100.color, '#ffffff');
    });
  });

  describe('Feature State Evaluator (Filtered Multi-Style Rules)', () => {
    it('should match filter rules and fallback correctly', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        styles: [
          {
            colourMode: 'basic',
            colourConfig: { basic: '#004cff' },
            filter: { prop: 'status', values: ['hit'] }
          },
          {
            colourMode: 'basic',
            colourConfig: { basic: '#ff0000' }
          }
        ]
      };

      const evaluate = getFeatureStateEvaluator(config);

      const hitState = evaluate({ properties: { status: 'hit' } }, 0);
      assert.strictEqual(hitState.color, '#004cff');

      const missState = evaluate({ properties: { status: 'miss' } }, 1);
      assert.strictEqual(missState.color, '#ff0000');

      const noPropState = evaluate({ properties: {} }, 2);
      assert.strictEqual(noPropState.color, '#ff0000');
    });

    it('should hide features that do not match any filter rule when all rules have filters', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'points',
        styles: [
          {
            colourMode: 'basic',
            colourConfig: { basic: '#004cff' },
            filter: { prop: 'category', values: ['active'] }
          }
        ]
      };

      const evaluate = getFeatureStateEvaluator(config);

      const activeState = evaluate({ properties: { category: 'active' } }, 0);
      assert.strictEqual(activeState.color, '#004cff');
      assert.strictEqual(activeState.opacity, 0.6);

      const inactiveState = evaluate({ properties: { category: 'inactive' } }, 1);
      assert.strictEqual(inactiveState.opacity, 0);
      assert.strictEqual(inactiveState.fillOpacity, 0);
      assert.strictEqual(inactiveState.strokeOpacity, 0);
    });
  });

  describe('buildFeatureClasses', () => {
    const fc = (values: number[]) => ({
      type: 'FeatureCollection',
      features: values.map((v, i) => ({ type: 'Feature', id: i, properties: { val: v }, geometry: null }))
    });

    it('collapses a constant-colour layer that never changes to a single class', () => {
      const cfg: GeoJsonConfig = { cmid: 1, type: 'areas', styles: [{ colourMode: 'basic', colourConfig: { basic: '#00ff00' } }] };
      const data = fc([1, 2, 3]);

      const { classCount, classStates } = buildFeatureClasses(data, [cfg, cfg, cfg]);

      expect(classCount).toBe(1);
      expect(classStates[0]).toHaveLength(3); // one state per panel
      expect(data.features.every((f: any) => f.properties[FEATURE_CLASS_PROP] === 0)).toBe(true);
      expect(classStates[0][0].fillColor).toBe('#00ff00');
    });

    it('bounds a continuous choropleth to at most COLOUR_SCALE_STEPS + 1 classes', () => {
      const cfg: GeoJsonConfig = {
        cmid: 1,
        type: 'areas',
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: { min: 0, max: 100, paletteType: 'sequential', paletteVariant: 'blue' }
          }
        ]
      };
      // 500 distinct values → without quantisation this would be ~500 classes.
      const data = fc(Array.from({ length: 500 }, (_, i) => (i / 499) * 100));

      const { classCount } = buildFeatureClasses(data, [cfg, cfg]);

      expect(classCount).toBeLessThanOrEqual(COLOUR_SCALE_STEPS + 1);
      expect(classCount).toBeGreaterThan(1);
    });

    it('gives features hidden in one panel a distinct trajectory ending in HIDDEN_FEATURE_STATE', () => {
      const cfg: GeoJsonConfig = { cmid: 1, type: 'areas', styles: [{ colourMode: 'basic', colourConfig: { basic: '#00ff00' } }] };
      const data = fc([1, 2]);

      const { classCount, classStates } = buildFeatureClasses(data, [cfg, undefined]);

      expect(classCount).toBe(1);
      expect(classStates[0][0].fillOpacity).toBeGreaterThan(0);
      expect(classStates[0][1]).toEqual(HIDDEN_FEATURE_STATE);
    });

    it('splits into separate classes when a filter matches only some features', () => {
      const cfg: GeoJsonConfig = {
        cmid: 1,
        type: 'areas',
        styles: [{ colourMode: 'basic', colourConfig: { basic: '#004cff' }, filter: { prop: 'val', values: [1] } }]
      };
      const data = fc([1, 2, 1]);

      const { classCount } = buildFeatureClasses(data, [cfg, cfg]);

      expect(classCount).toBe(2); // matched vs hidden
      expect(data.features[0].properties[FEATURE_CLASS_PROP]).toBe(data.features[2].properties[FEATURE_CLASS_PROP]);
      expect(data.features[1].properties[FEATURE_CLASS_PROP]).not.toBe(data.features[0].properties[FEATURE_CLASS_PROP]);
    });
  });

  describe('classPaintExpression', () => {
    const state = (fillColor: string, fillOpacity: number): any => ({ ...HIDDEN_FEATURE_STATE, fillColor, fillOpacity });

    it('returns a bare constant for a single-panel (builder) class', () => {
      expect(classPaintExpression([state('#123456', 0.5)], 'fillColor')).toBe('#123456');
      expect(classPaintExpression([state('#123456', 0.5)], 'fillOpacity')).toBe(0.5);
    });

    it('builds a pure global-state interpolate with one stop per panel', () => {
      const expr = classPaintExpression([state('#000000', 0), state('#ffffff', 1), state('#ff0000', 0.5)], 'fillColor');

      expect(expr[0]).toBe('interpolate');
      expect(expr[1]).toEqual(['linear']);
      expect(expr[2]).toEqual(['number', ['global-state', 'gjPos'], 0]);
      expect(expr.slice(3)).toEqual([0, '#000000', 1, '#ffffff', 2, '#ff0000']);
    });
  });

  describe('getColourEvaluator & getHeightEvaluator', () => {
    it('should return colour directly for spikes', () => {
      const config: GeoJsonConfig = {
        cmid: 12345,
        type: 'spikes',
        styles: [{ colourMode: 'basic', colourConfig: { basic: '#123456' } }]
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
