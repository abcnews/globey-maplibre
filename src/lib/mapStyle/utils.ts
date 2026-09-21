import type * as maplibregl from 'maplibre-gl';

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
const BASE_LAYERS: Record<string, BaseLayerConfig> = {
  street: { id: 'street', theme: 'light' },
  dark: { id: 'dark', theme: 'dark' }
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
