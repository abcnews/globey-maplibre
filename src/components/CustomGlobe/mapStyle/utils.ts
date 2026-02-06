import type { maplibregl } from '../../mapLibre/index';

const OPENMAPTILES_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-world/world.json';
const SPRITE_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite';
const GLYPHS_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf';

const EXCLUDED_LAYER_IDS = ['terrarium', 'natural_earth_shading'];
const EXCLUDED_SOURCES = ['IndividualCountries'];

/**
 * Simple helper to extract a color (or other paint property) from a style layer.
 * Returns the first found property if multiple stops are defined, or the literal value.
 */
export function getStyleColor(style: maplibregl.StyleSpecification, layerId: string, property: string = 'fill-color', fallback: string = '#ccc'): string {
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

/**
 * Patch a style with the ABC sources. Remove any problematic bits from the design process.
 * Do this on the fly because it's easier to update from Maputnik.
 */
export function patchStyleWithABCSources(styleSource: maplibregl.StyleSpecification): maplibregl.StyleSpecification {
  // Update our asset URLs
  // @ts-ignore
  styleSource.sources.openmaptiles.url = OPENMAPTILES_URL;

  styleSource.sprite = SPRITE_URL;
  styleSource.glyphs = GLYPHS_URL;

  // Filter out unwanted layers (e.g. heightmaps and large sample layers)
  // IndividualCountries is removed because it's too large and unnecessary for this globe configuration
  styleSource.layers = styleSource.layers.filter(layer =>
    !EXCLUDED_LAYER_IDS.includes(layer.id) &&
    // @ts-ignore
    !EXCLUDED_SOURCES.includes(layer.source as string)
  );

  return styleSource;
}