import type { maplibregl } from '../../mapLibre/index';
import styleSource from './style.json';

const getBaseStyle = () => JSON.parse(JSON.stringify(styleSource)) as maplibregl.StyleSpecification;

/**
 * Satellite Style
 * Uses Blue Marble raster tiles and keeps vector labels from OpenMapTiles
 */
export default function satelliteStyle(): maplibregl.StyleSpecification {
  const style = getBaseStyle();
  const TEXT = '#FFF';
  const TEXT_HALO = 'rgba(0,0,0,0.8)';

  style.layers = style.layers
    .filter(layer => {
      // Keep symbols for labels and background as a fallback
      return layer.type === 'symbol' || layer.id === 'background';
    })
    .map(layer => {
      // Background
      if (layer.id === 'background' && layer.type === 'background') {
        layer.paint = {
          ...layer.paint,
          'background-color': '#000'
        };
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
              'WS',
              'Samoa',
              'CI',
              "Cote d'Ivoire",
              'ST',
              'Sao Tome and Principe',
              'CW',
              'Curacao',
              'RE',
              'Reunion',
              'BJ',
              'Benin',
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

      return layer;
    });

  return style;
}
