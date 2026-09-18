import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { ImageSourceConfig, DecodedObject } from '../../../lib/marker';
import { isValidUrl } from '../../../lib/marker/utils.ts';
import { Z_INDEX_IMAGE_LAYERS } from '../layers/layerUtils.ts';
import { CardImage as ImageIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import BuilderImageSourceConfigModal from './BuilderImageSourceConfigModal.svelte';
import ImageSourcesHandler from './ImageSourcesHandler.svelte';

export const imageSourceFeature: LayerFeatureDefinition<ImageSourceConfig> = {
  kind: 'image',
  label: 'Image Layer',
  icon: ImageIcon,
  defaultZIndex: Z_INDEX_IMAGE_LAYERS,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has coordinates.
  buttons: item => [
    ...(item.data?.coordinates?.length
      ? [
          createGoToButton<ImageSourceConfig>({
            title: 'Go to image layer',
            getTarget: i =>
              i.data?.coordinates?.length ? { type: 'bounds', bounds: i.data.coordinates } : undefined
          })
        ]
      : []),
    createEditButton<ImageSourceConfig>({ title: 'Edit image layer' }),
    createDeleteButton<ImageSourceConfig>({ title: 'Delete image layer' })
  ],

  createDefault({ maxZIndex }) {
    return {
      id: Date.now().toString(),
      url: '',
      opacity: 1,
      coordinates: [
        [-180, 85.0511],
        [180, 85.0511],
        [180, -85.0511],
        [-180, -85.0511]
      ],
      zIndex: maxZIndex
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<ImageSourceConfig>[] {
    return (options.imageSources || []).map((item, idx) => {
      return {
        id: `image-${item.id || item.url || idx}`,
        kind: 'image',
        name: item.name || imageSourceFeature.label,
        zIndex: item.zIndex ?? Z_INDEX_IMAGE_LAYERS + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<ImageSourceConfig>, newZIndex: number) {
    const entry = imageSourceFeature.getItems(options).find(i => i.id === item.id)?.data;
    if (entry) entry.zIndex = newZIndex;
  },

  add(options: DecodedObject, item: ImageSourceConfig) {
    options.imageSources = [...(options.imageSources || []), item];
  },

  isValid(data: ImageSourceConfig) {
    return Boolean(data?.url && isValidUrl(data.url));
  },

  update(options: DecodedObject, descriptor: LayerItemDescriptor<ImageSourceConfig>, data: ImageSourceConfig) {
    if (options.imageSources) {
      options.imageSources = options.imageSources.map(item =>
        item === descriptor.data || (item.id && item.id === data.id) ? data : item
      );
    }
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<ImageSourceConfig>) {
    options.imageSources = (options.imageSources || []).filter(entry => entry !== item.data);
  },


  ConfigModal: BuilderImageSourceConfigModal,
  MapRenderer: ImageSourcesHandler
};

export * from './utils.ts';
export { default as ImageSourceHandler } from './ImageSourceHandler.svelte';
export { default as ImageSourcesHandler } from './ImageSourcesHandler.svelte';
export { default as BuilderImageSourceConfigModal } from './BuilderImageSourceConfigModal.svelte';
