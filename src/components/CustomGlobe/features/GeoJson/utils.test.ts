import assert from 'node:assert';
import { 
    getOpacityExpression, 
    evaluateOpacity, 
    getColorExpression, 
    evaluateColor,
    evaluateHeight,
    generateId
} from './utils.ts';
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
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colorMode: 'simple' };
            assert.strictEqual(getOpacityExpression(config), 1);
        });

        it('should return 1 case expression if filter is set', () => {
            const config: GeoJsonConfig = { 
                url: 'test', 
                type: 'areas', 
                colorMode: 'simple',
                filter: { prop: 'id', values: ['1', '2'] }
            };
            const expected = [
                'case',
                ['in', ['to-string', ['get', 'id']], ['literal', ['1', '2']]],
                1,
                0
            ];
            assert.deepStrictEqual(getOpacityExpression(config), expected); 
        });
    });

    describe('evaluateOpacity (JS Evaluation)', () => {
        it('should handle string property matching string filter', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'simple',
                filter: { prop: 'type', values: ['A', 'B'] }
            };
            const feature = { properties: { type: 'A' } };
            assert.strictEqual(evaluateOpacity(config, feature), 1);
        });

        it('should return 0 if filter does not match', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'simple',
                filter: { prop: 'type', values: ['A', 'B'] }
            };
            const feature = { properties: { type: 'C' } };
            assert.strictEqual(evaluateOpacity(config, feature), 0);
        });

        it('should multiply by simple style opacities', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colorMode: 'simple' };
            const feature = { properties: { 'fill-opacity': 0.5 } };
            assert.strictEqual(evaluateOpacity(config, feature), 0.5);
        });
    });

    describe('getColorExpression (MapLibre Expressions)', () => {
        it('should return override color', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'override', 
                colorConfig: { override: '#00ff00' } 
            };
            assert.strictEqual(getColorExpression(config, 'fill'), '#00ff00');
        });

        it('should return stroke color from property (simple mode)', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'lines', colorMode: 'simple' };
            const expr = getColorExpression(config, 'stroke');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'stroke'], '#555555']);
        });

        it('should return marker color (simple mode)', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'points', colorMode: 'simple' };
            const expr = getColorExpression(config, 'marker');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'marker-color'], ['get', 'stroke'], ['get', 'fill'], ['get', 'fill-color'], '#7e7e7e']);
        });

        it('should generate interpolate expression for sequential palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'blue'
                }
            };
            const expr = getColorExpression(config, 'marker');
            assert.strictEqual(expr[0], 'interpolate');
            assert.strictEqual(expr[1][0], 'linear');
            assert.strictEqual(expr[2][1], 'val');
            // Stops: [val, color, val, color, ...]
            assert.strictEqual(expr[3], 0);
            assert.strictEqual(expr[5], 25);
            assert.strictEqual(expr[11], 100);
        });

        it('should generate interpolate expression for divergent palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: -100,
                    max: 100,
                    paletteType: 'divergent',
                    paletteVariant: 'RedBlue'
                }
            };
            const expr = getColorExpression(config, 'fill');
            assert.strictEqual(expr[0], 'interpolate');
            assert.strictEqual(expr[3], -100);
            assert.strictEqual(expr[7], 0); // Middle stop
            assert.strictEqual(expr[11], 100);
        });

        it('should fallback to manual colors if palette variant is invalid', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'invalid-variant',
                    minColor: '#ff0000',
                    maxColor: '#0000ff'
                }
            };
            const expr = getColorExpression(config, 'fill');
            assert.deepStrictEqual(expr, [
                'interpolate',
                ['linear'],
                ['get', 'val'],
                0, '#ff0000',
                100, '#0000ff'
            ]);
        });

        it('should return match expression for class mode', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'class', 
                colorProp: 'category' 
            };
            const expr = getColorExpression(config, 'fill');
            assert.strictEqual(expr[0], 'match');
            assert.deepStrictEqual(expr[1], ['get', 'category']);
        });
    });

    describe('evaluateColor (JS Evaluation)', () => {
        it('should return override color', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'override', 
                colorConfig: { override: '#ff00ff' } 
            };
            assert.strictEqual(evaluateColor(config, {}), '#ff00ff');
        });

        it('should return simple style color', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'points', colorMode: 'simple' };
            const feature = { properties: { 'marker-color': '#ff0000' } };
            assert.strictEqual(evaluateColor(config, feature), '#ff0000');
        });

        it('should evaluate color for sequential palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'blue'
                }
            };
            const colorMin = evaluateColor(config, { properties: { val: 0 } });
            const colorMax = evaluateColor(config, { properties: { val: 100 } });
            assert.ok(colorMin.startsWith('rgb'));
            assert.notStrictEqual(colorMin, colorMax);
        });

        it('should evaluate color for divergent palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: -100,
                    max: 100,
                    paletteType: 'divergent',
                    paletteVariant: 'RedBlue'
                }
            };
            const colorMin = evaluateColor(config, { properties: { val: -100 } });
            const colorMid = evaluateColor(config, { properties: { val: 0 } });
            const colorMax = evaluateColor(config, { properties: { val: 100 } });
            assert.notStrictEqual(colorMin, colorMid);
            assert.notStrictEqual(colorMid, colorMax);
        });

        it('should fallback to manual interpolation if palette is invalid', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colorMode: 'scale',
                colorProp: 'val',
                colorConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'invalid-variant',
                    minColor: '#000000',
                    maxColor: '#ffffff'
                }
            };
            const colorMid = evaluateColor(config, { properties: { val: 50 } });
            assert.strictEqual(colorMid, 'rgb(128,128,128)');
        });

        it('should return palette colors for class mode', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colorMode: 'class' };
            assert.strictEqual(evaluateColor(config, { properties: { class: 'primary' } }), '#1f77b4');
        });

        it('should return default color for unknown class', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colorMode: 'class' };
            assert.strictEqual(evaluateColor(config, { properties: { class: 'unknown' } }), '#888888');
        });
    });

    describe('evaluateHeight', () => {
        it('should return 0 if no heightProp is set', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'spikes', colorMode: 'simple' };
            assert.strictEqual(evaluateHeight(config, { properties: { val: 10 } }), 0);
        });

        it('should return property value multiplied by scalar', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'spikes', colorMode: 'simple',
                spike: { heightProp: 'val', scalar: 2 }
            };
            assert.strictEqual(evaluateHeight(config, { properties: { val: 10 } }), 20);
        });
    });
});
