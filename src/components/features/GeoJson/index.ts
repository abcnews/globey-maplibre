import type { LayerFeatureDefinition } from '../types.ts';
import type { GeoJsonLayer } from '../../../lib/data/jsonBlob.ts';
import { isValidUrl } from '../../../lib/data/layerHelpers.ts';
import { newLayerId } from '../layerOps.ts';
import { Map as MapIcon } from 'svelte-bootstrap-icons';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import BuilderGeoJsonConfigModal from './BuilderGeoJsonConfigModal.svelte';
import GeoJsonsHandler from './GeoJsonsHandler.svelte';
import { fetchGeoJsonData, getGeoJsonCoordinatePairs } from './utils.ts';

export const geoJsonFeature: LayerFeatureDefinition<GeoJsonLayer> = {
  kind: 'geojson',
  label: 'GeoJSON',
  icon: MapIcon,
  isMultiItem: true,

  // A factory, not an array: the goto button only appears once the item has a cmid/url.
  buttons: item => [
    ...(item.data?.cmid || item.data?.url
      ? [
          createGoToButton<GeoJsonLayer>({
            title: 'Go to GeoJSON layer',
            // GeoJSON is the one kind with no stored bounds, so this re-fetches on every click.
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
    createEditButton<GeoJsonLayer>({ title: 'Edit GeoJSON layer' }),
    createDeleteButton<GeoJsonLayer>({ title: 'Delete GeoJSON layer' })
  ],

  createDefault() {
    return {
      id: newLayerId('geojson'),
      type: 'geojson',
      geometryType: 'areas',
      colourMode: 'simple',
      isOpaque: false,
      lineAnimationStyle: 'fade'
    };
  },

  isValid(data: GeoJsonLayer) {
    const valid = Boolean((data?.cmid && Number(data.cmid) > 0) || (data?.url && isValidUrl(data.url)));
    if (!valid) {
      console.warn('[geoJsonFeature] isValid returned false for:', data);
    }
    return valid;
  },

  ConfigModal: BuilderGeoJsonConfigModal,
  MapRenderer: GeoJsonsHandler
};

export * from './utils.ts';
export * from './themes.ts';
