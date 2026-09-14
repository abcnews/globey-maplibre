import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { IconConfig, DecodedObject } from '../../../lib/marker';
import { Z_INDEX_CUSTOM_LABELS } from '../layers/layerUtils.ts';
import { GeoAlt } from 'svelte-bootstrap-icons';
import { createClockButton, createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderIconConfigModal from './BuilderIconConfigModal.svelte';
import IconsHandler from './IconsHandler.svelte';

export const iconFeature: LayerFeatureDefinition<IconConfig> = {
  kind: 'icon',
  label: 'Icon Marker',
  icon: GeoAlt,
  defaultZIndex: Z_INDEX_CUSTOM_LABELS,
  isMultiItem: true,

  // A factory, not an array: the clock toggle's icon reflects the item's
  // current `animationClock`, so it has to be resolved per item.
  buttons: item => [createClockButton<IconConfig>(item),
    createEditButton<IconConfig>({ title: 'Edit icon marker' }),
    createDeleteButton<IconConfig>({ title: 'Delete icon marker' })
  ],

  createDefault({ maxZIndex, map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return {
      id: Date.now().toString(),
      cmid: 0,
      coords: [center.lng, center.lat],
      zIndex: maxZIndex
    };
  },

  interactivePlacement: {
    prompt: 'Click on the map to place the icon marker',
    onMapClick: (coords, item) => {
      item.coords = coords;
    }
  },

  getItems(options: DecodedObject): LayerItemDescriptor<IconConfig>[] {
    return (options.icons || []).map((item, idx) => {
      return {
        id: `icon-${item.id || item.cmid || idx}`,
        kind: 'icon',
        name: item.name || iconFeature.label,
        zIndex: item.zIndex ?? Z_INDEX_CUSTOM_LABELS + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<IconConfig>, newZIndex: number) {
    const entry = iconFeature.getItems(options).find(i => i.id === item.id)?.data;
    if (entry) entry.zIndex = newZIndex;
  },

  add(options: DecodedObject, item: IconConfig) {
    options.icons = [...(options.icons || []), item];
  },

  isValid(data: IconConfig) {
    return Boolean(data?.cmid && Number(data.cmid) > 0);
  },

  update(options: DecodedObject, descriptor: LayerItemDescriptor<IconConfig>, data: IconConfig) {
    if (options.icons) {
      options.icons = options.icons.map(item =>
        item === descriptor.data || (item.id && item.id === data.id) ? data : item
      );
    }
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<IconConfig>) {
    options.icons = (options.icons || []).filter(entry => entry !== item.data);
  },

  ConfigModal: BuilderIconConfigModal,
  MapRenderer: IconsHandler
};

export { default as IconHandler } from './IconHandler.svelte';
export { default as IconsHandler } from './IconsHandler.svelte';
export { default as BuilderIconConfigModal } from './BuilderIconConfigModal.svelte';
