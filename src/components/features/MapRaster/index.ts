import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { DecodedObject, RasterLayerConfig } from '../../../lib/marker/types.ts';
import { Z_INDEX_BASE_RASTER } from '../layers/layerUtils.ts';
import { GlobeAsiaAustralia as RasterIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import BuilderRasterConfigModal from './BuilderRasterConfigModal.svelte';
import MapRastersHandler from './MapRastersHandler.svelte';

export const rasterFeature: LayerFeatureDefinition<RasterLayerConfig> = {
  kind: 'raster',
  label: 'Raster Tile Layer',
  icon: RasterIcon,
  defaultZIndex: Z_INDEX_BASE_RASTER,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has bounds.
  buttons: item => [
    ...(item.data?.bounds?.length
      ? [
          createGoToButton<RasterLayerConfig>({
            title: 'Go to raster layer',
            getTarget: i => (i.data?.bounds?.length ? { type: 'bounds', bounds: i.data.bounds } : undefined)
          })
        ]
      : []),
    createEditButton<RasterLayerConfig>({ title: 'Edit raster layer' }),
    createDeleteButton<RasterLayerConfig>({ title: 'Delete raster layer' })
  ],

  createDefault({ maxZIndex }) {
    return {
      id: Date.now().toString(),
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      tileSize: 256,
      attribution: 'NASA Blue Marble',
      darkTheme: true,
      zIndex: maxZIndex
    } as any;
  },

  getItems(options: DecodedObject): LayerItemDescriptor<RasterLayerConfig>[] {
    return (options.rasterLayers || []).map((item, idx) => {
      return {
        id: (item as any).id || (item.url ? `raster-${btoa(item.url).replace(/=/g, '').slice(-8)}` : `raster-${idx}`),
        kind: 'raster',
        name: item.name || rasterFeature.label,
        zIndex: item.zIndex ?? Z_INDEX_BASE_RASTER + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<RasterLayerConfig>, newZIndex: number) {
    const entry = rasterFeature.getItems(options).find(i => i.id === item.id)?.data;
    if (entry) entry.zIndex = newZIndex;
  },

  add(options: DecodedObject, item: RasterLayerConfig) {
    options.rasterLayers = [...(options.rasterLayers || []), item];
  },

  isValid(data: RasterLayerConfig) {
    return Boolean(data?.url);
  },

  update(options: DecodedObject, descriptor: LayerItemDescriptor<RasterLayerConfig>, data: RasterLayerConfig) {
    if (options.rasterLayers) {
      options.rasterLayers = options.rasterLayers.map(item =>
        item === descriptor.data || ((item as any).id && (item as any).id === (data as any).id) ? data : item
      );
    }
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<RasterLayerConfig>) {
    options.rasterLayers = (options.rasterLayers || []).filter(entry => entry !== item.data);
  },


  ConfigModal: BuilderRasterConfigModal,
  MapRenderer: MapRastersHandler
};

export { default as MapRasterHandler } from './MapRasterHandler.svelte';
export { default as MapRastersHandler } from './MapRastersHandler.svelte';
export { default as BuilderRasterConfigModal } from './BuilderRasterConfigModal.svelte';
