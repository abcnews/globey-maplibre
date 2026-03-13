import type { maplibregl } from '../../mapLibre/index';

/**
 * Base layer configuration to define theme and other properties.
 */
export interface BaseLayerConfig {
  id: string;
  theme: 'light' | 'dark';
}

/**
 * Standardized base layer definitions.
 */
export const BASE_LAYERS: Record<string, BaseLayerConfig> = {
  street: { id: 'street', theme: 'light' },
  countries: { id: 'countries', theme: 'light' },
  satellite: { id: 'satellite', theme: 'dark' }
};

/**
 * Determines if a base layer is dark.
 */
export function isDarkBase(baseId: string): boolean {
  return BASE_LAYERS[baseId]?.theme === 'dark';
}

/**
 * Escapes HTML characters using native DOM methods to prevent injection.
 */
export function escapeHTML(str: string): string {
  if (!str) return str;
  const el = document.createElement('span');
  el.textContent = str.trim();
  return el.innerHTML;
}

/**
 * Determines if a base layer uses OpenStreetMap data.
 */
export function isOsmBase(baseId?: string): boolean {
  return baseId === 'street' || !baseId;
}

/**
 * Simple helper to extract a color (or other paint property) from a style layer.
 * Returns the first found property if multiple stops are defined, or the literal value.
 */
export function getStyleColor(
  style: maplibregl.StyleSpecification,
  layerId: string,
  property: string = 'fill-color',
  fallback: string = '#ccc'
): string {
  const layer = style.layers?.find(l => l.id === layerId);
  if (!layer || !layer.paint) return fallback;

  const value = (layer.paint as any)[property];
  if (!value) return fallback;

  // Handle MapLibre style expressions/stops if necessary
  // For now, if it's an object with stops, return the first stop's value
  // If it's a simple string, return it.
  if (typeof value === 'object' && value.stops) {
    return value.stops[0][1];
  }

  // Handle case where it might be a color expression like ['rgba', ...]
  if (Array.isArray(value)) {
    // If it's a match/case/etc, this is getting complex, but we want a simple fallback
    return fallback;
  }

  return value as string;
}
