import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { DecodedObject } from '../../../lib/marker/types.ts';
import { Z_INDEX_BASE_VECTOR } from '../layers/layerUtils.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createDeleteButton } from '../buttonHelpers.ts';
import MapVectorHandler from './MapVectorHandler.svelte';

export function isStreetMapActive(options: DecodedObject): boolean {
  if (options.hideOsm) return false;
  return options.base === 'street' || !options.base;
}

export const streetMapFeature: LayerFeatureDefinition<void> = {
  kind: 'streetMap',
  label: 'Street Map',
  icon: MapIcon,
  defaultZIndex: Z_INDEX_BASE_VECTOR,
  isMultiItem: false,

  buttons: [createDeleteButton({ title: 'Hide street map', ariaLabel: 'Hide street map' })],

  canAdd(options: DecodedObject) {
    return !isStreetMapActive(options);
  },

  createDefault() {
    return undefined as void;
  },

  getItems(options: DecodedObject): LayerItemDescriptor<void>[] {
    if (!isStreetMapActive(options)) return [];
    return [
      {
        id: 'street-map',
        kind: 'streetMap',
        name: 'Street Map',
        zIndex: options.streetMapZIndex ?? Z_INDEX_BASE_VECTOR
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<void>, newZIndex: number) {
    options.streetMapZIndex = newZIndex;
  },

  add(options: DecodedObject) {
    options.base = 'street';
    options.hideOsm = false;
  },

  delete(options: DecodedObject) {
    options.hideOsm = true;
  },

  MapRenderer: MapVectorHandler
};

export { default as MapVectorHandler } from './MapVectorHandler.svelte';
