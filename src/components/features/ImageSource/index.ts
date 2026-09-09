import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { ImageSourceConfig, DecodedObject } from '../../../lib/marker';
import { isValidUrl } from '../../../lib/marker/utils.ts';
import { Z_INDEX_IMAGE_LAYERS } from '../layers/layerUtils.ts';
import { CardImage as ImageIcon } from 'svelte-bootstrap-icons';
import { createClockButton, createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderImageSourceConfigModal from './BuilderImageSourceConfigModal.svelte';
import ImageSourcesHandler from './ImageSourcesHandler.svelte';

export const imageSourceFeature: LayerFeatureDefinition<ImageSourceConfig> = {
  kind: 'image',
  label: 'Image Layer',
  icon: ImageIcon,
  defaultZIndex: Z_INDEX_IMAGE_LAYERS,
  isMultiItem: true,

  // A factory, not an array: the clock toggle's icon reflects the item's
  // current `animationClock`, so it has to be resolved per item.
  buttons: item => [createClockButton<ImageSourceConfig>(item),
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
      const filename = item.url ? item.url.split('/').pop() || item.url : 'Untitled Image';
      return {
        id: `image-${item.id || item.url || idx}`,
        kind: 'image',
        name: filename,
        description: item.url ? `${item.url.slice(0, 40)}...` : 'No URL',
        zIndex: item.zIndex ?? Z_INDEX_IMAGE_LAYERS + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<ImageSourceConfig>, newZIndex: number) {
    if (item.data) {
      item.data.zIndex = newZIndex;
    }
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
