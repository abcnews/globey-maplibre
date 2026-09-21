import type { LayerFeatureDefinition } from '../types.ts';
import type { GlobeJsonBlob, StreetMapLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../layerOps.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createDeleteButton } from '../buttonHelpers.ts';
import MapVectorHandler from './MapVectorHandler.svelte';

/**
 * Whether the base vector street map should render. Deleting the layer removes it
 * outright; `hideOsm` additionally suppresses it while the layer is kept for its
 * stack position.
 */
export function isStreetMapActive(options: GlobeJsonBlob): boolean {
  return options.layers.some(layer => layer.type === 'streetMap' && !layer.hideOsm);
}

export const streetMapFeature: LayerFeatureDefinition<StreetMapLayer> = {
  kind: 'streetMap',
  label: 'Street Map',
  icon: MapIcon,
  isMultiItem: false,

  buttons: [createDeleteButton<StreetMapLayer>({ title: 'Hide street map', ariaLabel: 'Hide street map' })],

  createDefault() {
    return {
      id: newLayerId('streetMap'),
      type: 'streetMap',
      hideOsm: false
    };
  },

  MapRenderer: MapVectorHandler
};

export { default as MapVectorHandler } from './MapVectorHandler.svelte';
