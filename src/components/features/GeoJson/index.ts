import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { GeoJsonConfig, DecodedObject } from '../../../lib/marker';
import { isValidUrl } from '../../../lib/marker/utils.ts';
import { Z_INDEX_BASE_RASTER, Z_INDEX_BASE_VECTOR, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createClockButton, createEditButton, createDeleteButton } from '../buttonHelpers.ts';
import BuilderGeoJsonConfigModal from './BuilderGeoJsonConfigModal.svelte';
import GeoJsonsHandler from './GeoJsonsHandler.svelte';

export const geoJsonFeature: LayerFeatureDefinition<GeoJsonConfig> = {
  kind: 'geojson',
  label: 'GeoJSON',
  icon: MapIcon,
  defaultZIndex: Z_INDEX_GEOJSON,
  isMultiItem: true,

  // A factory, not an array: the clock toggle's icon reflects the item's
  // current `animationClock`, so it has to be resolved per item.
  buttons: item => [createClockButton<GeoJsonConfig>(item),
    createEditButton<GeoJsonConfig>({ title: 'Edit GeoJSON layer' }),
    createDeleteButton<GeoJsonConfig>({ title: 'Delete GeoJSON layer' })
  ],

  createDefault({ maxZIndex }) {
    return {
      id: Date.now().toString(),
      type: 'areas',
      colourMode: 'simple',
      opacity: 1,
      isOpaque: false,
      zIndex: maxZIndex
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<GeoJsonConfig>[] {
    const streetMapZ = options.streetMapZIndex ?? Z_INDEX_BASE_VECTOR;
    const rasterZs = (options.rasterLayers || []).map(r => r.zIndex ?? Z_INDEX_BASE_RASTER);
    const baseZ = Math.max(streetMapZ, ...rasterZs);

    return (options.geoJson || []).map((item, idx) => {
      const typeStr = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'GeoJSON';
      const description = item.cmid ? `CMID: ${item.cmid}` : item.url ? item.url : 'No source';
      return {
        id: `geojson-${item.id || item.cmid || item.url || idx}`,
        kind: 'geojson',
        name: typeStr,
        description,
        zIndex: item.zIndex ?? baseZ + 1 + idx * 0.1,
        data: item
      };
    });
  },

  setZIndex(options: DecodedObject, item: LayerItemDescriptor<GeoJsonConfig>, newZIndex: number) {
    const entry = geoJsonFeature.getItems(options).find(i => i.id === item.id)?.data;
    if (entry) entry.zIndex = newZIndex;
  },

  add(options: DecodedObject, item: GeoJsonConfig) {
    console.log('[geoJsonFeature] Adding GeoJSON layer:', item);
    options.geoJson = [...(options.geoJson || []), item];
  },

  isValid(data: GeoJsonConfig) {
    const valid = Boolean((data?.cmid && Number(data.cmid) > 0) || (data?.url && isValidUrl(data.url)));
    if (!valid) {
      console.warn('[geoJsonFeature] isValid returned false for:', data);
    }
    return valid;
  },

  update(options: DecodedObject, descriptor: LayerItemDescriptor<GeoJsonConfig>, data: GeoJsonConfig) {
    console.log('[geoJsonFeature] Updating GeoJSON layer:', { descriptor, data });
    if (options.geoJson) {
      const targetId = descriptor.id?.replace(/^geojson-/, '') || descriptor.data?.id;
      options.geoJson = options.geoJson.map(item => {
        const matches =
          (targetId && item.id === targetId) ||
          (data.id && item.id === data.id) ||
          item === descriptor.data;
        return matches ? data : item;
      });
    }
  },

  delete(options: DecodedObject, item: LayerItemDescriptor<GeoJsonConfig>) {
    console.log('[geoJsonFeature] Deleting GeoJSON layer:', item);
    const targetId = item.id?.replace(/^geojson-/, '') || item.data?.id;
    options.geoJson = (options.geoJson || []).filter(entry => {
      if (targetId && entry.id) {
        return entry.id !== targetId;
      }
      return entry !== item.data;
    });
  },

  ConfigModal: BuilderGeoJsonConfigModal,
  MapRenderer: GeoJsonsHandler
};

export * from './utils.ts';
export * from './themes.ts';
export { default as GeoJsonHandler } from './GeoJsonHandler.svelte';
export { default as GeoJsonsHandler } from './GeoJsonsHandler.svelte';
export { default as BuilderGeoJsonConfigModal } from './BuilderGeoJsonConfigModal.svelte';
