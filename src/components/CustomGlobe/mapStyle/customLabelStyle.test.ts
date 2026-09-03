import { describe, it, expect } from 'vitest';
import { getCustomLabelLayers, STYLE_LAYER_MAP } from './customLabelStyle.ts';

describe('customLabelStyle', () => {
  it('should generate layers for all configured style mappings', () => {
    const layers = getCustomLabelLayers(false, 'test-source');
    const expectedKeys = Object.keys(STYLE_LAYER_MAP);

    expect(layers.length).toBe(expectedKeys.length);

    layers.forEach(layer => {
      expect(layer.source).toBe('test-source');
      expect(layer.type).toBe('symbol');
      expect(layer.layout?.['text-field']).toEqual(['get', 'name']);
      expect(layer.layout?.['text-allow-overlap']).toBe(true);
      expect(layer.layout?.['text-ignore-placement']).toBe(true);
      expect(layer.filter).toBeDefined();
    });
  });

  it('drives text-opacity from a per-feature opacity property (default opaque)', () => {
    const layers = getCustomLabelLayers(false, 'test-source');

    layers.forEach(layer => {
      expect(layer.paint?.['text-opacity']).toEqual(['number', ['get', 'opacity'], 1]);
    });
  });

  it('should apply dark/satellite colours when isDark is true', () => {
    const darkLayers = getCustomLabelLayers(true);

    darkLayers.forEach(layer => {
      expect(layer.paint?.['text-color']).toBe('#FFF');
      expect(layer.paint?.['text-halo-color']).toBe('rgba(0,0,0,0.8)');
    });
  });
});
