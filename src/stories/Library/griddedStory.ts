import { encodeMarker, type MarkerConfig } from '../../lib/data/marker.ts';
import { MARKER_NAME } from '../../lib/constants.ts';
import { parseGlobeJsonBlob, type GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';

const WORLD: [number, number][] = [
  [-160, 65],
  [160, -65]
];

const INDONESIA: [number, number][] = [
  [95, 8],
  [141, -11]
];

export const griddedStoryBlob: GlobeJsonBlob = parseGlobeJsonBlob({
  title: 'Gridded Scrollyteller',
  map: {
    projection: 'globe',
    base: 'street',
    coords: [134, -20],
    z: 2
  },
  layers: [
    {
      id: 'sstanomaly',
      type: 'gridded',
      url: '/ee-sst-anomaly-month-1.tif',
      colourConfig: { paletteType: 'divergent', paletteVariant: 'RedBlue', min: -3, max: 3 },
      opacity: 0.85
    },
    {
      id: 'indosmoke',
      type: 'gridded',
      url: '/indo-smoke-aug30-0800.tif',
      colourConfig: { paletteType: 'sequential', paletteVariant: 'red', min: 2e-8, max: 2e-7 },
      hideBelowMin: true,
      opacity: 0.9
    }
  ]
});

const panels: { marker: MarkerConfig; text: string }[] = [
  {
    marker: {
      bbox: WORLD,
      layers: [{ name: 'sstanomaly', state: 'on' }]
    },
    text: 'Global sea surface temperature anomaly (°C).'
  },
  {
    marker: {
      bbox: INDONESIA,
      layers: [{ name: 'indosmoke', state: 'on' }]
    },
    text: 'Forecast PM2.5 smoke plume over Indonesia.'
  }
];

export const griddedStoryText = [
  `#scrollytellerNAME${MARKER_NAME}1`,
  ...panels.flatMap(({ marker, text }) => [`#mark${encodeMarker(marker)}`, text]),
  '#endscrollyteller'
].join('\n\n');
