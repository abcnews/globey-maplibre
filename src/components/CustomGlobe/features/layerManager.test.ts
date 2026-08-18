import { describe, it, expect, vi } from 'vitest';
import type { Map } from 'maplibre-gl';
import {
  findBeforeIdForZIndex,
  addLayerWithZIndex,
  setLayerZIndex,
  removeLayerWithZIndex,
  getLayerZIndex,
  clearMapLayerRegistry,
  Z_INDEX_BASE_RASTER,
  Z_INDEX_BASE_VECTOR,
  Z_INDEX_IMAGE_LAYERS,
  Z_INDEX_GEOJSON,
  Z_INDEX_BASE_LABELS
} from './layerManager';

/**
 * Creates a mock MapLibre Map instance for testing layer ordering.
 */
function createMockMap(initialLayers: Array<{ id: string }> = []) {
  const layers = [...initialLayers];

  const map = {
    getStyle: vi.fn(() => ({
      version: 8,
      layers: [...layers]
    })),
    getLayer: vi.fn((id: string) => layers.find(l => l.id === id)),
    addLayer: vi.fn((layer: { id: string }, beforeId?: string) => {
      if (beforeId) {
        const index = layers.findIndex(l => l.id === beforeId);
        if (index !== -1) {
          layers.splice(index, 0, layer);
          return;
        }
      }
      layers.push(layer);
    }),
    moveLayer: vi.fn((id: string, beforeId?: string) => {
      const currentIndex = layers.findIndex(l => l.id === id);
      if (currentIndex === -1) return;
      const [layer] = layers.splice(currentIndex, 1);
      if (beforeId) {
        const targetIndex = layers.findIndex(l => l.id === beforeId);
        if (targetIndex !== -1) {
          layers.splice(targetIndex, 0, layer);
          return;
        }
      }
      layers.push(layer);
    }),
    removeLayer: vi.fn((id: string) => {
      const index = layers.findIndex(l => l.id === id);
      if (index !== -1) {
        layers.splice(index, 1);
      }
    })
  } as unknown as Map;

  return { map, layers };
}

describe('layerManager', () => {
  it('should find the closest beforeId based on registered Z-Indices', () => {
    const { map } = createMockMap();

    addLayerWithZIndex(map, { id: 'raster-base' } as any, Z_INDEX_BASE_RASTER);
    addLayerWithZIndex(map, { id: 'labels' } as any, Z_INDEX_BASE_LABELS);

    // GeoJSON (400) should be inserted before labels (500)
    const beforeIdForGeoJson = findBeforeIdForZIndex(map, Z_INDEX_GEOJSON);
    expect(beforeIdForGeoJson).toBe('labels');

    // Layer with zIndex 50 (below raster 100) should be inserted before raster-base
    const beforeIdForBackground = findBeforeIdForZIndex(map, 50);
    expect(beforeIdForBackground).toBe('raster-base');

    // Layer with zIndex 999 (above labels 500) should return undefined (top of stack)
    const beforeIdForTop = findBeforeIdForZIndex(map, 999);
    expect(beforeIdForTop).toBeUndefined();
  });

  it('should insert layers in correct visual order regardless of invocation order', () => {
    const { map, layers } = createMockMap();

    // Add in reverse order: labels (500) -> geojson (400) -> raster (100) -> image (300)
    addLayerWithZIndex(map, { id: 'labels' } as any, Z_INDEX_BASE_LABELS);
    addLayerWithZIndex(map, { id: 'geojson-layer' } as any, Z_INDEX_GEOJSON);
    addLayerWithZIndex(map, { id: 'raster-base' } as any, Z_INDEX_BASE_RASTER);
    addLayerWithZIndex(map, { id: 'image-overlay' } as any, Z_INDEX_IMAGE_LAYERS);

    // The layers array in the map should be ordered strictly by z-index:
    // [raster-base (100), image-overlay (300), geojson-layer (400), labels (500)]
    expect(layers.map(l => l.id)).toEqual([
      'raster-base',
      'image-overlay',
      'geojson-layer',
      'labels'
    ]);
  });

  it('should ignore unindexed layers during Z-Index calculation', () => {
    const { map, layers } = createMockMap();

    addLayerWithZIndex(map, { id: 'raster-base' } as any, Z_INDEX_BASE_RASTER);
    // Unindexed layer
    addLayerWithZIndex(map, { id: 'unindexed-layer' } as any);
    addLayerWithZIndex(map, { id: 'labels' } as any, Z_INDEX_BASE_LABELS);

    expect(getLayerZIndex(map, 'unindexed-layer')).toBeUndefined();

    // Adding GeoJSON (400) should find 'labels' (500), ignoring 'unindexed-layer'
    addLayerWithZIndex(map, { id: 'geojson-layer' } as any, Z_INDEX_GEOJSON);

    expect(layers.map(l => l.id)).toEqual([
      'raster-base',
      'unindexed-layer',
      'geojson-layer',
      'labels'
    ]);
  });

  it('should reorder existing layers when setLayerZIndex is called', () => {
    const { map, layers } = createMockMap();

    addLayerWithZIndex(map, { id: 'layer-a' } as any, 100);
    addLayerWithZIndex(map, { id: 'layer-b' } as any, 200);
    addLayerWithZIndex(map, { id: 'layer-c' } as any, 300);

    expect(layers.map(l => l.id)).toEqual(['layer-a', 'layer-b', 'layer-c']);

    // Promote layer-a above layer-c
    setLayerZIndex(map, 'layer-a', 350);
    expect(getLayerZIndex(map, 'layer-a')).toBe(350);
    expect(layers.map(l => l.id)).toEqual(['layer-b', 'layer-c', 'layer-a']);

    // Demote layer-c below layer-b
    setLayerZIndex(map, 'layer-c', 150);
    expect(layers.map(l => l.id)).toEqual(['layer-c', 'layer-b', 'layer-a']);
  });

  it('should clean up layer registry when removeLayerWithZIndex is called', () => {
    const { map, layers } = createMockMap();

    addLayerWithZIndex(map, { id: 'layer-a' } as any, 100);
    expect(getLayerZIndex(map, 'layer-a')).toBe(100);

    removeLayerWithZIndex(map, 'layer-a');
    expect(getLayerZIndex(map, 'layer-a')).toBeUndefined();
    expect(layers.find(l => l.id === 'layer-a')).toBeUndefined();
  });
});
