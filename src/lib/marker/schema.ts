import {
  geohashCodec,
  boundsCodec,
  countriesCodec,
  customLabelsCodec,
  geoJsonCodec,
  mapLabelsCodec,
  defaultMapLabels,
  imageSourceCodec
} from './codecs.ts';

/**
 * Schema for marker data
 */
export const markerSchema = {
  geoJson: {
    key: 'gj',
    type: 'custom',
    codec: geoJsonCodec,
    defaultValue: []
  },
  coords: {
    key: 'geohash',
    type: 'custom',
    codec: geohashCodec,
    defaultValue: [0, 0]
  },
  bounds: {
    key: 'b',
    type: 'custom',
    codec: boundsCodec,
    defaultValue: []
  },
  highlightCountries: {
    key: 'c',
    type: 'custom',
    codec: countriesCodec,
    defaultValue: []
  },
  z: {
    key: 'z',
    type: 'custom',
    codec: {
      encode: (z: number) => (typeof z === 'number' ? Math.round(Math.max(0, z) * 100000) : undefined),
      decode: (z: any) => (z !== undefined && z !== null ? Math.max(0, Number(z)) / 100000 : 200)
    },
    defaultValue: 2
  },
  labels: {
    key: 'labels',
    type: 'custom',
    codec: customLabelsCodec,
    defaultValue: []
  },
  base: {
    key: 'base',
    type: 'enum',
    values: ['street', 'countries', 'satellite'],
    defaultValue: 'street'
  },
  mapLabels: {
    key: 'ml',
    type: 'custom',
    codec: mapLabelsCodec,
    defaultValue: defaultMapLabels
  },
  projection: {
    key: 'p',
    type: 'enum',
    values: ['globe', 'mercator'],
    defaultValue: 'globe'
  },
  satelliteVariant: {
    key: 'sv',
    type: 'enum',
    values: ['blue', 'black'],
    defaultValue: 'blue'
  },
  imageSources: {
    key: 'is',
    type: 'custom',
    codec: imageSourceCodec,
    defaultValue: []
  },
  fitGlobe: {
    key: 'fit',
    type: 'boolean',
    defaultValue: false
  },
  attribution: {
    key: 'attr',
    type: 'base36string',
    defaultValue: ''
  },
  hideOsm: {
    key: 'ho',
    type: 'boolean',
    defaultValue: false
  }
};
