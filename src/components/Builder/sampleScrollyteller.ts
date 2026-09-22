import type { GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';
import { isGeoJsonLayer, type GriddedLayer } from '../../lib/data/jsonBlob.ts';
import { generateSampleScrollyteller } from '../../lib/data/generateSampleScrollyteller.ts';
import { loadGrid } from '../features/Gridded/data/loadGrid.ts';
import { fetchGeoJsonData, getGeoJsonCoordinatePairs } from '../features/utils/geojson/data.ts';

/** Corner points of a gridded layer's file, which stores no bounds itself. */
async function griddedCorners(layer: GriddedLayer): Promise<[number, number][]> {
  const grid = await loadGrid(layer).catch(() => null);
  if (!grid) return [];
  const [west, south, east, north] = grid.bounds;
  return [
    [west, north],
    [east, south]
  ];
}

/**
 * Fetches each GeoJSON and gridded layer's data (neither stores bounds) so the sample story can
 * frame them, honouring each GeoJSON layer's `filter`. A failed fetch just leaves that layer unframed.
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
  const griddedEntries = await Promise.all(
    blob.layers
      .filter((layer): layer is GriddedLayer => layer.type === 'gridded')
      .map(async layer => [layer.id, await griddedCorners(layer)] as const)
  );
  return generateSampleScrollyteller({
    blob,
    extraPointsById: Object.fromEntries([...geoJsonEntries, ...griddedEntries])
  });
}
