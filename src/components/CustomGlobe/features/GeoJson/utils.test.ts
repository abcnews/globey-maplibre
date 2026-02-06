import assert from 'node:assert';
import { 
    getOpacityExpression, 
    evaluateOpacity, 
    getColourExpression, 
    evaluateColour,
    evaluateHeight,
    generateId
} from './utils';
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
                url: 'test', type: 'areas', colourMode: 'simple',
                filter: { prop: 'type', values: ['A', 'B'] }
            };
            const feature = { properties: { type: 'A' } };
            assert.strictEqual(evaluateOpacity(config, feature), 1);
        });

        it('should return 0 if filter does not match', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colourMode: 'simple',
                filter: { prop: 'type', values: ['A', 'B'] }
            };
            const feature = { properties: { type: 'C' } };
            assert.strictEqual(evaluateOpacity(config, feature), 0);
        });

        it('should multiply by simple style opacities', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colourMode: 'simple' };
            const feature = { properties: { 'fill-opacity': 0.5 } };
            assert.strictEqual(evaluateOpacity(config, feature), 0.5);
        });
    });

    describe('getColourExpression (MapLibre Expressions)', () => {
        it('should return override colour', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colourMode: 'override', 
                colourConfig: { override: '#00ff00' } 
            };
            assert.strictEqual(getColourExpression(config, 'fill'), '#00ff00');
        });

        it('should return stroke colour from property (simple mode)', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'lines', colourMode: 'simple' };
            const expr = getColourExpression(config, 'stroke');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'stroke'], '#555555']);
        });

        it('should return marker colour (simple mode)', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'points', colourMode: 'simple' };
            const expr = getColourExpression(config, 'marker');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'marker-color'], ['get', 'stroke'], ['get', 'fill'], ['get', 'fill-color'], '#7e7e7e']);
        });

        it('should generate interpolate expression for sequential palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colourMode: 'scale',
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
                url: 'test', type: 'areas', colourMode: 'scale',
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
                url: 'test', type: 'areas', colourMode: 'scale',
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
                url: 'test', type: 'areas', colourMode: 'class', 
                colourProp: 'category' 
            };
            const expr = getColourExpression(config, 'fill');
            assert.strictEqual(expr[0], 'match');
            assert.deepStrictEqual(expr[1], ['get', 'category']);
        });
    });

    describe('evaluateColour (JS Evaluation)', () => {
        it('should return override colour', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colourMode: 'override', 
                colourConfig: { override: '#ff0ff' } 
            };
            assert.strictEqual(evaluateColour(config, {}), '#ff0ff');
        });

        it('should return simple style colour', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'points', colourMode: 'simple' };
            const feature = { properties: { 'marker-color': '#ff0000' } };
            assert.strictEqual(evaluateColour(config, feature), '#ff0000');
        });

        it('should evaluate colour for sequential palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colourMode: 'scale',
                colourProp: 'val',
                colourConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'blue'
                }
            };
            const colourMin = evaluateColour(config, { properties: { val: 0 } });
            const colourMax = evaluateColour(config, { properties: { val: 100 } });
            assert.ok(colourMin.startsWith('rgb'));
            assert.notStrictEqual(colourMin, colourMax);
        });

        it('should evaluate colour for divergent palette', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colourMode: 'scale',
                colourProp: 'val',
                colourConfig: {
                    min: -100,
                    max: 100,
                    paletteType: 'divergent',
                    paletteVariant: 'RedBlue'
                }
            };
            const colourMin = evaluateColour(config, { properties: { val: -100 } });
            const colourMid = evaluateColour(config, { properties: { val: 0 } });
            const colourMax = evaluateColour(config, { properties: { val: 100 } });
            assert.notStrictEqual(colourMin, colourMid);
            assert.notStrictEqual(colourMid, colourMax);
        });

        it('should fallback to manual interpolation if palette is invalid', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'points', colourMode: 'scale',
                colourProp: 'val',
                colourConfig: {
                    min: 0,
                    max: 100,
                    paletteType: 'sequential',
                    paletteVariant: 'invalid-variant',
                    minColour: '#000000',
                    maxColour: '#ffffff'
                }
            };
            const colourMid = evaluateColour(config, { properties: { val: 50 } });
            assert.strictEqual(colourMid, 'rgb(128,128,128)');
        });

        it('should return palette colours for class mode', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colourMode: 'class' };
            assert.strictEqual(evaluateColour(config, { properties: { class: 'primary' } }), '#1f77b4');
        });

        it('should return default colour for unknown class', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colourMode: 'class' };
            assert.strictEqual(evaluateColour(config, { properties: { class: 'unknown' } }), '#888888');
        });
    });

    describe('evaluateHeight', () => {
        it('should return 0 if no heightProp is set', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'spikes', colourMode: 'simple' };
            assert.strictEqual(evaluateHeight(config, { properties: { val: 10 } }), 0);
        });
        
        it('should return normalized height based on min, max and scalar', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'spikes', colourMode: 'simple',
                spike: { heightProp: 'val', min: 0, max: 100, scalar: 1000 }
            };
            assert.strictEqual(evaluateHeight(config, { properties: { val: 50 } }), 500);
            assert.strictEqual(evaluateHeight(config, { properties: { val: 0 } }), 0);
            assert.strictEqual(evaluateHeight(config, { properties: { val: 100 } }), 1000);
            assert.strictEqual(evaluateHeight(config, { properties: { val: 150 } }), 1000); // Clamped
            assert.strictEqual(evaluateHeight(config, { properties: { val: -50 } }), 0);    // Clamped
        });

        it('should use default values for min, max and scalar if not provided', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'spikes', colourMode: 'simple',
                spike: { heightProp: 'val', scalar: 2000000 } // min 0, max 100 by default (per code)
            };
            assert.strictEqual(evaluateHeight(config, { properties: { val: 50 } }), 1000000);
        });
    });
});
