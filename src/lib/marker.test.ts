import { describe, it, expect } from 'vitest';
import assert from 'node:assert';
import Geohash from 'latlon-geohash';
import {
  coordsCodec,
  boundsCodec,
  twoDecimalCodec,
  markerSchema,
  encodeFragment,
  decodeFragment,
  GEOHASH_PRECISION,
  compressUrl,
  decompressUrl,
  isValidUrl,
  type DecodedObject
} from './marker.ts';

describe('marker', () => {
  describe('coordsCodec', () => {
    it('should encode coordinates to a geohash', async () => {
      const coords: [number, number] = [10, -10];
      const encoded = await coordsCodec.encode(coords);
      const expected = Geohash.encode(-10, 10, GEOHASH_PRECISION);
      assert.strictEqual(encoded, expected);
    });

    it('should decode a geohash to coordinates', async () => {
      const coords: [number, number] = [10, -10];
      const hash = Geohash.encode(-10, 10, GEOHASH_PRECISION);
      const decoded = await coordsCodec.decode(hash);

      assert.ok(Array.isArray(decoded));
      assert.strictEqual(decoded.length, 2);
      // Geohash precision check
      assert.ok(Math.abs(decoded[0] - coords[0]) < 0.01);
      assert.ok(Math.abs(decoded[1] - coords[1]) < 0.01);
    });

    it('should return [0, 0] for empty hash', async () => {
      assert.deepStrictEqual(await coordsCodec.decode(''), [0, 0]);
    });
  });

  describe('boundsCodec', () => {
    it('should encode multiple coordinates to a concatenated geohash', async () => {
      const bounds: [number, number][] = [
        [10, -10],
        [20, -20]
      ];
      const encoded = await boundsCodec.encode(bounds);
      const expected = Geohash.encode(-10, 10, GEOHASH_PRECISION) + Geohash.encode(-20, 20, GEOHASH_PRECISION);
      assert.strictEqual(encoded, expected);
    });

    it('should decode a concatenated geohash to multiple coordinates', async () => {
      const bounds: [number, number][] = [
        [10, -10],
        [20, -20]
      ];
      const hash = Geohash.encode(-10, 10, GEOHASH_PRECISION) + Geohash.encode(-20, 20, GEOHASH_PRECISION);
      const decoded = await boundsCodec.decode(hash);

      assert.strictEqual(decoded.length, 2);
      assert.ok(Math.abs(decoded[0][0] - bounds[0][0]) < 0.01);
      assert.ok(Math.abs(decoded[0][1] - bounds[0][1]) < 0.01);
      assert.ok(Math.abs(decoded[1][0] - bounds[1][0]) < 0.01);
      assert.ok(Math.abs(decoded[1][1] - bounds[1][1]) < 0.01);
    });

    it('should return empty array for empty hash', async () => {
      assert.deepStrictEqual(await boundsCodec.decode(''), []);
    });
  });

  describe('twoDecimalCodec', () => {
    it('should encode float to rounded integer multiplied by 100', async () => {
      assert.strictEqual(await twoDecimalCodec.encode(6.136), 614);
      assert.strictEqual(await twoDecimalCodec.encode(10.5), 1050);
      assert.strictEqual(await twoDecimalCodec.encode(-3.456), -346);
    });

    it('should decode integer back to two decimal float', async () => {
      assert.strictEqual(await twoDecimalCodec.decode(614), 6.14);
      assert.strictEqual(await twoDecimalCodec.decode(1050), 10.5);
      assert.strictEqual(await twoDecimalCodec.decode(-346), -3.46);
    });
  });

  describe('markerSchema', () => {
    it('should have the expected schema shape', () => {
      assert.ok(markerSchema.shape);
      assert.ok(markerSchema.shape.coords);
      assert.ok(markerSchema.shape.bounds);
      assert.ok(markerSchema.shape.z);
      assert.ok(markerSchema.shape.labels);
    });
  });

  describe('encodeFragment / decodeFragment', () => {
    it('should produce strictly alphanumeric ACTO fragments', async () => {
      const input: DecodedObject = {
        coords: [151.2093, -33.8688],
        z: 6.14,
        base: 'satellite',
        attribution: 'Map data (c) ABC News, 2026!',
        labels: [
          {
            name: 'Sydney',
            coords: [151.2093, -33.8688],
            style: 'country-large',
            number: 1
          }
        ],
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/sample.json',
            type: 'areas',
            styles: [{ colourMode: 'simple', opacity: 0.8 }]
          }
        ]
      };

      const fragment = await encodeFragment(input);
      // Verify no punctuation, brackets, quotes or commas exist in the fragment
      assert.ok(/^[a-z0-9]*$/i.test(fragment), `Fragment contains non-alphanumeric characters: ${fragment}`);
    });

    it('should round-trip a simple object', async () => {
      const input: DecodedObject = {
        coords: [151.2093, -33.8688],
        z: 10.12
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.ok(Math.abs(decoded.coords![0] - input.coords![0]) < 0.01);
      assert.ok(Math.abs(decoded.coords![1] - input.coords![1]) < 0.01);
      assert.strictEqual(decoded.z, 10.12);
    });

    it('should handle z=0', async () => {
      const input: DecodedObject = {
        z: 0
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.z, 0);
    });

    it('should handle custom attribution with special characters', async () => {
      const input: DecodedObject = {
        attribution: 'Map data © OpenStreetMap contributors, Sources: Example? && other!'
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.attribution, input.attribution);
    });

    it('should round-trip bounds', async () => {
      const input: DecodedObject = {
        bounds: [
          [151.2093, -33.8688],
          [153.0251, -27.4698]
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.bounds?.length, 2);
      assert.ok(Math.abs(decoded.bounds![0][0] - input.bounds![0][0]) < 0.01);
      assert.ok(Math.abs(decoded.bounds![0][1] - input.bounds![0][1]) < 0.01);
    });

    it('should handle multiple custom labels', async () => {
      const input: DecodedObject = {
        labels: [
          {
            name: 'Melbourne',
            coords: [144.9631, -37.8136],
            style: 'country-small',
            number: 0
          },
          {
            name: 'Brisbane',
            coords: [153.0251, -27.4698],
            style: 'water-large',
            number: 2
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.labels?.length, 2);
      assert.strictEqual(decoded.labels![0].name, 'Melbourne');
      assert.strictEqual(decoded.labels![1].name, 'Brisbane');
      assert.strictEqual(decoded.labels![1].number, 2);
      assert.strictEqual(decoded.labels![1].style, 'water-large');
      assert.ok(Math.abs(decoded.labels![0].coords[0] - input.labels![0].coords[0]) < 0.01);
      assert.ok(Math.abs(decoded.labels![0].coords[1] - input.labels![0].coords[1]) < 0.01);
    });

    it('should round-trip complex geoJson config', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/data.json',
            type: 'areas',
            styles: [
              {
                colourMode: 'scale',
                colourProp: 'value',
                opacity: 0.9,
                isOpaque: true,
                colourConfig: {
                  min: 0,
                  max: 100,
                  minColour: '#ffffff',
                  maxColour: '#ff0000',
                  paletteType: 'sequential'
                }
              }
            ]
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.strictEqual(decoded.geoJson![0].url, 'https://live-production.wcms.abc-cdn.net.au/data.json');
      assert.strictEqual(decoded.geoJson![0].type, 'areas');
      assert.strictEqual(decoded.geoJson![0].styles?.[0].colourMode, 'scale');
      assert.strictEqual(decoded.geoJson![0].styles?.[0].colourProp, 'value');
      assert.strictEqual(decoded.geoJson![0].styles?.[0].opacity, 0.9);
      assert.strictEqual(decoded.geoJson![0].styles?.[0].isOpaque, true);
      assert.strictEqual(decoded.geoJson![0].styles?.[0].colourConfig?.min, 0);
      assert.strictEqual(decoded.geoJson![0].styles?.[0].colourConfig?.max, 100);
    });

    it('should round-trip point size and line width', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/points.json',
            type: 'points',
            styles: [{ colourMode: 'simple', opacity: 1, isOpaque: false }],
            pointSize: { value: 12.5, unit: 'k' },
            lineWidth: { value: 3.5, unit: 'p' }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.deepStrictEqual(decoded.geoJson![0].pointSize, input.geoJson![0].pointSize);
      assert.deepStrictEqual(decoded.geoJson![0].lineWidth, input.geoJson![0].lineWidth);
    });

    it('should round-trip custom palette with high compression', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/custom.json',
            type: 'areas',
            styles: [
              {
                colourMode: 'scale',
                opacity: 1,
                isOpaque: false,
                colourConfig: {
                  paletteType: 'custom',
                  customPalette: ['#ff0000', '#00ff00', '#0000ff']
                }
              }
            ]
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.deepStrictEqual(
        decoded.geoJson![0].styles?.[0].colourConfig?.customPalette,
        input.geoJson![0].styles[0].colourConfig?.customPalette
      );
    });

    it('should handle complex geoJson config with filters and spikes', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/spikes.json',
            type: 'spikes',
            styles: [
              {
                colourMode: 'simple',
                opacity: 1,
                isOpaque: false,
                filter: { prop: 'category', values: ['A', 'B'] }
              }
            ],
            spike: { heightProp: 'count', scalar: 10, maxHeight: 100, radius: 5 }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.strictEqual(decoded.geoJson![0].type, 'spikes');
      assert.deepStrictEqual(decoded.geoJson![0].styles?.[0].filter, input.geoJson![0].styles[0].filter);
      assert.deepStrictEqual(decoded.geoJson![0].spike, input.geoJson![0].spike);
    });

    it('should round-trip base and projection settings', async () => {
      const input: DecodedObject = {
        base: 'satellite',
        projection: 'mercator',
        satelliteVariant: 'black'
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.base, 'satellite');
      assert.strictEqual(decoded.projection, 'mercator');
      assert.strictEqual(decoded.satelliteVariant, 'black');
    });

    it('should decode street map by default when base is omitted', async () => {
      const decoded = await decodeFragment('');
      assert.strictEqual(decoded.base, 'street');
    });

    it('should omit default street base from ACTO fragment', async () => {
      const input: DecodedObject = { base: 'street' };
      const fragment = await encodeFragment(input);
      assert.ok(!fragment.includes('BASE'), 'Should omit BASE key when base is street (default)');
      const decoded = await decodeFragment(fragment);
      assert.strictEqual(decoded.base, 'street');
    });

    it('should encode satellite base as index 1 in ACTO fragment and decode correctly', async () => {
      const input: DecodedObject = { base: 'satellite' };
      const fragment = await encodeFragment(input);
      assert.strictEqual(fragment, 'BASE1');
      const decoded = await decodeFragment(fragment);
      assert.strictEqual(decoded.base, 'satellite');
    });

    it('should decode legacy or literal string base values from fragments', async () => {
      const decodedStreet = await decodeFragment('BASEstreet');
      assert.strictEqual(decodedStreet.base, 'street');

      const decodedSatellite = await decodeFragment('BASEsatellite');
      assert.strictEqual(decodedSatellite.base, 'satellite');
    });


    it('should round-trip map labels config using bitpacking', async () => {
      const input: DecodedObject = {
        mapLabels: {
          countriesMajor: true,
          countriesMedium: false,
          countriesMinor: true,
          continents: false,
          states: true,
          cities: true,
          towns: false,
          oceans: true,
          nationalBoundaries: false,
          stateBoundaries: true
        }
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.deepStrictEqual(decoded.mapLabels, input.mapLabels);
    });

    it('should omit mapLabels in fragment when matching defaults and decode properly', async () => {
      const input: DecodedObject = {
        mapLabels: {
          countriesMajor: true,
          countriesMedium: true,
          countriesMinor: true,
          continents: false,
          states: false,
          cities: false,
          towns: false,
          oceans: false,
          nationalBoundaries: true,
          stateBoundaries: false
        }
      };
      const fragment = await encodeFragment(input);
      assert.ok(!fragment.includes('ML'), 'Should omit ML key when matching defaults');
      const decoded = await decodeFragment(fragment);
      assert.deepStrictEqual(decoded.mapLabels, input.mapLabels);
    });

    it('should round-trip imageSources with high precision coordinates', async () => {
      const input: DecodedObject = {
        imageSources: [
          {
            id: 'img-0',
            url: 'https://live-production.wcms.abc-cdn.net.au/map.png',
            opacity: 0.75,
            coordinates: [
              [151.2093, -33.8688],
              [151.2193, -33.8688],
              [151.2193, -33.8788],
              [151.2093, -33.8788]
            ]
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.imageSources?.length, 1);
      assert.strictEqual(decoded.imageSources![0].url, input.imageSources![0].url);
      assert.strictEqual(decoded.imageSources![0].opacity, 0.75);

      assert.ok(
        Math.abs(decoded.imageSources![0].coordinates[0][0] - input.imageSources![0].coordinates[0][0]) < 0.00001
      );
      assert.ok(
        Math.abs(decoded.imageSources![0].coordinates[0][1] - input.imageSources![0].coordinates[0][1]) < 0.00001
      );
    });

    it('should round-trip custom labels with different styles', async () => {
      const input: DecodedObject = {
        labels: [
          {
            name: 'Sydney',
            coords: [151.2093, -33.8688],
            style: 'country-large',
            number: 0
          },
          {
            name: 'Pacific Ocean',
            coords: [160.0, -20.0],
            style: 'water-large',
            number: 1
          },
          {
            name: 'Brisbane River',
            coords: [153.02, -27.47],
            style: 'water-small',
            number: 2
          },
          {
            name: 'Canberra',
            coords: [149.13, -35.28],
            style: 'country-small',
            number: 3
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.labels?.length, 4);
      assert.strictEqual(decoded.labels![0].style, 'country-large');
      assert.strictEqual(decoded.labels![1].style, 'water-large');
      assert.strictEqual(decoded.labels![2].style, 'water-small');
      assert.strictEqual(decoded.labels![3].style, 'country-small');
    });

    it('should compress and decompress recognized URLs', () => {
      const url = 'https://www.abc.net.au/res/sites/news-projects/my-data.json';
      const compressed = compressUrl(url);
      assert.ok(compressed.startsWith('~1'));
      assert.strictEqual(decompressUrl(compressed), url);
    });

    it('should filter out invalid preview URLs during encode', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/valid.json',
            type: 'areas',
            styles: [{ colourMode: 'simple', opacity: 1, isOpaque: false }]
          },
          {
            url: 'https://preview-production.wcms.abc-cdn.net.au/invalid.json',
            type: 'areas',
            styles: [{ colourMode: 'simple', opacity: 1, isOpaque: false }]
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);
      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.strictEqual(decoded.geoJson![0].url, 'https://live-production.wcms.abc-cdn.net.au/valid.json');
    });
  });
});
