import { describe, it, expect, assert } from 'vitest';
import { getOpacityExpression, getColourExpression, generateId } from './utils.ts';
import type { GeoJsonConfig } from '../../../../lib/marker';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';

describe('GeoJson Utils', () => {
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

  describe('getOpacityExpression', () => {
    it('should return 1 if no filter is set', () => {
      const config: GeoJsonConfig = { url: 'test', type: 'areas', styles: [{ colourMode: 'simple' }] };
      assert.strictEqual(getOpacityExpression(config), 1);
    });

    it('should return 1 case expression if filter is set', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        styles: [
          {
            colourMode: 'simple',
            filter: { prop: 'id', values: ['1', '2'] }
          }
        ]
      };
      const expected = ['case', ['in', ['to-string', ['coalesce', ['get', 'id'], '']], ['literal', ['1', '2']]], 1, 0];
      assert.deepStrictEqual(getOpacityExpression(config), expected);
    });

    it('should handle multiple styles with filters', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        styles: [
          {
            colourMode: 'simple',
            filter: { prop: 'id', values: ['A'] },
            opacity: 0.5
          },
          {
            colourMode: 'simple',
            filter: { prop: 'id', values: ['B'] },
            opacity: 0.8
          },
          {
            colourMode: 'simple',
            opacity: 1.0
          }
        ]
      };
      const expr = getOpacityExpression(config);
      assert.deepStrictEqual(expr, [
        'case',
        ['==', ['to-string', ['coalesce', ['get', 'id'], '']], 'A'],
        0.5,
        ['==', ['to-string', ['coalesce', ['get', 'id'], '']], 'B'],
        0.8,
        1
      ]);
    });
  });

  describe('getColourExpression (MapLibre Expressions)', () => {
    it('should return override colour', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        styles: [
          {
            colourMode: 'override',
            colourConfig: { override: '#00ff00' }
          }
        ]
      };
      assert.strictEqual(getColourExpression(config, 'fill'), '#00ff00');
    });

    it('should return stroke colour from property (simple mode)', () => {
      const config: GeoJsonConfig = { url: 'test', type: 'lines', styles: [{ colourMode: 'simple' }] };
      const expr = getColourExpression(config, 'stroke');
      assert.deepStrictEqual(expr, ['coalesce', ['get', 'stroke'], '#00297E']);
    });

    it('should return marker colour (simple mode)', () => {
      const config: GeoJsonConfig = { url: 'test', type: 'points', styles: [{ colourMode: 'simple' }] };
      const expr = getColourExpression(config, 'marker');
      assert.deepStrictEqual(expr, [
        'coalesce',
        ['get', 'marker-color'],
        ['get', 'stroke'],
        ['get', 'fill'],
        ['get', 'fill-color'],
        '#00297E'
      ]);
    });

    it('should generate interpolate expression for sequential palette', () => {
      const config: GeoJsonConfig = {
        url: 'test',
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
      const expr = getColourExpression(config, 'marker');
      assert.strictEqual(expr[0], 'interpolate');
      assert.strictEqual(expr[1][0], 'linear');
      assert.strictEqual(expr[2][1], 'val');
      // Stops: [val, colour, val, colour, ...]
      assert.strictEqual(expr[3], 0);
      assert.strictEqual(expr[5], 25);
      assert.strictEqual(expr[11], 100);
    });

    it('should generate interpolate expression for divergent palette', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: {
              min: -100,
              max: 100,
              paletteType: 'divergent',
              paletteVariant: 'RedBlue'
            }
          }
        ]
      };
      const expr = getColourExpression(config, 'fill');
      assert.strictEqual(expr[0], 'interpolate');
      assert.strictEqual(expr[3], -100);
      assert.strictEqual(expr[7], 0); // Middle stop
      assert.strictEqual(expr[11], 100);
    });

    it('should fallback to manual colours if palette variant is invalid', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: {
              min: 0,
              max: 100,
              paletteType: 'sequential',
              paletteVariant: 'invalid-variant',
              minColour: '#ff0000',
              maxColour: '#0000ff'
            }
          }
        ]
      };
      const expr = getColourExpression(config, 'fill');
      assert.deepStrictEqual(expr, ['interpolate', ['linear'], ['get', 'val'], 0, '#ff0000', 100, '#0000ff']);
    });

    it('should handle multiple styles with filters', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'points',
        styles: [
          {
            colourMode: 'override',
            colourConfig: { override: '#ff0000' },
            filter: { prop: 'type', values: ['A'] }
          },
          {
            colourMode: 'override',
            colourConfig: { override: '#00ff00' }
          }
        ]
      };
      const expr = getColourExpression(config, 'marker');
      assert.deepStrictEqual(expr, [
        'case',
        ['==', ['to-string', ['coalesce', ['get', 'type'], '']], 'A'],
        '#ff0000',
        '#00ff00'
      ]);
    });
    it('should validate multi-style colour expression with MapLibre', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'points',
        styles: [
          {
            colourMode: 'override',
            colourConfig: { override: '#ff0000' },
            filter: { prop: 'type', values: ['A'] }
          },
          {
            colourMode: 'override',
            colourConfig: { override: '#00ff00' }
          }
        ]
      };
      const expr = getColourExpression(config, 'marker');

      const colorSpec = { type: 'color' } as any;

      // Verification using MapLibre style-spec validator
      const result = createExpression(expr, colorSpec);
      if (result.result === 'error') {
        console.error('Expression failed validation:', JSON.stringify(expr, null, 2));
        console.error('Errors:', result.value);
        assert.fail('Expression should be valid');
      }

      const expression = (result as any).value;
      const globals = { zoom: 10 } as any;

      // Test Feature A
      const featureA = {
        type: 'Point',
        properties: { type: 'A' }
      } as any;
      const resA = expression.evaluate(globals, featureA);
      assert.strictEqual(resA.r, 1);
      assert.strictEqual(resA.g, 0);
      assert.strictEqual(resA.b, 0);

      // Test Feature B (Fallback)
      const featureB = {
        type: 'Point',
        properties: { type: 'B' }
      } as any;
      const resB = expression.evaluate(globals, featureB);
      assert.strictEqual(resB.r, 0);
      assert.strictEqual(resB.g, 1);
      assert.strictEqual(resB.b, 0);

      // Test Feature with missing property (Fallback)
      const featureC = {
        type: 'Point',
        properties: {}
      } as any;
      const resC = expression.evaluate(globals, featureC);
      assert.strictEqual(resC.r, 0);
      assert.strictEqual(resC.g, 1);
      assert.strictEqual(resC.b, 0);
    });

    it('should correctly handle the user reported case (status filter)', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'points',
        styles: [
          {
            colourMode: 'override',
            colourConfig: { override: '#004cff' }, // Blue
            filter: { prop: 'status', values: ['hit'] }
          },
          {
            colourMode: 'override',
            colourConfig: { override: '#ff0000' } // Red
          }
        ]
      };

      const expr = getColourExpression(config, 'marker');
      assert.deepStrictEqual(expr, [
        'case',
        ['==', ['to-string', ['coalesce', ['get', 'status'], '']], 'hit'],
        '#004cff',
        '#ff0000'
      ]);

      const result = createExpression(expr, { type: 'color' } as any);
      assert.strictEqual(result.result, 'success');

      const expression = (result as any).value;
      const globals = { zoom: 10 } as any;

      // Feature with status: "hit" -> should be Blue
      const resBlue = expression.evaluate(globals, { properties: { status: 'hit' } } as any);
      assert.strictEqual(resBlue.r, 0);
      assert.strictEqual(resBlue.b, 1);

      // Feature with status: "miss" -> should be Red
      const resRed = expression.evaluate(globals, { properties: { status: 'miss' } } as any);
      assert.strictEqual(resRed.r, 1);
      assert.strictEqual(resRed.b, 0);

      // Feature without status -> should be Red
      const resNoStatus = expression.evaluate(globals, { properties: {} } as any);
      assert.strictEqual(resNoStatus.r, 1);
      assert.strictEqual(resNoStatus.b, 0);
    });

    it('should evaluate scale-based colours correctly', () => {
      const config: GeoJsonConfig = {
        url: 'test',
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
      const expr = getColourExpression(config, 'marker');
      const colorSpec = { type: 'color' } as any;
      const result = createExpression(expr, colorSpec);
      if (result.result === 'error') {
        console.error('Expression failed validation:', JSON.stringify(expr, null, 2));
        console.error('Errors:', result.value);
        assert.fail('Invalid expression');
      }

      const expression = (result as any).value;
      const globals = { zoom: 10 } as any;

      const resMin = expression.evaluate(globals, { type: 'Point', properties: { val: 0 } } as any);
      assert.strictEqual(resMin.r, 0);
      assert.strictEqual(resMin.g, 0);
      assert.strictEqual(resMin.b, 0);

      const resMax = expression.evaluate(globals, { type: 'Point', properties: { val: 100 } } as any);
      assert.strictEqual(resMax.r, 1);
      assert.strictEqual(resMax.g, 1);
      assert.strictEqual(resMax.b, 1);

      const resMid = expression.evaluate(globals, { type: 'Point', properties: { val: 50 } } as any);
      // Linear interpolation should be roughly 0.5
      assert.ok(Math.abs(resMid.r - 0.5) < 0.01);
      assert.ok(Math.abs(resMid.g - 0.5) < 0.01);
      assert.ok(Math.abs(resMid.b - 0.5) < 0.01);
    });

    it('should evaluate custom palettes correctly', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'points',
        styles: [
          {
            colourMode: 'scale',
            colourProp: 'val',
            colourConfig: {
              min: 0,
              max: 2,
              paletteType: 'custom',
              customPalette: ['#ff0000', '#00ff00', '#0000ff']
            }
          }
        ]
      };
      const expr = getColourExpression(config, 'marker');
      const colorSpec = { type: 'color' } as any;
      const result = createExpression(expr, colorSpec);
      if (result.result === 'error') {
        console.error('Expression failed validation:', JSON.stringify(expr, null, 2));
        console.error('Errors:', result.value);
        assert.fail('Invalid expression');
      }

      const expression = (result as any).value;
      const globals = { zoom: 10 } as any;

      const res0 = expression.evaluate(globals, { type: 'Point', properties: { val: 0 } } as any);
      assert.strictEqual(res0.r, 1);
      assert.strictEqual(res0.g, 0);
      assert.strictEqual(res0.b, 0);

      const res1 = expression.evaluate(globals, { type: 'Point', properties: { val: 1 } } as any);
      assert.strictEqual(res1.r, 0);
      assert.strictEqual(res1.g, 1);
      assert.strictEqual(res1.b, 0);

      const res2 = expression.evaluate(globals, { type: 'Point', properties: { val: 2 } } as any);
      assert.strictEqual(res2.r, 0);
      assert.strictEqual(res2.g, 0);
      assert.strictEqual(res2.b, 1);
    });
  });
});
