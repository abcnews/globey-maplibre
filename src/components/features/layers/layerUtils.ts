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
