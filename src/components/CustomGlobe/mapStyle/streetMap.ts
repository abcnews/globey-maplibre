import type { maplibregl } from '../../mapLibre/index';
import styleSource from './style.json';

// We clone the style source to avoid mutating the original import
const getBaseStyle = () => JSON.parse(JSON.stringify(styleSource)) as maplibregl.StyleSpecification;

/**
 * @file OpenMapTiles Street Style
 *
 * Sources: openmaptiles
 *
 * @property {string} name - Local name
 * @property {string} name:en - English name
 * @property {string} name:latin - Latin script name
 * @property {string} class - Feature class (e.g. city, town, country)
 * @property {number} rank - Importance rank
 * @property {string} capital - Capital status
 * @property {string} iso_a2 - ISO country code
 */

/**
 * MapLibre style definition, based on Andrew Kesper's "bright" base map.
 *
 * @see https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/style.json
 */
export default function mapStyle(): maplibregl.StyleSpecification {
  const style = getBaseStyle();
  // REWRITE STYLE TO MATCH DATAWRAPPER
  const LAND = '#EDF0F2';
  const OCEAN = '#AFCCDB';
  const DARK_OCEAN = '#a2bbc9';
  const TEXT = '#5B687C';
  const TEXT_HALO = '#FFF';

  // We map the layers to a new array to avoid mutating the original import if called multiple times,
  // though TypeScript's import of JSON is usually a fresh object per call in some environments,
  // but better to be safe.
  style.layers = style.layers
    .filter(layer => {
      return layer.id !== 'boundary-water' && !layer.id.includes('boundary-');
    })
    .map(layer => {
      // LAND
      if (layer.id === 'background' && layer.type === 'background') {
        layer.paint = {
          ...layer.paint,
          'background-color': LAND
        };
      }

      // WATER
      if (layer.type === 'fill') {
        if (layer.paint?.['fill-color'] === 'hsl(210, 67%, 85%)') {
          layer.paint['fill-color'] = OCEAN;
        }
        if (layer.paint?.['fill-color'] === '#a0c8f0') {
          layer.paint['fill-color'] = DARK_OCEAN;
        }
      }
      if (layer.type === 'line') {
        if (layer.paint?.['line-color'] === '#a0c8f0') {
          layer.paint['line-color'] = DARK_OCEAN;
        }
      }

      // Set default visibility for PLACE LABELS and use English names where possible.
      if (layer.type === 'symbol' && (layer.layout?.['text-font'] || layer.layout?.['text-field'])) {
        const nameFallback = ['coalesce', ['get', 'name_en'], ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];

        layer.layout = {
          ...layer.layout,
          visibility: 'none',
          'text-font': ['ABC Sans Regular'],
          'text-letter-spacing': 0.36,
          'text-transform': 'uppercase',
          'text-field': [
            'case',
            // We prioritize ASCII-safe names for countries using their ISO codes to avoid missing glyphs.
            // If it's a country, try to use a safe ASCII name based on ISO code
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
        } as any;
        layer.paint = {
          ...layer.paint,
          'text-color': TEXT,
          'text-halo-color': TEXT_HALO,
          'text-halo-width': 1.2
        };
      }

      // ROAD STYLES
      if (layer.id.includes('highway')) {
        if (layer.id.includes('casing')) {
          layer.paint = {
            ...layer.paint,
            'line-color': {
              stops: [
                [12, '#BDBDBD'],
                [12.5, '#E1E4E5']
              ]
            }
          } as any;
        } else if (layer.paint && 'line-color' in layer.paint) {
          layer.paint['line-color'] = '#fff';
        }
      }

      return layer;
    });

  return style;
}
