import type { GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';
import { isGeoJsonLayer } from '../../lib/data/jsonBlob.ts';
import { generateSampleScrollyteller } from '../../lib/data/generateSampleScrollyteller.ts';
import { fetchGeoJsonData, getGeoJsonCoordinatePairs } from '../features/utils/geojson/data.ts';

/**
 * Fetches each GeoJSON layer's data (GeoJSON layers store no bounds) so the sample story can
 * frame them, honouring each layer's `filter`. A failed fetch just leaves that layer unframed.
 */
export async function buildSampleScrollyteller(blob: GlobeJsonBlob): Promise<string> {
  const geoJsonEntries = await Promise.all(
    blob.layers.filter(isGeoJsonLayer).map(async layer => {
      const data = await fetchGeoJsonData(layer).catch(() => null);
      const features: any[] = data?.type === 'FeatureCollection' ? data.features : data ? [data] : [];
      const { prop, values } = layer.filter ?? {};
      const matching = prop && values?.length ? features.filter(f => values.includes(f.properties?.[prop])) : features;
      return [layer.id, getGeoJsonCoordinatePairs({ type: 'FeatureCollection', features: matching })] as const;
    })
  );
  return generateSampleScrollyteller({ blob, extraPointsById: Object.fromEntries(geoJsonEntries) });
}
