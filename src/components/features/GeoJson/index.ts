import type { LayerFeatureDefinition, LayerItemDescriptor } from '../types.ts';
import type { GeoJsonConfig, DecodedObject } from '../../../lib/marker';
import { isValidUrl } from '../../../lib/marker/utils.ts';
import { Z_INDEX_BASE_RASTER, Z_INDEX_BASE_VECTOR, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import BuilderGeoJsonConfigModal from './BuilderGeoJsonConfigModal.svelte';
import GeoJsonsHandler from './GeoJsonsHandler.svelte';
import { fetchGeoJsonData, getGeoJsonCoordinatePairs } from './utils.ts';

export const geoJsonFeature: LayerFeatureDefinition<GeoJsonConfig> = {
  kind: 'geojson',
  label: 'GeoJSON',
  icon: MapIcon,
  defaultZIndex: Z_INDEX_GEOJSON,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has a cmid/url.
  buttons: item => [
    ...(item.data?.cmid || item.data?.url
      ? [
          createGoToButton<GeoJsonConfig>({
            title: 'Go to GeoJSON layer',
            getTarget: async i => {
              if (!i.data?.cmid && !i.data?.url) return undefined;
              try {
                const geojson = await fetchGeoJsonData({ cmid: i.data.cmid, url: i.data.url });
                const bounds = getGeoJsonCoordinatePairs(geojson);
                return bounds.length ? { type: 'bounds', bounds } : undefined;
              } catch (err) {
                console.error('[geoJsonFeature] Go-to fetch failed:', err);
                return undefined;
              }
            }
          })
        ]
      : []),
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
      lineAnimationStyle: 'fade',
      zIndex: maxZIndex
    };
  },

  getItems(options: DecodedObject): LayerItemDescriptor<GeoJsonConfig>[] {
    const streetMapZ = options.streetMapZIndex ?? Z_INDEX_BASE_VECTOR;
    const rasterZs = (options.rasterLayers || []).map(r => r.zIndex ?? Z_INDEX_BASE_RASTER);
    const baseZ = Math.max(streetMapZ, ...rasterZs);

    return (options.geoJson || []).map((item, idx) => {
      return {
        id: `geojson-${item.id || item.cmid || item.url || idx}`,
        kind: 'geojson',
        name: item.name || geoJsonFeature.label,
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
