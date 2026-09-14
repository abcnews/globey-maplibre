import { describe, it, assert, vi } from 'vitest';
import { createEditButton, createDeleteButton, createClockButton, getDefaultLayerButtons } from './buttonHelpers.ts';
import type { LayerFeatureDefinition, LayerItemDescriptor } from './types.ts';

describe('createEditButton', () => {
  it('onclick should call openModal', () => {
    const openModal = vi.fn();
    const btn = createEditButton();
    btn.onclick({ options: {}, item: {} as any, startInteractivePlacement: vi.fn(), openModal, openClockModal: vi.fn() });
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
    btn.onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn(), openClockModal: vi.fn() });

    assert.strictEqual(deleteFn.mock.calls.length, 1);
    assert.strictEqual(deleteFn.mock.calls[0][0], options);
    assert.strictEqual(deleteFn.mock.calls[0][1], item);
  });

  it('onclick should do nothing when the item has no feature attached', () => {
    const options = { geoJson: [] };
    const item = { id: 'geojson-1' } as any;
    const btn = createDeleteButton();
    assert.doesNotThrow(() => {
      btn.onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn(), openClockModal: vi.fn() });
    });
  });
});

describe('createClockButton', () => {
  it('onclick should call openClockModal to open the shared clock/name modal', () => {
    const data: any = {};
    const descriptor: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', zIndex: 0, data };
    const openClockModal = vi.fn();

    const btn = createClockButton(descriptor);
    btn.onclick({
      options: {},
      item: descriptor,
      startInteractivePlacement: vi.fn(),
      openModal: vi.fn(),
      openClockModal
    });

    assert.strictEqual(openClockModal.mock.calls.length, 1);
  });
});

describe('getDefaultLayerButtons', () => {
  it('should include clock only for multi-item features with data', () => {
    const multiItemFeature = { isMultiItem: true } as LayerFeatureDefinition<any>;
    const item: LayerItemDescriptor<any> = { id: '1', kind: 'geojson', name: '', zIndex: 0, data: {} };

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
