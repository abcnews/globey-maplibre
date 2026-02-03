import {
  geohashCodec,
  boundsCodec,
  countriesCodec,
  customLabelsCodec,
  geoJsonCodec,
  mapLabelsCodec,
  defaultMapLabels
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
    values: ['street', 'countries'],
    defaultValue: 'street'
  },
  mapLabels: {
    key: 'ml',
    type: 'custom',
    codec: mapLabelsCodec,
    defaultValue: defaultMapLabels
  }
};
