import type * as maplibregl from 'maplibre-gl';
import type { ImageLayer } from '../../../lib/data/jsonBlob.ts';

export * from './layerManager.ts';

/**
 * Generates a stable ID for GeoJSON sources based on the ID or CMID.
 */
export function generateGeoJsonSourceId(idOrCmid: number | string | undefined): string {
  if (!idOrCmid) return 'none';
  return `gj-${idOrCmid}`;
}

/**
 * Generates a source ID for a symbol marker.
 */
export function getSymbolSourceId(idOrCmid: number | string | undefined): string {
  return `symbol-source-${idOrCmid || 'unknown'}`;
}

/**
 * Generates a layer ID for a symbol marker's MapLibre symbol layer.
 */
export function getSymbolLayerId(idOrCmid: number | string | undefined): string {
  return `symbol-layer-${idOrCmid || 'unknown'}`;
}
