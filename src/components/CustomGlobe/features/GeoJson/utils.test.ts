import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getOpacityExpression, getColourExpression, generateId } from './utils.ts';
import type { GeoJsonConfig } from '../../../../lib/marker';

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
      const config: GeoJsonConfig = { url: 'test', type: 'areas', colourMode: 'simple' };
      assert.strictEqual(getOpacityExpression(config), 1);
    });

    it('should return 1 case expression if filter is set', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        colourMode: 'simple',
        filter: { prop: 'id', values: ['1', '2'] }
      };
      const expected = ['case', ['in', ['to-string', ['get', 'id']], ['literal', ['1', '2']]], 1, 0];
      assert.deepStrictEqual(getOpacityExpression(config), expected);
    });
  });

  describe('getColourExpression (MapLibre Expressions)', () => {
    it('should return override colour', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        colourMode: 'override',
        colourConfig: { override: '#00ff00' }
      };
      assert.strictEqual(getColourExpression(config, 'fill'), '#00ff00');
    });

    it('should return stroke colour from property (simple mode)', () => {
      const config: GeoJsonConfig = { url: 'test', type: 'lines', colourMode: 'simple' };
      const expr = getColourExpression(config, 'stroke');
      assert.deepStrictEqual(expr, ['coalesce', ['get', 'stroke'], '#00297E']);
    });

    it('should return marker colour (simple mode)', () => {
      const config: GeoJsonConfig = { url: 'test', type: 'points', colourMode: 'simple' };
      const expr = getColourExpression(config, 'marker');
      assert.deepStrictEqual(expr, [
        'coalesce',
        ['get', 'marker-color'],
        ['get', 'stroke'],
        ['get', 'fill'],
        '#7e7e7e'
      ]);
    });

    it('should generate interpolate expression for sequential palette', () => {
      const config: GeoJsonConfig = {
        url: 'test',
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
        colourMode: 'scale',
        colourProp: 'val',
        colourConfig: {
          min: -100,
          max: 100,
          paletteType: 'divergent',
          paletteVariant: 'RedBlue'
        }
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
      };
      const expr = getColourExpression(config, 'fill');
      assert.deepStrictEqual(expr, ['interpolate', ['linear'], ['get', 'val'], 0, '#ff0000', 100, '#0000ff']);
    });

    it('should return match expression for class mode', () => {
      const config: GeoJsonConfig = {
        url: 'test',
        type: 'areas',
        colourMode: 'class',
        colourProp: 'category'
      };
      const expr = getColourExpression(config, 'fill');
      assert.strictEqual(expr[0], 'match');
      assert.deepStrictEqual(expr[1], ['get', 'category']);
    });
  });
});
