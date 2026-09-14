import { describe, it, assert, vi } from 'vitest';
import { createEditButton, createDeleteButton, createClockButton, getDefaultLayerButtons } from './buttonHelpers.ts';
import type { LayerFeatureDefinition, LayerItemDescriptor } from './types.ts';

describe('createEditButton', () => {
  it('onclick should call openModal', () => {
    const openModal = vi.fn();
    const btn = createEditButton();
    btn.onclick({ options: {}, item: {} as any, startInteractivePlacement: vi.fn(), openModal });
    assert.strictEqual(openModal.mock.calls.length, 1);
  });
});

describe('createDeleteButton', () => {
  it('onclick should call the item feature\'s delete with the passed-in options and item', () => {
    const deleteFn = vi.fn();
    const fakeFeature = { delete: deleteFn } as unknown as LayerFeatureDefinition<any>;
    const options = { geoJson: [] };
    const item = { id: 'geojson-1', feature: fakeFeature } as any;

    const btn = createDeleteButton();
    btn.onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.strictEqual(deleteFn.mock.calls.length, 1);
    assert.strictEqual(deleteFn.mock.calls[0][0], options);
    assert.strictEqual(deleteFn.mock.calls[0][1], item);
  });

  it('onclick should do nothing when the item has no feature attached', () => {
    const options = { geoJson: [] };
    const item = { id: 'geojson-1' } as any;
    const btn = createDeleteButton();
    assert.doesNotThrow(() => {
      btn.onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn() });
    });
  });
});

describe('createClockButton', () => {
  it('onclick should set animationClock to immediate when currently scroll-tied', () => {
    const data: any = {};
    const descriptor: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', description: '', zIndex: 0, data };

    const btn = createClockButton(descriptor);
    btn.onclick({ options: {}, item: descriptor, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.strictEqual(data.animationClock, 'immediate');
  });

  it('onclick should clear animationClock when currently immediate', () => {
    const data: any = { animationClock: 'immediate' };
    const descriptor: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', description: '', zIndex: 0, data };

    const btn = createClockButton(descriptor);
    btn.onclick({ options: {}, item: descriptor, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.isUndefined(data.animationClock);
  });

  it('onclick should mutate whatever item.data is passed in the click context, not the item captured at creation', () => {
    // Simulates the Builder.layers.svelte flow: the button is created once against the
    // pre-clone item, but re-resolved against a mutateDecoded draft before onclick fires.
    const originalData: any = {};
    const draftData: any = {};
    const descriptor: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', description: '', zIndex: 0, data: originalData };
    const draftDescriptor: LayerItemDescriptor<any> = { ...descriptor, data: draftData };

    const btn = createClockButton(descriptor);
    btn.onclick({ options: {}, item: draftDescriptor, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.strictEqual(draftData.animationClock, 'immediate');
    assert.isUndefined(originalData.animationClock, 'the pre-clone object must be left untouched');
  });
});

describe('getDefaultLayerButtons', () => {
  it('should include clock only for multi-item features with data', () => {
    const multiItemFeature = { isMultiItem: true } as LayerFeatureDefinition<any>;
    const item: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', description: '', zIndex: 0, data: {} };

    const buttons = getDefaultLayerButtons(multiItemFeature, item);
    assert.deepStrictEqual(buttons.map(b => b.id), ['clock', 'delete']);
  });

  it('should include edit only when the feature has a ConfigModal', () => {
    const feature = { isMultiItem: false, ConfigModal: (() => {}) as any } as LayerFeatureDefinition<any>;
    const buttons = getDefaultLayerButtons(feature);
    assert.deepStrictEqual(buttons.map(b => b.id), ['edit', 'delete']);
  });

  it('should always include delete', () => {
    const feature = { isMultiItem: false } as LayerFeatureDefinition<any>;
    const buttons = getDefaultLayerButtons(feature);
    assert.deepStrictEqual(buttons.map(b => b.id), ['delete']);
  });
});
