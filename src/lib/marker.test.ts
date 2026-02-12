import { describe, it } from 'node:test';
import assert from 'node:assert';
import Geohash from 'latlon-geohash';
import {
  geohashCodec,
  boundsCodec,
  markerSchema,
  encodeFragment,
  decodeFragment,
  GEOHASH_PRECISION,
  compressUrl,
  decompressUrl,
  isValidUrl
} from './marker.ts';

describe('marker', () => {
  describe('geohashCodec', () => {
    it('should encode coordinates to a geohash', () => {
      const coords: [number, number] = [10, -10];
      const encoded = geohashCodec.encode(coords);
      const expected = Geohash.encode(-10, 10, GEOHASH_PRECISION);
      assert.strictEqual(encoded, expected);
    });

    it('should decode a geohash to coordinates', () => {
      const coords: [number, number] = [10, -10];
      const hash = Geohash.encode(-10, 10, GEOHASH_PRECISION);
      const decoded = geohashCodec.decode(hash);

      assert.ok(Array.isArray(decoded));
      assert.strictEqual(decoded.length, 2);
      // Geohash is lossy, so we check if it's close
      assert.ok(Math.abs(decoded[0] - coords[0]) < 0.01);
      assert.ok(Math.abs(decoded[1] - coords[1]) < 0.01);
    });

    it('should return [0, 0] for empty hash', () => {
      assert.deepStrictEqual(geohashCodec.decode(''), [0, 0]);
    });
  });

  describe('boundsCodec', () => {
    it('should encode multiple coordinates to a concatenated geohash', () => {
      const bounds: [number, number][] = [
        [10, -10],
        [20, -20]
      ];
      const encoded = boundsCodec.encode(bounds);
      const expected = Geohash.encode(-10, 10, GEOHASH_PRECISION) + Geohash.encode(-20, 20, GEOHASH_PRECISION);
      assert.strictEqual(encoded, expected);
    });

    it('should decode a concatenated geohash to multiple coordinates', () => {
      const bounds: [number, number][] = [
        [10, -10],
        [20, -20]
      ];
      const hash = Geohash.encode(-10, 10, GEOHASH_PRECISION) + Geohash.encode(-20, 20, GEOHASH_PRECISION);
      const decoded = boundsCodec.decode(hash);

      assert.strictEqual(decoded.length, 2);
      assert.ok(Math.abs(decoded[0][0] - bounds[0][0]) < 0.01);
      assert.ok(Math.abs(decoded[0][1] - bounds[0][1]) < 0.01);
      assert.ok(Math.abs(decoded[1][0] - bounds[1][0]) < 0.01);
      assert.ok(Math.abs(decoded[1][1] - bounds[1][1]) < 0.01);
    });

    it('should return empty array for empty hash', () => {
      assert.deepStrictEqual(boundsCodec.decode(''), []);
    });
  });

  describe('markerSchema', () => {
    it('should have the expected keys', () => {
      assert.ok(markerSchema.coords);
      assert.ok(markerSchema.bounds);
      assert.ok(markerSchema.z);
      assert.ok(markerSchema.labels);
    });
  });

  describe('encodeFragment / decodeFragment', () => {
    it('should round-trip a simple object', async () => {
      const input = {
        coords: [151.2093, -33.8688] as [number, number],
        z: 10.123
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.ok(Math.abs(decoded.coords![0] - input.coords[0]) < 0.01);
      assert.ok(Math.abs(decoded.coords![1] - input.coords[1]) < 0.01);
      assert.strictEqual(decoded.z, 10.123);
    });

    it('should clamp negative z values to 0', async () => {
      const input = {
        z: -1.23456
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.z, 0);
    });

    it('should handle z=0', async () => {
      const input = {
        z: 0
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.z, 0);
    });

    it('should handle small z values', async () => {
      const input = {
        z: 0.049
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.ok(Math.abs(decoded.z! - input.z) < 0.00001);
    });

    it('should round-trip bounds', async () => {
      const input = {
        bounds: [
          [151.2093, -33.8688],
          [153.0251, -27.4698]
        ] as [number, number][]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.bounds?.length, 2);
      assert.ok(Math.abs(decoded.bounds![0][0] - input.bounds[0][0]) < 0.01);
      assert.ok(Math.abs(decoded.bounds![1][1] - input.bounds[1][1]) < 0.01);
    });

    it('should handle multiple labels', async () => {
      const input = {
        labels: [
          {
            name: 'Sydney',
            coords: [151.2093, -33.8688] as [number, number],
            style: 'city',
            number: 1,
            pointless: false
          },
          {
            name: 'Brisbane',
            coords: [153.0251, -27.4698] as [number, number],
            style: 'city',
            number: 2,
            pointless: true
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.labels?.length, 2);
      assert.strictEqual(decoded.labels![0].name, 'Sydney');
      assert.strictEqual(decoded.labels![1].name, 'Brisbane');
      assert.strictEqual(decoded.labels![1].pointless, true);
    });
    it('should handle highlightCountries with ISO_A2', async () => {
      const input = {
        highlightCountries: [
          { code: 'AU', style: 'primary' as const },
          { code: 'NZ', style: 'secondary' as const }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.highlightCountries?.length, 2);
      assert.strictEqual(decoded.highlightCountries![0].code, 'AU');
      assert.strictEqual(decoded.highlightCountries![0].style, 'primary');
      assert.strictEqual(decoded.highlightCountries![1].code, 'NZ');
      assert.strictEqual(decoded.highlightCountries![1].style, 'secondary');
    });

    it('should round-trip geoJson config', async () => {
      const input = {
        geoJson: [
          {
            url: 'https://example.com/data.json',
            type: 'areas' as const,
            colourMode: 'scale' as const,
            colourProp: 'value',
            colourConfig: {
              min: 0,
              max: 100,
              minColour: '#ffffff',
              maxColour: '#ff0000'
            }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.strictEqual(decoded.geoJson![0].url, 'https://example.com/data.json');
      assert.strictEqual(decoded.geoJson![0].type, 'areas');
      assert.strictEqual(decoded.geoJson![0].colourMode, 'scale');
      assert.strictEqual(decoded.geoJson![0].colourProp, 'value');
      assert.deepStrictEqual(decoded.geoJson![0].colourConfig, input.geoJson[0].colourConfig);
    });

    it('should round-trip point size', async () => {
      const input = {
        geoJson: [
          {
            url: 'points.json',
            type: 'points' as const,
            colourMode: 'simple' as const,
            pointSize: { value: 12.5, unit: 'k' as const }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.deepStrictEqual(decoded.geoJson![0].pointSize, input.geoJson[0].pointSize);
    });

    it('should round-trip custom palette', async () => {
      const input = {
        geoJson: [
          {
            url: 'custom.json',
            type: 'areas' as const,
            colourMode: 'scale' as const,
            colourConfig: {
              paletteType: 'custom' as const,
              customPalette: ['#ff0000', '#00ff00', '#0000ff']
            }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.deepStrictEqual(
        decoded.geoJson![0].colourConfig?.customPalette,
        input.geoJson[0].colourConfig.customPalette
      );
      // Ensure it was encoded efficiently (not as a full JSON array of strings)
      assert.ok(!fragment.includes('ff0000')); // Should be base36
    });

    it('should handle complex geoJson config with filters and spikes', async () => {
      const input = {
        geoJson: [
          {
            url: 'https://example.com/spikes.json',
            type: 'spikes' as const,
            colourMode: 'simple' as const,
            filter: { prop: 'category', values: ['A', 'B'] },
            spike: { heightProp: 'count', scalar: 10 }
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 1);
      assert.strictEqual(decoded.geoJson![0].type, 'spikes');
      assert.deepStrictEqual(decoded.geoJson![0].filter, input.geoJson[0].filter);
      assert.deepStrictEqual(decoded.geoJson![0].spike, input.geoJson[0].spike);
    });

    it('should handle multiple geoJson configs', async () => {
      const input = {
        geoJson: [
          { url: 'a', type: 'areas' as const, colourMode: 'simple' as const },
          { url: 'b', type: 'lines' as const, colourMode: 'scale' as const }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.geoJson?.length, 2);
      assert.strictEqual(decoded.geoJson![0].url, 'a');
      assert.strictEqual(decoded.geoJson![1].url, 'b');
    });

    it('should round-trip base style', async () => {
      const input = {
        base: 'countries' as const
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.base, 'countries');
    });

    it('should round-trip map labels config', async () => {
      const input = {
        mapLabels: {
          countries: 2,
          states: true,
          cities: true,
          towns: false,
          oceans: true,
          continents: false
        }
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.deepStrictEqual(decoded.mapLabels, input.mapLabels);
    });

    it('should handle map labels with leading zeros', async () => {
      const input = {
        mapLabels: {
          countries: 0,
          states: false,
          cities: false,
          towns: false,
          oceans: true,
          continents: false
        }
      };
      const fragment = await encodeFragment(input);
      // Fragment should contain something like ml00001
      const decoded = await decodeFragment(fragment);

      assert.deepStrictEqual(decoded.mapLabels, input.mapLabels);
    });
    it('should round-trip imageSources with high precision', async () => {
      const input = {
        imageSources: [
          {
            id: 'img-0',
            url: 'https://example.com/map.png',
            opacity: 0.75,
            coordinates: [
              [151.2093, -33.8688],
              [151.2193, -33.8688],
              [151.2193, -33.8788],
              [151.2093, -33.8788]
            ] as [number, number][]
          }
        ]
      };
      const fragment = await encodeFragment(input);
      const decoded = await decodeFragment(fragment);

      assert.strictEqual(decoded.imageSources?.length, 1);
      assert.strictEqual(decoded.imageSources![0].url, input.imageSources[0].url);
      assert.strictEqual(decoded.imageSources![0].opacity, 0.75);

      // Check precision - 10 chars is ~0.6m which is ~0.000005 degrees
      // We expect less than 0.00001 difference
      assert.ok(
        Math.abs(decoded.imageSources![0].coordinates[0][0] - input.imageSources[0].coordinates[0][0]) < 0.00001
      );
      assert.ok(
        Math.abs(decoded.imageSources![0].coordinates[0][1] - input.imageSources[0].coordinates[0][1]) < 0.00001
      );
    });

    it('should compress and decompress recognized URLs', () => {
      const url = 'https://www.abc.net.au/res/sites/news-projects/my-data.json';
      const compressed = compressUrl(url);
      assert.ok(compressed.startsWith('~1'));
      assert.strictEqual(decompressUrl(compressed), url);
    });

    it('should validate URLs correctly', () => {
      assert.strictEqual(isValidUrl('https://live-production.wcms.abc-cdn.net.au/foo'), true);
      assert.strictEqual(isValidUrl('https://preview-production.wcms.abc-cdn.net.au/foo'), false);
    });

    it('should filter out invalid URLs during encode', async () => {
      const input = {
        geoJson: [
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/valid.json',
            type: 'areas' as const,
            colourMode: 'simple' as const
          },
          {
            url: 'https://preview-production.wcms.abc-cdn.net.au/invalid.json',
            type: 'areas' as const,
            colourMode: 'simple' as const
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
