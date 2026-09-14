import { describe, it, assert } from 'vitest';
import { imageSourceFeature } from './index.ts';
import { Z_INDEX_IMAGE_LAYERS } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('ImageSource Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(imageSourceFeature.kind, 'image');
    assert.strictEqual(imageSourceFeature.label, 'Image Layer');
    assert.strictEqual(imageSourceFeature.defaultZIndex, Z_INDEX_IMAGE_LAYERS);
    assert.strictEqual(imageSourceFeature.isMultiItem, true);
    assert.ok(imageSourceFeature.ConfigModal);
    assert.ok(imageSourceFeature.MapRenderer);
  });

  it('getItems should format items and derive ids from id/url', () => {
    const options: DecodedObject = {
      imageSources: [
        { id: 'a1', url: 'https://example.com/one.png', zIndex: 100, opacity: 1, coordinates: [] as any },
        { url: 'https://example.com/two.png', zIndex: 110, opacity: 1, coordinates: [] as any }
      ]
    };

    const items = imageSourceFeature.getItems(options);
    assert.strictEqual(items.length, 2);
    assert.strictEqual(items[0].id, 'image-a1');
    assert.strictEqual(items[1].id, 'image-https://example.com/two.png');
  });

  it('add should append new image source config to options.imageSources', () => {
    const options: DecodedObject = { imageSources: [] };
    const newItem = imageSourceFeature.createDefault({ maxZIndex: 100 });
    imageSourceFeature.add(options, newItem);
    assert.strictEqual(options.imageSources?.length, 1);
    assert.strictEqual(options.imageSources[0].id, newItem.id);
  });

  it('delete should remove the matching image source entry by reference', () => {
    const item1 = { id: '1', url: 'https://example.com/1.png', zIndex: 100, opacity: 1, coordinates: [] as any };
    const item2 = { id: '2', url: 'https://example.com/2.png', zIndex: 110, opacity: 1, coordinates: [] as any };
    const options: DecodedObject = { imageSources: [item1, item2] };

    const items = imageSourceFeature.getItems(options);
    imageSourceFeature.delete(options, items[0]);
    assert.strictEqual(options.imageSources?.length, 1);
    assert.strictEqual(options.imageSources[0].id, '2');
  });

  it('setZIndex should update zIndex on the matching entry in the given options object', () => {
    const item = { id: '1', url: 'https://example.com/1.png', zIndex: 100, opacity: 1, coordinates: [] as any };
    const options: DecodedObject = { imageSources: [item] };

    const [descriptor] = imageSourceFeature.getItems(options);
    imageSourceFeature.setZIndex(options, descriptor, 160);
    assert.strictEqual(options.imageSources?.[0].zIndex, 160);
  });

  it('setZIndex should update a cloned draft, not the original descriptor reference (regression: stale item.data)', () => {
    const item = { id: '1', url: 'https://example.com/1.png', zIndex: 100, opacity: 1, coordinates: [] as any };
    const options: DecodedObject = { imageSources: [item] };
    const [descriptor] = imageSourceFeature.getItems(options);

    const draft: DecodedObject = JSON.parse(JSON.stringify(options));

    imageSourceFeature.setZIndex(draft, descriptor, 160);

    assert.strictEqual(draft.imageSources?.[0].zIndex, 160);
    assert.strictEqual(item.zIndex, 100, 'the original (pre-clone) object must be left untouched');
  });

  it('isValid and update should validate and synchronize image sources', () => {
    assert.strictEqual(imageSourceFeature.isValid?.({ url: 'https://example.com/data.png' } as any), true);
    assert.strictEqual(imageSourceFeature.isValid?.({ url: '' } as any), false);

    const item = { id: '1', url: 'https://example.com/1.png', zIndex: 100, opacity: 1, coordinates: [] as any };
    const options: DecodedObject = { imageSources: [item] };
    const [descriptor] = imageSourceFeature.getItems(options);

    const updated = { ...item, opacity: 0.5 };
    imageSourceFeature.update?.(options, descriptor, updated);
    assert.strictEqual(options.imageSources?.[0].opacity, 0.5);
  });
});
