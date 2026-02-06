import type { maplibregl } from '../../mapLibre/index';

const OPENMAPTILES_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-world/world.json';
const SPRITE_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite';
const GLYPHS_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf';

const EXCLUDED_LAYER_IDS = ['terrarium', 'natural_earth_shading'];
const EXCLUDED_SOURCES = ['IndividualCountries'];

/**
 * Patch a style with the ABC sources. Remove any problematic bits from the design process.
 * Do this on the fly because it's easier to update from Maputnik.
 */
export function patchStyleWithABCSources(styleSource: maplibregl.StyleSpecification): maplibregl.StyleSpecification {
  // Update our asset URLs
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