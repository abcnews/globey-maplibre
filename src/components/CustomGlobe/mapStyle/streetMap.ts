import _styleSource from './styleStoryLab.json';
import { getStyleColor } from './utils';
//@ts-ignore
export const styleSource = _styleSource as maplibregl.StyleSpecification;

export const OPENMAPTILES_SOURCE_ID = 'openmaptiles';
export const OPENMAPTILES_SOURCE_DEF = styleSource.sources.openmaptiles;

// We clone the style source to avoid mutating the original import
export const getBaseStyleSource = () => {
  const style = JSON.parse(JSON.stringify(styleSource));
  return style as maplibregl.StyleSpecification;
};

export function getProcessedLayers(): maplibregl.LayerSpecification[] {
  const style = getBaseStyleSource();

  return style.layers.map(layer => {
    // Set default visibility for PLACE LABELS and use English names where possible.
    if (layer.type === 'symbol' && (layer.layout?.['text-font'] || layer.layout?.['text-field'])) {
      const nameFallback = ['coalesce', ['get', 'name_en'], ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name']];
      layer.layout['text-field'] = [
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
          //@ts-ignore
          nameFallback
        ],
        // For everything else, use the standard fallback
        //@ts-ignore
        nameFallback
      ];
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

export function getThemeColors() {
  const style = getBaseStyleSource();
  return {
    land: getStyleColor(style, 'background', 'background-color', '#F5F5F5'),
    ocean: getStyleColor(style, 'water', 'fill-color', '#CFDBED'),
    // These are currently hardcoded in the highlights but we'll export them here too
    // so we have a single place to change them.
    highlightPrimary: '#b9a0ce',
    highlightSecondary: '#8ad1e8'
  };
}

export default function mapStyle(): maplibregl.StyleSpecification {
  const style = getBaseStyleSource();
  style.layers = getProcessedLayers();
  return style;
}
