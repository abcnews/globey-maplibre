import type { maplibregl } from '../../mapLibre/index';
import styleSource from './style.json';

// We clone the style source to avoid mutating the original import
export const getBaseStyleSource = () => JSON.parse(JSON.stringify(styleSource)) as maplibregl.StyleSpecification;

export const OPENMAPTILES_SOURCE_ID = 'openmaptiles';
export const OPENMAPTILES_SOURCE_DEF = styleSource.sources.openmaptiles;

const LAND = '#EDF0F2';
const OCEAN = '#AFCCDB';
const DARK_OCEAN = '#a2bbc9';
const STREET_TEXT = '#5B687C';
const STREET_TEXT_HALO = '#FFF';
const SATELLITE_TEXT = '#FFF';
const SATELLITE_TEXT_HALO = 'rgba(0,0,0,0.8)';

/**
 * OpenMapTiles Street Style components
 */

export function getProcessedLayers(): maplibregl.LayerSpecification[] {
  const style = getBaseStyleSource();
  return style.layers
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
          'text-color': STREET_TEXT,
          'text-halo-color': STREET_TEXT_HALO,
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
}

export function getStreetBaseLayers(): maplibregl.LayerSpecification[] {
  return getProcessedLayers().filter(l => l.type !== 'symbol' && l.id !== 'background');
}

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
