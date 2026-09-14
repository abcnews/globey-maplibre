import { describe, it, assert } from 'vitest';
import { geoJsonFeature } from './index.ts';
import { Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('GeoJson Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(geoJsonFeature.kind, 'geojson');
    assert.strictEqual(geoJsonFeature.label, 'GeoJSON');
    assert.strictEqual(geoJsonFeature.defaultZIndex, Z_INDEX_GEOJSON);
    assert.strictEqual(geoJsonFeature.isMultiItem, true);
    assert.ok(geoJsonFeature.ConfigModal);
    assert.ok(geoJsonFeature.MapRenderer);
  });

  it('getItems should format items and derive ids from id/cmid/url', () => {
    const options: DecodedObject = {
      geoJson: [
        { id: 'abc', type: 'areas', zIndex: 100 },
        { cmid: '12345', type: 'points', zIndex: 110 }
      ]
    };

    const items = geoJsonFeature.getItems(options);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].id, 'geojson-abc');
    assert.strictEqual(items[1].id, 'geojson-12345');
  });

  it('add should append new geojson config to options.geoJson', () => {
    const options: DecodedObject = { geoJson: [] };
    const newItem = geoJsonFeature.createDefault({ maxZIndex: 100 });
    geoJsonFeature.add(options, newItem);
    assert.strictEqual(options.geoJson?.length, 1);
    assert.strictEqual(options.geoJson[0].id, newItem.id);
  });

  it('delete should remove the matching geojson entry by id', () => {
    const item1 = { id: '1', type: 'areas', zIndex: 100 };
    const item2 = { id: '2', type: 'areas', zIndex: 110 };
    const options: DecodedObject = { geoJson: [item1, item2] };

    const items = geoJsonFeature.getItems(options);
    geoJsonFeature.delete(options, items[0]);
    assert.strictEqual(options.geoJson?.length, 1);
    assert.strictEqual(options.geoJson[0].id, '2');
  });

  it('setZIndex should update zIndex on the matching entry in the given options object', () => {
    const item = { id: '1', type: 'areas', zIndex: 100 };
    const options: DecodedObject = { geoJson: [item] };

    const [descriptor] = geoJsonFeature.getItems(options);
    geoJsonFeature.setZIndex(options, descriptor, 160);
    assert.strictEqual(options.geoJson?.[0].zIndex, 160);
  });

  it('setZIndex should update a cloned draft, not the original descriptor reference (regression: stale item.data)', () => {
    const item = { id: '1', type: 'areas', zIndex: 100 };
    const options: DecodedObject = { geoJson: [item] };
    const [descriptor] = geoJsonFeature.getItems(options);

    // Simulate mutateDecoded's deep clone: a separate object graph from `descriptor.data`.
    const draft: DecodedObject = JSON.parse(JSON.stringify(options));

    geoJsonFeature.setZIndex(draft, descriptor, 160);

    assert.strictEqual(draft.geoJson?.[0].zIndex, 160);
    assert.strictEqual(item.zIndex, 100, 'the original (pre-clone) object must be left untouched');
  });

  it('isValid and update should validate and synchronize geojson layers', () => {
    assert.strictEqual(geoJsonFeature.isValid?.({ url: 'https://example.com/data.json' } as any), true);
    assert.strictEqual(geoJsonFeature.isValid?.({} as any), false);

    const item = { id: '1', type: 'areas', zIndex: 100 };
    const options: DecodedObject = { geoJson: [item] };
    const [descriptor] = geoJsonFeature.getItems(options);

    const updated = { ...item, type: 'points' };
    geoJsonFeature.update?.(options, descriptor, updated);
    assert.strictEqual(options.geoJson?.[0].type, 'points');
  });
});
