import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { Label, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import { Fonts as TypeIcon, Plus } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import MapCustomLabelHandler from './MapCustomLabelHandler.svelte';
import BuilderCustomLabelsConfigModal from './BuilderCustomLabelsConfigModal.svelte';

export const customLabelsFeature: LayerFeatureDefinition<Label[]> = {
  kind: 'customLabels',
  label: 'Custom Labels',
  icon: TypeIcon,
  defaultZIndex: Z_INDEX_CUSTOM_LABELS,
  isMultiItem: false,

  canAdd(options: DecodedObject) {
    return !options.labels || options.labels.length === 0;
  },

  createDefault({ map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return [
      {
        name: 'Label',
        coords: [center.lng, center.lat],
        style: 'country-large',
        number: 0
      }
    ];
  },

  interactivePlacement: {
    prompt: 'Click on the map to place a label',
    onMapClick: (coords, item) => {
      if (item && item.length > 0) {
        item[0].coords = coords;
      }
    }
  },

  buttons: [
    {
      id: 'add',
      title: 'Add label',
      ariaLabel: 'Add label',
      icon: Plus,
      onclick: ({ options, startInteractivePlacement, openModal }) => {
        startInteractivePlacement({
          prompt: 'Click on the map to place a label',
          onMapClick: coords => {
            const newLabel: Label = {
              name: 'Label',
              coords,
              style: 'country-large',
              number: 0
            };
            options.labels = [...(options.labels || []), newLabel];
            openModal();
          }
        });
      }
    },
    createEditButton<Label[]>({ title: 'Edit custom labels' }),
    createDeleteButton<Label[]>({ title: 'Delete custom labels' })
  ],

  getItems(options: DecodedObject): LayerItemDescriptor<Label[]>[] {
    if (!options.labels || options.labels.length === 0) return [];
    return [
      {
        id: 'custom-labels',
        kind: 'customLabels',
        name: 'Custom Labels',
        description: `${options.labels.length} placed label${options.labels.length === 1 ? '' : 's'}`,
        zIndex: options.labelsZIndex ?? Z_INDEX_CUSTOM_LABELS,
        data: options.labels
      }
    ];
  },

  setZIndex(options: DecodedObject, _item: LayerItemDescriptor<Label[]>, newZIndex: number) {
    options.labelsZIndex = newZIndex;
  },

  add(options: DecodedObject, item: Label[]) {
    options.labels = item;
  },

  isValid(data: Label[]) {
    return Boolean(data && data.length > 0);
  },

  update(options: DecodedObject, _descriptor: LayerItemDescriptor<Label[]>, data: Label[]) {
    options.labels = data;
  },

  delete(options: DecodedObject) {
    options.labels = [];
  },


  ConfigModal: BuilderCustomLabelsConfigModal,
  MapRenderer: MapCustomLabelHandler
};

export { default as MapCustomLabelHandler } from './MapCustomLabelHandler.svelte';
export { default as BuilderCustomLabelsConfigModal } from './BuilderCustomLabelsConfigModal.svelte';

