import { describe, it, expect } from 'vitest';
import { getColourEvaluator, getHeightEvaluator } from './utils.ts';

describe('GeoJsonSpikes utils', () => {
  describe('getHeightEvaluator', () => {
    it('returns zero for every value when heightProp is unset', () => {
      const evaluator = getHeightEvaluator({ data: { type: 'FeatureCollection', features: [] } });
      expect(evaluator(50)).toBe(0);
    });

    it('scales value within min/max to scalar, clamped to the jank floor', () => {
      const evaluator = getHeightEvaluator({
        data: { type: 'FeatureCollection', features: [] },
        heightProp: 'pop',
        min: 0,
        max: 100,
        scalar: 1000000
      });
      expect(evaluator(0)).toBe(3000); // clamped to MIN_HEIGHT_JANK_FACTOR
      expect(evaluator(100)).toBe(1000000);
      expect(evaluator(50)).toBe(500000);
    });

    it('clamps values outside the min/max range', () => {
      const evaluator = getHeightEvaluator({
        data: { type: 'FeatureCollection', features: [] },
        heightProp: 'pop',
        min: 0,
        max: 100,
        scalar: 1000000
      });
      expect(evaluator(150)).toBe(1000000);
      expect(evaluator(-50)).toBe(3000);
    });
  });

  describe('getColourEvaluator', () => {
    it('falls back to the feature fill property when colourProp is unset', () => {
      const evaluator = getColourEvaluator({ data: { type: 'FeatureCollection', features: [] } });
      const feature = { type: 'Feature', properties: { fill: '#ff0000' }, geometry: null } as any;
      expect(evaluator(feature)).toBe('#ff0000');
    });

    it('falls back to the default grey when there is no fill property', () => {
      const evaluator = getColourEvaluator({ data: { type: 'FeatureCollection', features: [] } });
      const feature = { type: 'Feature', properties: {}, geometry: null } as any;
      expect(evaluator(feature)).toBe('#888888');
    });

    it('interpolates between the colour ramp using colourProp', () => {
      const evaluator = getColourEvaluator({
        data: { type: 'FeatureCollection', features: [] },
        colourProp: 'value',
        colours: ['#000000', '#ffffff'],
        min: 0,
        max: 100
      });
      const feature = { type: 'Feature', properties: { value: 50 }, geometry: null } as any;
      expect(evaluator(feature)).toBe('rgb(128,128,128)');
    });
  });
});
