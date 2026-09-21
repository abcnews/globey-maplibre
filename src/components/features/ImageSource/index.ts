import type { LayerFeatureDefinition } from '../types.ts';
import type { ImageLayer } from '../../../lib/data/jsonBlob.ts';
import { isValidUrl } from '../../../lib/data/layerHelpers.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { CardImage as ImageIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../utils/buttonHelpers.ts';
import BuilderImageSourceConfigModal from './BuilderImageSourceConfigModal.svelte';
import ImageSourcesHandler from './ImageSourcesHandler.svelte';

export const imageSourceFeature: LayerFeatureDefinition<ImageLayer> = {
  kind: 'image',
  label: 'Image Layer',
  icon: ImageIcon,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has coordinates.
  buttons: item => [
    ...(item.data?.coordinates?.length
      ? [
          createGoToButton<ImageLayer>({
            title: 'Go to image layer',
            getTarget: i => (i.data?.coordinates?.length ? { type: 'bounds', bounds: i.data.coordinates } : undefined)
          })
        ]
      : []),
    createEditButton<ImageLayer>({ title: 'Edit image layer' }),
    createDeleteButton<ImageLayer>({ title: 'Delete image layer' })
  ],

  createDefault() {
    return {
      id: newLayerId('image'),
      type: 'image',
      url: '',
      coordinates: [
        [-180, 85.0511],
        [180, 85.0511],
        [180, -85.0511],
        [-180, -85.0511]
      ]
    };
  },

  isValid(data: ImageLayer) {
    return Boolean(data?.url && isValidUrl(data.url));
  },

  ConfigModal: BuilderImageSourceConfigModal,
  MapRenderer: ImageSourcesHandler
};

export * from './utils.ts';
