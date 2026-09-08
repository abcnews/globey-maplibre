import { describe, it, assert, vi } from 'vitest';
import { customLabelsFeature } from './index.ts';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import type { DecodedObject, Label } from '../../../lib/marker/types.ts';

describe('CustomLabels Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(customLabelsFeature.kind, 'customLabels');
    assert.strictEqual(customLabelsFeature.label, 'Custom Labels');
    assert.strictEqual(customLabelsFeature.defaultZIndex, Z_INDEX_CUSTOM_LABELS);
    assert.strictEqual(customLabelsFeature.isMultiItem, false);
    assert.isDefined(customLabelsFeature.ConfigModal);
    assert.isDefined(customLabelsFeature.MapRenderer);
  });

  it('canAdd should return true only when labels are empty or not defined', () => {
    const emptyOptions: DecodedObject = {};
    const noLabels: DecodedObject = { labels: [] };
    const withLabels: DecodedObject = {
      labels: [{ name: 'Sydney', coords: [151.2093, -33.8688], style: 'country-large', number: 0 }]
    };

    assert.strictEqual(customLabelsFeature.canAdd?.(emptyOptions), true);
    assert.strictEqual(customLabelsFeature.canAdd?.(noLabels), true);
    assert.strictEqual(customLabelsFeature.canAdd?.(withLabels), false);
  });

  it('createDefault should return initial default label array', () => {
    const mockMap = {
      getCenter: () => ({ lng: 140, lat: -30 })
    } as any;

    const defaultLabels = customLabelsFeature.createDefault({ maxZIndex: 600, map: mockMap });
    assert.strictEqual(defaultLabels.length, 1);
    assert.strictEqual(defaultLabels[0].name, 'Label');
    assert.deepStrictEqual(defaultLabels[0].coords, [140, -30]);
  });

  it('interactivePlacement should update coords on map click', () => {
    const labels: Label[] = [{ name: 'Test', coords: [0, 0], style: 'country-large', number: 0 }];
    customLabelsFeature.interactivePlacement?.onMapClick([150, -35], labels);
    assert.deepStrictEqual(labels[0].coords, [150, -35]);
  });

  it('getItems should return descriptor when labels exist and empty when not', () => {
    const optionsWithLabels: DecodedObject = {
      labels: [
        { name: 'Sydney', coords: [151.2, -33.8], style: 'country-large', number: 0 },
        { name: 'Melbourne', coords: [144.9, -37.8], style: 'country-large', number: 0 }
      ],
      labelsZIndex: 620
    };

    const items = customLabelsFeature.getItems(optionsWithLabels);
    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].id, 'custom-labels');
    assert.strictEqual(items[0].name, 'Custom Labels');
    assert.strictEqual(items[0].description, '2 placed labels');
    assert.strictEqual(items[0].zIndex, 620);

    const itemsEmpty = customLabelsFeature.getItems({});
    assert.strictEqual(itemsEmpty.length, 0);
  });

  it('setZIndex should set labelsZIndex on options', () => {
    const options: DecodedObject = { labels: [{ name: 'Sydney', coords: [151, -33], style: 'country-large', number: 0 }] };
    const [item] = customLabelsFeature.getItems(options);
    customLabelsFeature.setZIndex(options, item, 650);
    assert.strictEqual(options.labelsZIndex, 650);
  });

  it('add and delete should mutate options.labels', () => {
    const options: DecodedObject = {};
    const newLabels: Label[] = [{ name: 'Perth', coords: [115.8, -31.9], style: 'country-large', number: 0 }];

    customLabelsFeature.add(options, newLabels);
    assert.deepStrictEqual(options.labels, newLabels);

    const [item] = customLabelsFeature.getItems(options);
    customLabelsFeature.delete(options, item);
    assert.deepStrictEqual(options.labels, []);
  });

  it('should define custom action buttons (add, edit, delete)', () => {
    const buttons = typeof customLabelsFeature.buttons === 'function'
      ? customLabelsFeature.buttons({} as any, {})
      : customLabelsFeature.buttons;

    assert.isDefined(buttons);
    assert.strictEqual(buttons?.length, 3);

    const [addBtn, editBtn, deleteBtn] = buttons!;
    assert.strictEqual(addBtn.id, 'add');
    assert.strictEqual(editBtn.id, 'edit');
    assert.strictEqual(deleteBtn.id, 'delete');

    // Test add button onclick starts interactive placement and opens modal on placement
    const mockStartPlacement = vi.fn();
    const mockAddOpenModal = vi.fn();
    const options: DecodedObject = { labels: [] };
    addBtn.onclick({
      options,
      item: { id: 'custom-labels', kind: 'customLabels', name: 'Custom Labels', description: '', zIndex: 600, data: options.labels },
      startInteractivePlacement: mockStartPlacement,
      openModal: mockAddOpenModal
    });

    assert.strictEqual(mockStartPlacement.mock.calls.length, 1);
    const placementArg = mockStartPlacement.mock.calls[0][0];
    assert.strictEqual(placementArg.prompt, 'Click on the map to place a label');

    // Simulate placing a label
    placementArg.onMapClick([120, -20]);
    assert.strictEqual(options.labels?.length, 1);
    assert.deepStrictEqual(options.labels?.[0].coords, [120, -20]);
    assert.strictEqual(mockAddOpenModal.mock.calls.length, 1);

    // Test edit button onclick
    const mockOpenModal = vi.fn();
    editBtn.onclick({
      options,
      item: { id: 'custom-labels', kind: 'customLabels', name: 'Custom Labels', description: '', zIndex: 600, data: options.labels },
      startInteractivePlacement: vi.fn(),
      openModal: mockOpenModal
    });
    assert.strictEqual(mockOpenModal.mock.calls.length, 1);
  });

  it('update should update options.labels', () => {
    const options: DecodedObject = { labels: [{ name: 'Old', coords: [0, 0], style: 'country-large', number: 0 }] };
    const [descriptor] = customLabelsFeature.getItems(options);
    const updated: Label[] = [{ name: 'New', coords: [1, 1], style: 'country-large', number: 1 }];

    customLabelsFeature.update?.(options, descriptor, updated);
    assert.deepStrictEqual(options.labels, updated);
  });

  it('isValid should return true only when label array has at least one item', () => {
    assert.strictEqual(customLabelsFeature.isValid?.([]), false);
    assert.strictEqual(customLabelsFeature.isValid?.(undefined as any), false);
    assert.strictEqual(
      customLabelsFeature.isValid?.([{ name: 'Test', coords: [0, 0], style: 'country-large', number: 0 }]),
      true
    );
  });
});

