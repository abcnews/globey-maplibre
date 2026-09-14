import { describe, it, assert } from 'vitest';
import { iconFeature } from './index.ts';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('Icon Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(iconFeature.kind, 'icon');
    assert.strictEqual(iconFeature.label, 'Icon Marker');
    assert.strictEqual(iconFeature.defaultZIndex, Z_INDEX_CUSTOM_LABELS);
    assert.strictEqual(iconFeature.isMultiItem, true);
    assert.ok(iconFeature.ConfigModal);
    assert.ok(iconFeature.MapRenderer);
  });

  it('getItems should format items and derive ids from id/cmid', () => {
    const options: DecodedObject = {
      icons: [
        { id: 'a1', cmid: 0, coords: [0, 0], zIndex: 100 },
        { cmid: 999, coords: [1, 1], zIndex: 110 }
      ]
    };

    const items = iconFeature.getItems(options);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].id, 'icon-a1');
    assert.strictEqual(items[1].id, 'icon-999');
  });

  it('add should append new icon config to options.icons', () => {
    const options: DecodedObject = { icons: [] };
    const newItem = iconFeature.createDefault({ maxZIndex: 100 });
    iconFeature.add(options, newItem);
    assert.strictEqual(options.icons?.length, 1);
    assert.strictEqual(options.icons[0].id, newItem.id);
  });

  it('delete should remove the matching icon entry by reference', () => {
    const item1 = { id: '1', cmid: 111, coords: [0, 0], zIndex: 100 };
    const item2 = { id: '2', cmid: 222, coords: [1, 1], zIndex: 110 };
    const options: DecodedObject = { icons: [item1, item2] };

    const items = iconFeature.getItems(options);
    iconFeature.delete(options, items[0]);
    assert.strictEqual(options.icons?.length, 1);
    assert.strictEqual(options.icons[0].id, '2');
  });

  it('setZIndex should update zIndex on the matching entry in the given options object', () => {
    const item = { id: '1', cmid: 111, coords: [0, 0], zIndex: 100 };
    const options: DecodedObject = { icons: [item] };

    const [descriptor] = iconFeature.getItems(options);
    iconFeature.setZIndex(options, descriptor, 160);
    assert.strictEqual(options.icons?.[0].zIndex, 160);
  });

  it('setZIndex should update a cloned draft, not the original descriptor reference (regression: stale item.data)', () => {
    const item = { id: '1', cmid: 111, coords: [0, 0], zIndex: 100 };
    const options: DecodedObject = { icons: [item] };
    const [descriptor] = iconFeature.getItems(options);

    const draft: DecodedObject = JSON.parse(JSON.stringify(options));

    iconFeature.setZIndex(draft, descriptor, 160);

    assert.strictEqual(draft.icons?.[0].zIndex, 160);
    assert.strictEqual(item.zIndex, 100, 'the original (pre-clone) object must be left untouched');
  });

  it('isValid and update should validate and synchronize icon markers', () => {
    assert.strictEqual(iconFeature.isValid?.({ cmid: 123 } as any), true);
    assert.strictEqual(iconFeature.isValid?.({ cmid: 0 } as any), false);

    const item = { id: '1', cmid: 111, coords: [0, 0], zIndex: 100 };
    const options: DecodedObject = { icons: [item] };
    const [descriptor] = iconFeature.getItems(options);

    const updated = { ...item, coords: [5, 5] as [number, number] };
    iconFeature.update?.(options, descriptor, updated);
    assert.deepStrictEqual(options.icons?.[0].coords, [5, 5]);
  });
});
