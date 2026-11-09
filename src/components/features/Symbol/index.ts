import type { LayerFeatureDefinition } from '../types.ts';
import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { GeoAlt } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../utils/buttonHelpers.ts';
import { hasLabel } from './label.ts';
import BuilderSymbolConfigModal from './BuilderSymbolConfigModal.svelte';
import SymbolHandler from './SymbolHandler.svelte';

export const symbolFeature: LayerFeatureDefinition<SymbolLayer> = {
  kind: 'symbol',
  label: 'Symbol Marker',
  icon: GeoAlt,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has coords.
  buttons: item => [
    ...(item.data?.coords
      ? [
          createGoToButton<SymbolLayer>({
            title: 'Go to symbol marker',
            getTarget: i => (i.data?.coords ? { type: 'point', coords: i.data.coords } : undefined)
          })
        ]
      : []),
    createEditButton<SymbolLayer>({ title: 'Edit symbol marker' }),
    createDeleteButton<SymbolLayer>({ title: 'Delete symbol marker' })
  ],

  createDefault({ map }) {
    const center = map?.getCenter() || { lng: 133.7751, lat: -25.2744 };
    return {
      id: newLayerId('symbol'),
      type: 'symbol',
      // A built-in symbol needs no upload, so a new marker is usable straight away.
      symbol: { name: 'circle', variant: 'fill', size: 18 },
      colour: 'blue',
      scheme: 'light',
      coords: [center.lng, center.lat]
    };
  },

  interactivePlacement: {
    prompt: 'Click on the map to place the symbol marker',
    onMapClick: (coords, item) => {
      item.coords = coords;
    }
  },

  // A marker needs a built-in symbol, an uploaded image or an annotation (the symbol may be hidden).
  isValid(data: SymbolLayer) {
    return Boolean(data?.symbol?.name || data?.image?.dataUri || hasLabel(data));
  },

  liveEdit: true,
  ConfigModal: BuilderSymbolConfigModal,
  LayerRenderer: SymbolHandler,
  coordsOf: item => item.coords
};
