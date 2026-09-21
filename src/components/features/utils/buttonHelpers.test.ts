import { describe, it, assert, vi } from 'vitest';
import { createEditButton, createDeleteButton, getDefaultLayerButtons } from './buttonHelpers.ts';
import { parseGlobeJsonBlob } from '../../../lib/data/jsonBlob.ts';
import type { LayerFeatureDefinition } from '../types.ts';

const blobWith = (ids: string[]) => parseGlobeJsonBlob({ layers: ids.map(id => ({ id, type: 'geojsonAreas', cmid: 1 })) });

describe('createEditButton', () => {
  it('onclick should call openModal', () => {
    const openModal = vi.fn();
    const btn = createEditButton();
    btn.onclick({ options: blobWith([]), item: {} as any, startInteractivePlacement: vi.fn(), openModal });
    assert.strictEqual(openModal.mock.calls.length, 1);
  });
});

describe('createDeleteButton', () => {
  it("onclick should remove the item's layer from the blob, leaving the others in order", () => {
    const options = blobWith(['geojson-1', 'geojson-2', 'geojson-3']);
    const item = { id: 'geojson-2' } as any;

    createDeleteButton().onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.deepStrictEqual(
      options.layers.map(l => l.id),
      ['geojson-1', 'geojson-3']
    );
  });

  it('onclick should be a no-op when the id is not in the blob', () => {
    const options = blobWith(['geojson-1']);
    const item = { id: 'gone' } as any;

    createDeleteButton().onclick({ options, item, startInteractivePlacement: vi.fn(), openModal: vi.fn() });

    assert.deepStrictEqual(
      options.layers.map(l => l.id),
      ['geojson-1']
    );
  });
});

describe('getDefaultLayerButtons', () => {
  it('should include edit only when the feature has a ConfigModal', () => {
    const feature = { isMultiItem: false, ConfigModal: (() => {}) as any } as LayerFeatureDefinition<any>;
    const buttons = getDefaultLayerButtons(feature);
    assert.deepStrictEqual(
      buttons.map(b => b.id),
      ['edit', 'delete']
    );
  });

  it('should always include delete', () => {
    const feature = { isMultiItem: false } as LayerFeatureDefinition<any>;
    const buttons = getDefaultLayerButtons(feature);
    assert.deepStrictEqual(
      buttons.map(b => b.id),
      ['delete']
    );
  });
});
