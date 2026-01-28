import assert from 'node:assert';
import { getOpacityExpression, evaluateOpacity } from './utils.ts';
import type { GeoJsonConfig } from '../../../../lib/marker';

describe('GeoJson Utils', () => {
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
        // This simulates the issue the user likely faces:
        // Property is a Number (e.g. index: 0), but Filter Values are Strings (e.g. "0")
        
        it('should handle string property matching string filter', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'simple',
                filter: { prop: 'type', values: ['A', 'B'] }
            };
            const feature = { properties: { type: 'A' } };
            assert.strictEqual(evaluateOpacity(config, feature), 1);
        });

    describe('SimpleStyle (MapLibre Expressions)', () => {
        it('should return stroke color from property', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'lines', colorMode: 'simple' };
            const expr = getColorExpression(config, 'stroke');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'stroke'], '#555555']);
        });

        it('should return fill color from property', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'areas', colorMode: 'simple' };
            const expr = getColorExpression(config, 'fill');
            assert.deepStrictEqual(expr, ['coalesce', ['get', 'fill'], ['get', 'fill-color'], '#555555']);
        });
    });

    describe('evaluateColor (SimpleStyle JS)', () => {
        it('should handle stroke property', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'lines', colorMode: 'simple' };
            const feature = { properties: { stroke: '#ff0000' } };
            assert.strictEqual(evaluateColor(config, feature), '#ff0000');
        });

        it('should handle marker-color property', () => {
             const config: GeoJsonConfig = { url: 'test', type: 'points', colorMode: 'simple' };
             const feature = { properties: { 'marker-color': '#00ff00' } };
             assert.strictEqual(evaluateColor(config, feature), '#00ff00');
        });
    });

    describe('evaluateOpacity (SimpleStyle JS)', () => {
        it('should respect stroke-opacity', () => {
            const config: GeoJsonConfig = { url: 'test', type: 'lines', colorMode: 'simple' };
            const feature = { properties: { 'stroke-opacity': 0.5 } };
            assert.strictEqual(evaluateOpacity(config, feature), 0.5);
        });

        it('should combine filter and simple opacity', () => {
            const config: GeoJsonConfig = { 
                url: 'test', type: 'areas', colorMode: 'simple',
                filter: { prop: 'id', values: ['yes'] }
            };
            assert.strictEqual(evaluateOpacity(config, { properties: { id: 'yes', 'fill-opacity': 0.5 } }), 0.5);
            assert.strictEqual(evaluateOpacity(config, { properties: { id: 'no', 'fill-opacity': 0.5 } }), 0);
        });
    });
});
