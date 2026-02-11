import type { maplibregl } from '../../mapLibre/index';
import type { ImageSourceConfig, GeoJsonConfig } from '../../../../../interactive-globey-maplibre/src/lib/marker';

/**
 * Generates a stable ID for GeoJSON sources based on the URL.
 */
export function generateGeoJsonSourceId(url: string): string {
  if (!url) return 'none';
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `gj-${Math.abs(hash).toString(36)}`;
}

/**
 * Returns the layer IDs associated with a GeoJsonConfig.
 */
export function getGeoJsonLayerIds(config: GeoJsonConfig): string[] {
  const sourceId = generateGeoJsonSourceId(config.url);
  switch (config.type) {
    case 'areas':
      return [`${sourceId}-fill`, `${sourceId}-outline`];
    case 'lines':
      return [`${sourceId}-line`];
    case 'points':
      return [`${sourceId}-circle`];
    case 'spikes':
      return [`${sourceId}-spike`];
    default:
      return [];
  }
}

/**
 * Returns the layer ID associated with an ImageSourceConfig.
 */
export function getImageLayerId(config: ImageSourceConfig): string {
  return `image-layer-${config.id}`;
}

/**
 * Finds the ID of the first label (symbol) layer in the map's style.
 */
export function getLabelAnchor(map: maplibregl.Map): string | undefined {
  const style = map.getStyle();
  if (!style || !style.layers) return undefined;
  const labelLayer = style.layers.find(l => l.type === 'symbol');
  return labelLayer?.id;
}

/**
 * Reorders a set of layers to be just below a reference layer.
 * Items in layerIds are stacked Top-to-Bottom (first ID is topmost).
 */
export function stackLayers(map: maplibregl.Map, layerIds: string[], beforeId?: string) {
  if (!map) return;

  // We iterate backwards through the IDs because moveLayer(id, beforeId)
  // places 'id' directly below 'beforeId'.
  // If we want [A, B] below [Label], we move B below Label, then A below Label.
  // Result: [Label, A, B]
  for (let i = layerIds.length - 1; i >= 0; i--) {
    const lid = layerIds[i];
    if (map.getLayer(lid)) {
      map.moveLayer(lid, beforeId);
    }
  }
}
