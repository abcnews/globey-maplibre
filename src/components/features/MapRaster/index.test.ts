import { describe, it, assert } from 'vitest';
import { rasterFeature } from './index.ts';
import { Z_INDEX_BASE_RASTER } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('Raster Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(rasterFeature.kind, 'raster');
    assert.strictEqual(rasterFeature.label, 'Raster Tile Layer');
    assert.strictEqual(rasterFeature.defaultZIndex, Z_INDEX_BASE_RASTER);
    assert.strictEqual(rasterFeature.isMultiItem, true);
    assert.ok(rasterFeature.ConfigModal);
    assert.ok(rasterFeature.MapRenderer);
  });

  it('createDefault should return NASA Blue Marble default', () => {
    const item = rasterFeature.createDefault({ maxZIndex: 150 });
    assert.include(item.url, 'blue-marble');
    assert.strictEqual(item.maxZoom, 7);
    assert.strictEqual(item.attribution, 'NASA Blue Marble');
    assert.strictEqual(item.zIndex, 150);
  });

  it('getItems should format items correctly and detect Blue/Black Marble names', () => {
    const options: DecodedObject = {
      rasterLayers: [
        {
          url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
          maxZoom: 7,
          attribution: 'NASA Blue Marble',
          zIndex: 100
        },
        {
          url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-black-marble/{z}/{x}/{y}.webp',
          maxZoom: 7,
          attribution: 'NASA Black Marble',
          zIndex: 110
        },
        {
          url: 'https://tile.example.com/{z}/{x}/{y}.png',
          maxZoom: 18,
          attribution: 'Example Provider',
          zIndex: 120
        }
      ]
    };

    const items = rasterFeature.getItems(options);
    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].name, 'NASA Blue Marble');
    assert.strictEqual(items[1].name, 'NASA Black Marble');
    assert.strictEqual(items[2].name, 'Example Provider');
  });

  it('add should append new raster config to options.rasterLayers', () => {
    const options: DecodedObject = { rasterLayers: [] };
    const newItem = rasterFeature.createDefault({ maxZIndex: 100 });
    rasterFeature.add(options, newItem);
    assert.strictEqual(options.rasterLayers?.length, 1);
    assert.strictEqual(options.rasterLayers[0].url, newItem.url);
  });

  it('delete should remove specific raster config from options.rasterLayers', () => {
    const item1 = { url: 'https://example.com/1/{z}/{x}/{y}.png', maxZoom: 10, attribution: 'A' };
    const item2 = { url: 'https://example.com/2/{z}/{x}/{y}.png', maxZoom: 10, attribution: 'B' };
    const options: DecodedObject = { rasterLayers: [item1, item2] };

    const items = rasterFeature.getItems(options);
    rasterFeature.delete(options, items[0]);
    assert.strictEqual(options.rasterLayers?.length, 1);
    assert.strictEqual(options.rasterLayers[0].url, item2.url);
  });

  it('setZIndex should update zIndex on item data', () => {
    const item = { url: 'https://example.com/1/{z}/{x}/{y}.png', maxZoom: 10, attribution: 'A', zIndex: 100 };
    const options: DecodedObject = { rasterLayers: [item] };

    const [descriptor] = rasterFeature.getItems(options);
    rasterFeature.setZIndex(options, descriptor, 160);
    assert.strictEqual(item.zIndex, 160);
  });

  it('setZIndex should update a cloned draft, not the original descriptor reference (regression: stale item.data)', () => {
    const item = { url: 'https://example.com/1/{z}/{x}/{y}.png', maxZoom: 10, attribution: 'A', zIndex: 100 };
    const options: DecodedObject = { rasterLayers: [item] };
    const [descriptor] = rasterFeature.getItems(options);

    const draft: DecodedObject = JSON.parse(JSON.stringify(options));

    rasterFeature.setZIndex(draft, descriptor, 160);

    assert.strictEqual(draft.rasterLayers?.[0].zIndex, 160);
    assert.strictEqual(item.zIndex, 100, 'the original (pre-clone) object must be left untouched');
  });

  it('isValid and update should validate and synchronize raster layers', () => {
    assert.strictEqual(rasterFeature.isValid?.({ url: 'https://example.com/tiles/{z}/{x}/{y}.png' } as any, {}), true);
    assert.strictEqual(rasterFeature.isValid?.({ url: '' } as any, {}), false);

    const item = { url: 'https://example.com/1/{z}/{x}/{y}.png', maxZoom: 10, attribution: 'A' };
    const options: DecodedObject = { rasterLayers: [item] };
    const [descriptor] = rasterFeature.getItems(options);

    const updated = { ...item, attribution: 'Updated Attribution' };
    rasterFeature.update?.(options, descriptor, updated);
    assert.strictEqual(options.rasterLayers?.[0].attribution, 'Updated Attribution');
  });
});

