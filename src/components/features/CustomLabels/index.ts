import type { LayerFeatureDefinition } from '../types.ts';
import type { CustomLabelsLayer, LabelItem } from '../../../lib/data/jsonBlob.ts';
import { newLayerId, findLayer } from '../layerOps.ts';
import { Fonts as TypeIcon, Plus } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import MapCustomLabelHandler from './MapCustomLabelHandler.svelte';
import BuilderCustomLabelsConfigModal from './BuilderCustomLabelsConfigModal.svelte';

/** A label pinned at `coords`, with the defaults a freshly-placed one gets. */
const defaultLabel = (coords: [number, number]): LabelItem => ({
  name: 'Label',
  coords,
  style: 'country-large',
  number: 0
});

export const customLabelsFeature: LayerFeatureDefinition<CustomLabelsLayer> = {
  kind: 'customLabels',
  label: 'Custom Labels',
  icon: TypeIcon,
  isMultiItem: false,

  createDefault({ map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return {
      id: newLayerId('customLabels'),
      type: 'customLabels',
      labels: [defaultLabel([center.lng, center.lat])]
    };
  },

  interactivePlacement: {
    prompt: 'Click on the map to place a label',
    onMapClick: (coords, item) => {
      if (item.labels.length > 0) item.labels[0].coords = coords;
    }
  },

  buttons: [
    {
      id: 'add',
      title: 'Add label',
      ariaLabel: 'Add label',
      icon: Plus,
      onclick: ({ item, startInteractivePlacement, openModal }) => {
        startInteractivePlacement({
          prompt: 'Click on the map to place a label',
          // `freshOptions` is a new draft, so re-find the layer by id rather than
          // mutating the stale `item.data` captured at button-click time.
          onMapClick: (coords, _item, freshOptions) => {
            const layer = findLayer(freshOptions, item.id);
            if (layer?.type !== 'customLabels') return;
            layer.labels = [...layer.labels, defaultLabel(coords)];
            openModal(freshOptions);
          }
        });
      }
    },
    createEditButton<CustomLabelsLayer>({ title: 'Edit custom labels' }),
    createDeleteButton<CustomLabelsLayer>({ title: 'Delete custom labels' })
  ],

  isValid(data: CustomLabelsLayer) {
    return Boolean(data?.labels?.length);
  },

  ConfigModal: BuilderCustomLabelsConfigModal,
  MapRenderer: MapCustomLabelHandler
};

export { default as MapCustomLabelHandler } from './MapCustomLabelHandler.svelte';
export { default as BuilderCustomLabelsConfigModal } from './BuilderCustomLabelsConfigModal.svelte';
