import { describe, it, assert } from 'vitest';
import { streetMapFeature, isStreetMapActive } from './index.ts';
import { Z_INDEX_BASE_VECTOR } from '../layers/layerUtils.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';

describe('StreetMap Feature Definition', () => {
  it('should have correct metadata and defaults', () => {
    assert.strictEqual(streetMapFeature.kind, 'streetMap');
    assert.strictEqual(streetMapFeature.label, 'Street Map');
    assert.strictEqual(streetMapFeature.defaultZIndex, Z_INDEX_BASE_VECTOR);
    assert.strictEqual(streetMapFeature.isMultiItem, false);
  });

  it('isStreetMapActive helper should check base and hideOsm', () => {
    assert.strictEqual(isStreetMapActive({ base: 'street', hideOsm: false }), true);
    assert.strictEqual(isStreetMapActive({ base: 'street', hideOsm: true }), false);
    assert.strictEqual(isStreetMapActive({ base: 'dark', hideOsm: false }), false);
    assert.strictEqual(isStreetMapActive({}), true);
  });

  it('canAdd should return true only when street map is inactive', () => {
    const optionsActive: DecodedObject = { base: 'street', hideOsm: false };
    const optionsHidden: DecodedObject = { base: 'street', hideOsm: true };
    const optionsDarkBase: DecodedObject = { base: 'dark', hideOsm: false };

    assert.strictEqual(streetMapFeature.canAdd?.(optionsActive), false);
    assert.strictEqual(streetMapFeature.canAdd?.(optionsHidden), true);
    assert.strictEqual(streetMapFeature.canAdd?.(optionsDarkBase), true);
  });

  it('getItems should return descriptor when active and empty when hidden', () => {
    const optionsActive: DecodedObject = { base: 'street', hideOsm: false, streetMapZIndex: 210 };
    const optionsHidden: DecodedObject = { base: 'street', hideOsm: true };

    const itemsActive = streetMapFeature.getItems(optionsActive);
    assert.strictEqual(itemsActive.length, 1);
    assert.strictEqual(itemsActive[0].id, 'street-map');
    assert.strictEqual(itemsActive[0].zIndex, 210);

    const itemsHidden = streetMapFeature.getItems(optionsHidden);
    assert.strictEqual(itemsHidden.length, 0);
  });

  it('setZIndex should set streetMapZIndex on options', () => {
    const options: DecodedObject = { base: 'street' };
    const [item] = streetMapFeature.getItems(options);
    streetMapFeature.setZIndex(options, item, 250);
    assert.strictEqual(options.streetMapZIndex, 250);
  });

  it('add should set base to street and hideOsm to false', () => {
    const options: DecodedObject = { base: 'dark', hideOsm: true };
    streetMapFeature.add(options);
    assert.strictEqual(options.base, 'street');
    assert.strictEqual(options.hideOsm, false);
  });

  it('delete should set hideOsm to true', () => {
    const options: DecodedObject = { base: 'street', hideOsm: false };
    const [item] = streetMapFeature.getItems(options);
    streetMapFeature.delete(options, item);
    assert.strictEqual(options.hideOsm, true);
  });
});
