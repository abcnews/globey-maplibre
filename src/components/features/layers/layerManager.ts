import type { Map as MapLibreMap, AddLayerObject, CustomLayerInterface } from 'maplibre-gl';

export {
  Z_INDEX_BASE_RASTER,
  Z_INDEX_BASE_VECTOR,
  Z_INDEX_IMAGE_LAYERS,
  Z_INDEX_GEOJSON,
  Z_INDEX_BASE_LABELS,
  Z_INDEX_CUSTOM_LABELS,
  Z_INDEX_UI_OVERLAYS,
  SUB_LAYER_OUTLINE_OFFSET
} from '../../../lib/zIndex.ts';

/**
 * Registry mapping Map instance -> Map<layerId, zIndex>.
 * Using WeakMap ensures layer registries are automatically garbage-collected when the map is destroyed.
 */
const layerRegistry = new WeakMap<MapLibreMap, Map<string, number>>();

/**
 * Retrieves the internal layer-to-z-index map for a specific MapLibre instance.
 */
function getMapRegistry(map: MapLibreMap): Map<string, number> {
  let mapLayers = layerRegistry.get(map);
  if (!mapLayers) {
    mapLayers = new Map<string, number>();
    layerRegistry.set(map, mapLayers);
  }
  return mapLayers;
}

/**
 * Retrieves the registered Z-Index for a given layer ID on a map.
 * Returns undefined if the layer is not tracked in the Z-Index registry.
 *
 * @param map MapLibre Map instance
 * @param layerId The ID of the layer
 */
export function getLayerZIndex(map: MapLibreMap, layerId: string): number | undefined {
  if (!map) return undefined;
  return getMapRegistry(map).get(layerId);
}

/**
 * Finds the closest MapLibre `beforeId` layer for a target Z-Index.
 *
 * Scans the active layers in the map's style array from bottom to top and returns
 * the first layer ID whose registered Z-Index is strictly greater than `targetZIndex`.
 * Layers without a registered Z-Index are ignored in the calculation.
 *
 * @param map MapLibre Map instance
 * @param targetZIndex The desired Z-Index for the incoming or moved layer
 * @returns The ID of the layer to insert before, or undefined if it should be placed at the top
 */
export function findBeforeIdForZIndex(map: MapLibreMap, targetZIndex: number): string | undefined {
  if (!map) return undefined;
  const style = map.getStyle();
  if (!style?.layers) return undefined;

  const registry = getMapRegistry(map);

  // MapLibre style.layers is ordered from index 0 (bottom) to N-1 (top).
  // Find the first layer with registered zIndex > targetZIndex.
  const targetLayer = style.layers.find(layer => {
    const registeredZ = registry.get(layer.id);
    return registeredZ !== undefined && registeredZ > targetZIndex;
  });

  return targetLayer?.id;
}

/**
 * Adds a layer to the map using a Z-Index to calculate stable visual placement.
 *
 * z-indexes work similarly to CSS in that A layer with a higher z-index appears
 * above a layer with a lower z-index. This is a numerical comparison so you may
 * use floating points.
 *
 * @param map MapLibre Map instance
 * @param layer The layer specification or custom layer object to add
 * @param zIndex Optional numeric Z-Index for stable stacking
 * @param fallbackBeforeId Optional beforeId to use when no higher Z-Index layer is found
 */
export function addLayerWithZIndex(
  map: MapLibreMap,
  layer: AddLayerObject | CustomLayerInterface,
  zIndex?: number,
  fallbackBeforeId?: string
): void {
  if (!map || !layer?.id) return;

  // If the layer is already added, avoid adding it again
  if (map.getLayer(layer.id)) return;

  const registry = getMapRegistry(map);

  let beforeId: string | undefined = fallbackBeforeId;

  if (zIndex !== undefined) {
    registry.set(layer.id, zIndex);
    const calculatedBeforeId = findBeforeIdForZIndex(map, zIndex);
    beforeId = calculatedBeforeId ?? fallbackBeforeId;
  }

  // Ensure target beforeId actually exists in the map style before passing
  const validBeforeId = beforeId && map.getLayer(beforeId) ? beforeId : undefined;

  map.addLayer(layer as any, validBeforeId);
}

/**
 * Updates the Z-Index of an existing layer and moves it to its new calculated position.
 *
 * @param map MapLibre Map instance
 * @param layerId The ID of the existing layer to reorder
 * @param zIndex The new numeric Z-Index
 */
export function setLayerZIndex(map: MapLibreMap, layerId: string, zIndex: number): void {
  if (!map || !layerId || !map.getLayer(layerId)) return;

  const registry = getMapRegistry(map);
  registry.set(layerId, zIndex);

  const beforeId = findBeforeIdForZIndex(map, zIndex);
  const validBeforeId = beforeId && map.getLayer(beforeId) ? beforeId : undefined;

  if (validBeforeId === layerId) return;

  map.moveLayer(layerId, validBeforeId);
}

/**
 * Updates the Z-Index for a collection of layers as a cohesive unit.
 *
 * First updates all layer Z-Indices in the registry to prevent sibling layers from
 * intercepting each other in `findBeforeIdForZIndex`, then moves each layer in order.
 */
export function setLayersZIndex(map: MapLibreMap, layerIds: string[], baseZIndex: number, step = 0.0001): void {
  if (!map || !layerIds?.length) return;

  const registry = getMapRegistry(map);

  // 1. Update all registry entries first
  layerIds.forEach((id, idx) => {
    registry.set(id, baseZIndex + idx * step);
  });

  // 2. Move each layer in order to its calculated position
  layerIds.forEach((id, idx) => {
    if (!map.getLayer(id)) return;
    const targetZ = baseZIndex + idx * step;
    const beforeId = findBeforeIdForZIndex(map, targetZ);
    const validBeforeId = beforeId && map.getLayer(beforeId) ? beforeId : undefined;
    if (validBeforeId !== id) {
      map.moveLayer(id, validBeforeId);
    }
  });
}

/**
 * Removes a layer from the map and deregisters its Z-Index.
 *
 * @param map MapLibre Map instance
 * @param layerId The ID of the layer to remove
 */
export function removeLayerWithZIndex(map: MapLibreMap, layerId: string): void {
  if (!map || !layerId) return;

  const registry = getMapRegistry(map);
  registry.delete(layerId);

  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
}
