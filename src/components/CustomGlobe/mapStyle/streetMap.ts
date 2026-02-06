import type { maplibregl } from '../../mapLibre/index';
import styleSource from './styleStoryLabLight.json';

export const OPENMAPTILES_SOURCE_ID = 'openmaptiles';
const MAP_LAYERS = {
  "openmaptiles": "https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-world/world.json",
  "sprite": "https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite",
  "glyphs": "https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf",
}
export const OPENMAPTILES_SOURCE_DEF = {
  type: 'vector',
  url: MAP_LAYERS.openmaptiles
};

  // Update our asset URLs
styleSource.sources.openmaptiles.url = MAP_LAYERS.openmaptiles;
styleSource.sprite = MAP_LAYERS.sprite;
styleSource.glyphs = MAP_LAYERS.glyphs;

// remove heightmaps and "Individual countries" sample layers.
// styleSource.sources.IndividualCountries has been deleted because it's massive and doesn't work
styleSource.layers = styleSource.layers.filter(layer => ['terrarium', 'natural_earth_shading'].includes(layer.id) == false && ['IndividualCountries'].includes(layer.source) === false)
  

// We clone the style source to avoid mutating the original import
export const getBaseStyleSource = () => {
  const style = JSON.parse(JSON.stringify(styleSource));
  return style as maplibregl.StyleSpecification;
}

/**
 * OpenMapTiles Street Style components
 */

export function getProcessedLayers(): maplibregl.LayerSpecification[] {
  const style = getBaseStyleSource();

  return style.layers
    .map(layer => {
      // Set default visibility for PLACE LABELS and use English names where possible.
      if (layer.type === 'symbol' && (layer.layout?.['text-font'] || layer.layout?.['text-field'])) {
        const nameFallback = ['coalesce', ['get', 'name_en'], ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
        layer.layout['text-field'] =  [
            'case',
            // We prioritize ASCII-safe names for countries using their ISO codes to avoid missing glyphs.
            ['==', ['get', 'class'], 'country'],
            [
              'match',
              ['get', 'iso_a2'],
              'WS', 'Samoa',
              'CI', "Cote d'Ivoire",
              'ST', 'Sao Tome and Principe',
              'CW', 'Curacao',
              'RE', 'Reunion',
              'BJ', 'Benin',
              nameFallback
            ],
            // For everything else, use the standard fallback
            nameFallback
          ]
      }

      return layer;
    });
}

export function getStreetBaseLayers(): maplibregl.LayerSpecification[] {
  return getProcessedLayers().filter(l => l.type !== 'symbol' && l.id !== 'background');
}

const SATELLITE_TEXT = '#FFF';
const SATELLITE_TEXT_HALO = 'rgba(0,0,0,0.8)';
/** Get a modified style for the countries layer/satellite layer */
export function getLabelLayers(isSatellite = false): maplibregl.LayerSpecification[] {
  const layers = getProcessedLayers().filter(l => l.type === 'symbol');
  if (isSatellite) {
    return layers.map(layer => {
      const l = JSON.parse(JSON.stringify(layer));
      if (l.paint) {
        l.paint['text-color'] = SATELLITE_TEXT;
        l.paint['text-halo-color'] = SATELLITE_TEXT_HALO;
      }
      return l;
    });
  }
  return layers;
}

export default function mapStyle(): maplibregl.StyleSpecification {
  const style = getBaseStyleSource();
  style.layers = getProcessedLayers();
  return style;
}
