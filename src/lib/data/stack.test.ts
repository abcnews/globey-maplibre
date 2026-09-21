import { describe, it, expect } from 'vitest';
import { stackLayers, layersOfKind, singletonOfKind, moveLayer, STACK_SPACING } from './stack.ts';
import { parseGlobeJsonBlob, type GlobeLayer } from './jsonBlob.ts';

const layer = (id: string, type: GlobeLayer['type'], extra: Record<string, unknown> = {}) =>
  ({ id, type, ...extra }) as GlobeLayer;

const blobWith = (layers: GlobeLayer[]) => parseGlobeJsonBlob({ layers });

describe('stackLayers', () => {
  it('derives z-indices that increase with array order', () => {
    const stacked = stackLayers(blobWith([layer('a', 'streetMap'), layer('b', 'geojson'), layer('c', 'customLabels')]));

    expect(stacked.map(l => l.id)).toEqual(['a', 'b', 'c']);
    expect(stacked[1].zIndex - stacked[0].zIndex).toBe(STACK_SPACING);
    expect(stacked[2].zIndex).toBeGreaterThan(stacked[1].zIndex);
  });

  it('handles a blob with no layers', () => {
    expect(stackLayers(blobWith([]))).toEqual([]);
  });
});

describe('layersOfKind / singletonOfKind', () => {
  const stacked = stackLayers(
    blobWith([
      layer('r1', 'raster', { url: 'https://example.com/{z}/{x}/{y}.png' }),
      layer('g1', 'geojson'),
      layer('r2', 'raster', { url: 'https://example.com/b/{z}/{x}/{y}.png' })
    ])
  );

  it('returns matching layers in stack order with their z-indices intact', () => {
    const rasters = layersOfKind(stacked, 'raster');
    expect(rasters.map(l => l.id)).toEqual(['r1', 'r2']);
    expect(rasters[1].zIndex).toBeGreaterThan(rasters[0].zIndex);
  });

  it('returns undefined for an absent singleton kind', () => {
    expect(singletonOfKind(stacked, 'mapLabels')).toBeUndefined();
  });

  it('returns the lowest layer when a kind is unexpectedly duplicated', () => {
    expect(singletonOfKind(stacked, 'raster')?.id).toBe('r1');
  });
});

describe('moveLayer', () => {
  const layers = [layer('a', 'geojson'), layer('b', 'geojson'), layer('c', 'geojson')];
  const ids = (result: GlobeLayer[]) => result.map(l => l.id);

  it('moves a layer up and down', () => {
    expect(ids(moveLayer(layers, 0, 1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveLayer(layers, 2, 0))).toEqual(['c', 'a', 'b']);
  });

  it('clamps past either end instead of dropping the layer', () => {
    expect(ids(moveLayer(layers, 0, -5))).toEqual(['a', 'b', 'c']);
    expect(ids(moveLayer(layers, 0, 99))).toEqual(['b', 'c', 'a']);
  });

  it('returns the original array for a no-op or an out-of-range source', () => {
    expect(moveLayer(layers, 1, 1)).toBe(layers);
    expect(moveLayer(layers, 7, 0)).toBe(layers);
  });

  it('does not mutate the input', () => {
    moveLayer(layers, 0, 2);
    expect(ids(layers)).toEqual(['a', 'b', 'c']);
  });
});
