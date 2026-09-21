import type * as maplibregl from 'maplibre-gl';
import type { ImageLayer, GeoJsonLayer } from '../../../lib/data/jsonBlob.ts';

export * from './layerManager.ts';

/**
 * Generates a stable ID for GeoJSON sources based on the ID or CMID.
 */
export function generateGeoJsonSourceId(idOrCmid: number | string | undefined): string {
  if (!idOrCmid) return 'none';
  return `gj-${idOrCmid}`;
}

/**
 * Returns the layer IDs associated with a GeoJsonLayer.
 */
export function getGeoJsonLayerIds(config: GeoJsonLayer): string[] {
  const sourceId = generateGeoJsonSourceId(config.id);
  switch (config.geometryType) {
    case 'areas':
      return [`${sourceId}-fill`, `${sourceId}-outline`];
    case 'lines':
      return [`${sourceId}-line`, `${sourceId}-line-outline`];
    case 'points':
      return [`${sourceId}-circle`];
    default:
      return [];
  }
}

/**
 * Returns the layer ID associated with an ImageLayer.
 */
export function getImageLayerId(config: ImageLayer): string {
  return `image-layer-${config.id}`;
}

/**
 * Generates a source ID for an icon.
 */
export function getIconSourceId(idOrCmid: number | string | undefined): string {
  return `icon-source-${idOrCmid || 'unknown'}`;
}

/**
 * Generates a layer ID for an icon symbol layer.
 */
export function getIconLayerId(idOrCmid: number | string | undefined): string {
  return `icon-layer-${idOrCmid || 'unknown'}`;
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
  // If we want [A, B] below [LabelItem], we move B below LabelItem, then A below LabelItem.
  // Result: [LabelItem, A, B]
  for (let i = layerIds.length - 1; i >= 0; i--) {
    const lid = layerIds[i];
    if (map.getLayer(lid)) {
      map.moveLayer(lid, beforeId);
    }
  }
}
