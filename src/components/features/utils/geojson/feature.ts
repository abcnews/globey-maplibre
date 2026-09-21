import type { GeoJsonAnyLayer } from '../../../../lib/data/jsonBlob.ts';
import { isValidUrl } from '../../../../lib/data/layerHelpers.ts';
import type { LayerItemDescriptor, LayerButton } from '../../types.ts';
import { createEditButton, createDeleteButton, createGoToButton } from '../buttonHelpers.ts';
import { fetchGeoJsonData, getGeoJsonCoordinatePairs } from './data.ts';

/** A GeoJSON layer is valid once it has a positive CMID or an allowed URL. */
export function hasValidGeoJsonSource(data: GeoJsonAnyLayer): boolean {
  return Boolean((data?.cmid && Number(data.cmid) > 0) || (data?.url && isValidUrl(data.url)));
}

/**
 * Layer-list buttons shared by Areas/Lines/Points. A factory, not an array: the go-to button
 * only appears once the item has a cmid/url. GeoJSON has no stored bounds, so go-to re-fetches
 * the data and recomputes them on every click.
 */
export function geoJsonLayerButtons<T extends GeoJsonAnyLayer>(label: string) {
  return (item: LayerItemDescriptor<T>): LayerButton<T>[] => [
    ...(item.data?.cmid || item.data?.url
      ? [
          createGoToButton<T>({
            title: `Go to ${label} layer`,
            getTarget: async ({ data }) => {
              if (!data?.cmid && !data?.url) return undefined;
              const geojson = await fetchGeoJsonData({ cmid: data.cmid, url: data.url }).catch(err => {
                console.error('[geoJsonLayerButtons] Go-to fetch failed:', err);
              });
              const bounds = geojson ? getGeoJsonCoordinatePairs(geojson) : [];
              return bounds.length ? { type: 'bounds', bounds } : undefined;
            }
          })
        ]
      : []),
    createEditButton<T>({ title: `Edit ${label} layer` }),
    createDeleteButton<T>({ title: `Delete ${label} layer` })
  ];
}
