import { describe, it, expect } from 'vitest';
import { expression } from '@maplibre/maplibre-gl-style-spec';
import {
  buildOpacityExpression,
  buildStrokeWidthExpression,
  buildRadiusExpression,
  buildColourExpression,
  buildTweenedColourExpression
} from './utils.ts';

/**
 * Evaluates a MapLibre paint expression against a test feature.
 * Throws if the expression fails to parse.
 */
function evaluateExpression(expr: any, spec: any, properties: Record<string, any> = {}): any {
  const parsed = expression.createExpression(expr, spec);
  if (parsed.result !== 'success') {
    throw new Error(`Expression parse failed: ${JSON.stringify(parsed.value)}`);
  }
  return parsed.value.evaluate({ zoom: 3 }, { type: 'Polygon', properties });
}

const numberSpec = {
  type: 'number',
  'property-type': 'data-driven',
  expression: { interpolated: true, parameters: ['zoom', 'feature'] }
};

const colorSpec = {
  type: 'color',
  'property-type': 'data-driven',
  expression: { interpolated: true, parameters: ['zoom', 'feature'] }
};

describe('GeoJSON paint expressions – numeric fallback bug regression', () => {
  describe('buildOpacityExpression', () => {
    it('fill opacity is not zero for features without fill-opacity property', () => {
      const expr = buildOpacityExpression({ colourMode: 'simple' }, 'fill');
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });

    it('fill opacity respects fill-opacity property when present', () => {
      const expr = buildOpacityExpression({ colourMode: 'simple' }, 'fill');
      const result = evaluateExpression(expr, numberSpec, { 'fill-opacity': '0.9' });
      expect(result).toBe(0.9);
    });

    it('stroke opacity is not zero for features without stroke-opacity property', () => {
      const expr = buildOpacityExpression({ colourMode: 'simple' }, 'stroke');
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });

    it('stroke opacity respects stroke-opacity property when present', () => {
      const expr = buildOpacityExpression({ colourMode: 'simple' }, 'stroke');
      const result = evaluateExpression(expr, numberSpec, { 'stroke-opacity': '0.7' });
      expect(result).toBe(0.7);
    });
  });

  describe('buildStrokeWidthExpression', () => {
    it('stroke width is not zero for features without stroke-width property', () => {
      const expr = buildStrokeWidthExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });

    it('stroke width respects stroke-width property when present', () => {
      const expr = buildStrokeWidthExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, { 'stroke-width': '3' });
      expect(result).toBe(3);
    });

    it('stroke width uses basic preset for non-simple mode', () => {
      const expr = buildStrokeWidthExpression({ colourMode: 'basic' });
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('buildRadiusExpression', () => {
    it('radius is not zero for features without marker-size property', () => {
      const expr = buildRadiusExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });

    it('radius respects marker-size small', () => {
      const expr = buildRadiusExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, { 'marker-size': 'small' });
      expect(result).toBe(4);
    });

    it('radius respects marker-size large', () => {
      const expr = buildRadiusExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, { 'marker-size': 'large' });
      expect(result).toBe(9);
    });

    it('radius respects numeric marker-size', () => {
      const expr = buildRadiusExpression({ colourMode: 'simple' });
      const result = evaluateExpression(expr, numberSpec, { 'marker-size': '7' });
      expect(result).toBe(7);
    });

    it('radius uses basic preset for non-simple mode', () => {
      const expr = buildRadiusExpression({ colourMode: 'basic' });
      const result = evaluateExpression(expr, numberSpec, {});
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('buildColourExpression', () => {
    it('fill colour is not empty for simple mode', () => {
      const expr = buildColourExpression({ colourMode: 'simple' }, 'fill');
      const result = evaluateExpression(expr, colorSpec, {});
      expect(result).toBeTruthy();
    });

    it('fill colour respects fill property', () => {
      const expr = buildColourExpression({ colourMode: 'simple' }, 'fill');
      const result = evaluateExpression(expr, colorSpec, { fill: '#ff0000' });
      expect(String(result).toLowerCase()).toContain('ff0000');
    });

    it('stroke colour respects stroke property', () => {
      const expr = buildColourExpression({ colourMode: 'simple' }, 'stroke');
      const result = evaluateExpression(expr, colorSpec, { stroke: '#00ff00' });
      expect(String(result).toLowerCase()).toContain('00ff00');
    });

    it('basic mode with no basicType uses the normal preset', () => {
      const expr = buildColourExpression({ colourMode: 'basic' }, 'fill');
      const result = evaluateExpression(expr, colorSpec, {});
      expect(String(result).toLowerCase()).toContain('267e');
    });

    it('basic mode with basicType "highlighted" uses the highlighted preset', () => {
      const expr = buildColourExpression({ colourMode: 'basic', colourConfig: { basicType: 'highlighted' } }, 'fill');
      const result = evaluateExpression(expr, colorSpec, {});
      expect(String(result).toLowerCase()).toContain('3c27');
    });

    it('basic mode with basicType "custom" uses colourConfig.basic, not the normal preset', () => {
      const expr = buildColourExpression(
        { colourMode: 'basic', colourConfig: { basicType: 'custom', basic: '#123456' } },
        'fill'
      );
      const result = evaluateExpression(expr, colorSpec, {});
      expect(String(result).toLowerCase()).toContain('123456');
    });
  });

  describe('buildTweenedColourExpression', () => {
    const normal = { colourMode: 'basic' as const, colourConfig: { basicType: 'normal' as const } };
    const highlighted = { colourMode: 'basic' as const, colourConfig: { basicType: 'highlighted' as const } };

    it('with 0 or 1 config stops, returns the representative colour unchanged', () => {
      expect(buildTweenedColourExpression(undefined, normal, 'fill', 'tweenPosScroll')).toBe(
        buildColourExpression(normal, 'fill')
      );
      expect(buildTweenedColourExpression([normal], normal, 'fill', 'tweenPosScroll')).toBe(
        buildColourExpression(normal, 'fill')
      );
    });

    it('interpolates across each panel colour, following the given global-state key', () => {
      const expr = buildTweenedColourExpression([normal, highlighted], normal, 'fill', 'tweenPosScroll');
      expect(Array.isArray(expr)).toBe(true);
      expect(expr[0]).toBe('interpolate');
      expect(expr[2]).toEqual(['number', ['global-state', 'tweenPosScroll'], 0]);
      // stops: [panel0, colour0, panel1, colour1]
      expect(expr[4]).toBe(buildColourExpression(normal, 'fill'));
      expect(expr[6]).toBe(buildColourExpression(highlighted, 'fill'));
    });

    it('fills a gap (item absent from a panel) with the representative colour', () => {
      const expr = buildTweenedColourExpression([normal, undefined, highlighted], normal, 'fill', 'tweenPosScroll');
      expect(expr[4]).toBe(buildColourExpression(normal, 'fill'));
      expect(expr[6]).toBe(buildColourExpression(normal, 'fill'));
      expect(expr[8]).toBe(buildColourExpression(highlighted, 'fill'));
    });

    it('does not tween scale/simple mode — falls back to the representative expression', () => {
      const scale = { colourMode: 'scale' as const, colourProp: 'x' };
      const expr = buildTweenedColourExpression([scale, highlighted], scale, 'fill', 'tweenPosScroll');
      expect(expr).toBe(buildColourExpression(scale, 'fill'));
    });
  });
});
