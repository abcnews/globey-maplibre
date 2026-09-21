import type { LayerFeatureDefinition } from '../types.ts';
import type { RasterLayer } from '../../../lib/data/jsonBlob.ts';
import { newLayerId } from '../utils/layerOps.ts';
import { GlobeAsiaAustralia as RasterIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../utils/buttonHelpers.ts';
import BuilderRasterConfigModal from './BuilderRasterConfigModal.svelte';
import MapRastersHandler from './MapRastersHandler.svelte';

export const rasterFeature: LayerFeatureDefinition<RasterLayer> = {
  kind: 'raster',
  label: 'Raster Tile Layer',
  icon: RasterIcon,
  isMultiItem: true,

  // A factory, not an array: `bounds` is optional (unset = whole world), so the
  // goto button only appears once the layer actually has somewhere to fly to.
  buttons: item => [
    ...(item.data?.bounds?.length
      ? [
          createGoToButton<RasterLayer>({
            title: 'Go to raster layer',
            getTarget: i => (i.data?.bounds?.length ? { type: 'bounds', bounds: i.data.bounds } : undefined)
          })
        ]
      : []),
    createEditButton<RasterLayer>({ title: 'Edit raster layer' }),
    createDeleteButton<RasterLayer>({ title: 'Delete raster layer' })
  ],

  createDefault() {
    return {
      id: newLayerId('raster'),
      type: 'raster',
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      tileSize: 256,
      attribution: 'NASA Blue Marble',
      darkTheme: true
    };
  },

  isValid(data: RasterLayer) {
    return Boolean(data?.url);
  },

  ConfigModal: BuilderRasterConfigModal,
  MapRenderer: MapRastersHandler
};
