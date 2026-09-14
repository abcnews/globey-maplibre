import { describe, it, expect } from 'vitest';
import { expression } from '@maplibre/maplibre-gl-style-spec';
import {
  buildOpacityExpression,
  buildStrokeWidthExpression,
  buildRadiusExpression,
  buildColourExpression
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
  });
});
