import type { LayerFeatureDefinition } from '../types.ts';
import type { IconLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../layerOps.ts';
import { GeoAlt } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import BuilderIconConfigModal from './BuilderIconConfigModal.svelte';
import IconsHandler from './IconsHandler.svelte';

export const iconFeature: LayerFeatureDefinition<IconLayer> = {
  kind: 'icon',
  label: 'Icon Marker',
  icon: GeoAlt,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has coords.
  buttons: item => [
    ...(item.data?.coords
      ? [
          createGoToButton<IconLayer>({
            title: 'Go to icon marker',
            getTarget: i => (i.data?.coords ? { type: 'point', coords: i.data.coords } : undefined)
          })
        ]
      : []),
    createEditButton<IconLayer>({ title: 'Edit icon marker' }),
    createDeleteButton<IconLayer>({ title: 'Delete icon marker' })
  ],

  createDefault({ map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return {
      id: newLayerId('icon'),
      type: 'icon',
      cmid: 0,
      coords: [center.lng, center.lat]
    };
  },

  interactivePlacement: {
    prompt: 'Click on the map to place the icon marker',
    onMapClick: (coords, item) => {
      item.coords = coords;
    }
  },

  isValid(data: IconLayer) {
    return Boolean(data?.cmid && Number(data.cmid) > 0);
  },

  ConfigModal: BuilderIconConfigModal,
  MapRenderer: IconsHandler
};

export { default as IconHandler } from './IconHandler.svelte';
export { default as IconsHandler } from './IconsHandler.svelte';
export { default as BuilderIconConfigModal } from './BuilderIconConfigModal.svelte';
