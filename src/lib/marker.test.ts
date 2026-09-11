import { describe, it } from 'vitest';
import assert from 'node:assert';
import Geohash from 'latlon-geohash';
import {
  coordsCodec,
  boundsCodec,
  twoDecimalCodec,
  compressPalette,
  decompressPalette,
  compressUrl,
  decompressUrl,
  isValidUrl,
  urlCodec,
  mapLabelsSchema,
  markerSchema,
  hasMapLabels,
  DEFAULT_MAP_LABELS,
  DISABLED_MAP_LABELS,
  GEOHASH_PRECISION,
  type DecodedObject
} from './marker/index.ts';

describe('marker codecs', () => {
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

  describe('palette compression', () => {
    it('should compress and decompress 6-digit hex colours', () => {
      const colours = ['#ff0000', '#00ff00', '#0000ff'];
      const compressed = compressPalette(colours);
      assert.strictEqual(typeof compressed, 'string');
      assert.deepStrictEqual(decompressPalette(compressed), colours);
    });

    it('should handle 3-digit hex colours by expanding them', () => {
      const compressed = compressPalette(['#f00', '#0f0']);
      assert.deepStrictEqual(decompressPalette(compressed), ['#ff0000', '#00ff00']);
    });

    it('should handle empty or falsy inputs', () => {
      assert.strictEqual(compressPalette([]), '');
      assert.deepStrictEqual(decompressPalette(''), []);
    });
  });

  describe('URL compression & validation', () => {
    it('should compress and decompress recognized ABC URLs', () => {
      const url = 'https://www.abc.net.au/res/sites/news-projects/my-data.json';
      const compressed = compressUrl(url);
      assert.ok(compressed.startsWith('~1'));
      assert.strictEqual(decompressUrl(compressed), url);
    });

    it('should identify valid vs invalid production URLs', () => {
      assert.strictEqual(isValidUrl('https://live-production.wcms.abc-cdn.net.au/valid.json'), true);
      assert.strictEqual(isValidUrl('https://preview-production.wcms.abc-cdn.net.au/invalid.json'), false);
    });

    it('should round-trip valid URLs through urlCodec', async () => {
      const url = 'https://live-production.wcms.abc-cdn.net.au/data.json';
      const encoded = await urlCodec.encode(url);
      const decoded = await urlCodec.decode(encoded);
      assert.strictEqual(decoded, url);
    });
  });

  describe('mapLabelsSchema', () => {
    it('should round-trip map labels config using bitpacking', async () => {
      const input = {
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
      };
      const encoded = await mapLabelsSchema.encode(input);
      assert.strictEqual(typeof encoded, 'string');
      const decoded = await mapLabelsSchema.decode(encoded);
      assert.deepStrictEqual(decoded, input);
    });

    it('should correctly determine label visibility with hasMapLabels', () => {
      assert.strictEqual(hasMapLabels(DEFAULT_MAP_LABELS), true);
      assert.strictEqual(hasMapLabels(DISABLED_MAP_LABELS), false);
      assert.strictEqual(hasMapLabels({ countriesMajor: true }), true);
      assert.strictEqual(hasMapLabels({ countriesMajor: false, oceans: false }), false);
      assert.strictEqual(hasMapLabels(null), false);
      assert.strictEqual(hasMapLabels(undefined), false);
    });
  });

  describe('markerSchema ACTO integration', () => {
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
            cmid: 12345678,
            type: 'areas',
            colourMode: 'simple',
            opacity: 0.8
          }
        ]
      };

      const fragment = await markerSchema.encode(input);
      // Verify no punctuation, brackets, quotes or commas exist in the fragment
      assert.ok(/^[a-z0-9]*$/i.test(fragment), `Fragment contains non-alphanumeric characters: ${fragment}`);
    });

    it('should round-trip custom codecs within the full marker schema', async () => {
      const input: DecodedObject = {
        coords: [151.2093, -33.8688],
        bounds: [
          [151.2093, -33.8688],
          [153.0251, -27.4698]
        ],
        z: 6.14,
        labels: [
          {
            name: 'Melbourne',
            coords: [144.9631, -37.8136],
            style: 'country-small',
            number: 0
          }
        ],
        labelsZIndex: 600,
        mapLabelsZIndex: 520,
        geoJson: [
          {
            id: 'gj-1',
            cmid: 12345678,
            type: 'areas',
            zIndex: 400,
            colourMode: 'scale',
            opacity: 1,
            isOpaque: false,
            colourConfig: {
              paletteType: 'custom',
              customPalette: ['#ff0000', '#00ff00']
            }
          },
          {
            id: 'gj-2',
            cmid: 12345678,
            type: 'lines',
            zIndex: 410,
            colourMode: 'basic',
            opacity: 0.8,
            isOpaque: true,
            colourConfig: {
              basicType: 'highlighted'
            }
          }
        ],
        imageSources: [
          {
            id: 'img-0',
            url: 'https://live-production.wcms.abc-cdn.net.au/map.png',
            opacity: 0.75,
            zIndex: 300,
            coordinates: [
              [151.2093, -33.8688],
              [151.2193, -33.8688]
            ]
          }
        ]
      };

      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);

      assert.ok(Math.abs(decoded.coords![0] - input.coords![0]) < 0.01);
      assert.ok(Math.abs(decoded.coords![1] - input.coords![1]) < 0.01);
      assert.strictEqual(decoded.z, 6.14);
      assert.strictEqual(decoded.labels?.length, 1);
      assert.strictEqual(decoded.labels![0].name, 'Melbourne');
      assert.strictEqual(decoded.labelsZIndex, 600);
      assert.strictEqual(decoded.mapLabelsZIndex, 520);
      assert.strictEqual(decoded.geoJson?.length, 2);
      assert.strictEqual(decoded.geoJson![0].id, 'gj-1');
      assert.strictEqual(decoded.geoJson![0].cmid, 12345678);
      assert.strictEqual(decoded.geoJson![0].zIndex, 400);
      assert.strictEqual(decoded.geoJson![1].id, 'gj-2');
      assert.strictEqual(decoded.geoJson![1].cmid, 12345678);
      assert.strictEqual(decoded.geoJson![1].type, 'lines');
      assert.strictEqual(decoded.geoJson![1].zIndex, 410);
      assert.deepStrictEqual(
        decoded.geoJson![0].colourConfig?.customPalette,
        input.geoJson![0].colourConfig?.customPalette
      );
      assert.strictEqual(decoded.geoJson![1].colourConfig?.basicType, 'highlighted');
      assert.strictEqual(decoded.imageSources?.length, 1);
      assert.strictEqual(decoded.imageSources![0].url, input.imageSources![0].url);
      assert.strictEqual(decoded.imageSources![0].zIndex, 300);
    });

    it('should round-trip icons within the full marker schema', async () => {
      const input: DecodedObject = {
        icons: [
          {
            id: 'icon-1',
            cmid: 106753230,
            coords: [151.2093, -33.8688],
            zIndex: 450
          }
        ]
      };
      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.icons?.length, 1);
      assert.strictEqual(decoded.icons![0].id, 'icon-1');
      assert.strictEqual(decoded.icons![0].cmid, 106753230);
      assert.ok(Math.abs(decoded.icons![0].coords[0] - 151.2093) < 0.01);
      assert.ok(Math.abs(decoded.icons![0].coords[1] - -33.8688) < 0.01);
      assert.strictEqual(decoded.icons![0].zIndex, 450);
    });

    it('should round-trip GeoJSON layers with URL sources', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            id: 'gj-url-1',
            url: 'https://live-production.wcms.abc-cdn.net.au/data/places.geojson',
            type: 'points',
            zIndex: 420,
            colourMode: 'basic',
            opacity: 0.9
          },
          {
            id: 'fra-1',
            url: 'https://www.abc.net.au/res/sites/news-projects/geojson-naturalearth-countries/10m-defacto/FRA.geojson',
            type: 'areas',
            zIndex: 400,
            colourMode: 'basic'
          }
        ]
      };

      const fragment = await markerSchema.encode(input);
      assert.ok(/^[a-z0-9]*$/i.test(fragment), `Fragment contains non-alphanumeric characters: ${fragment}`);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.geoJson?.length, 2);
      assert.strictEqual(decoded.geoJson![0].id, 'gj-url-1');
      assert.strictEqual(decoded.geoJson![0].url, 'https://live-production.wcms.abc-cdn.net.au/data/places.geojson');
      assert.strictEqual(decoded.geoJson![0].type, 'points');
      assert.strictEqual(decoded.geoJson![0].zIndex, 420);
      assert.strictEqual(decoded.geoJson![1].id, 'fra-1');
      assert.strictEqual(decoded.geoJson![1].url, 'https://www.abc.net.au/res/sites/news-projects/geojson-naturalearth-countries/10m-defacto/FRA.geojson');
      assert.strictEqual(decoded.geoJson![1].type, 'areas');
      assert.strictEqual(decoded.geoJson![1].zIndex, 400);
    });


    it('should filter out invalid preview URLs and zero CMIDs during encode', async () => {
      const input: DecodedObject = {
        geoJson: [
          {
            cmid: 12345678,
            type: 'areas',
            colourMode: 'simple',
            opacity: 1,
            isOpaque: false
          },
          {
            cmid: 0,
            type: 'areas',
            colourMode: 'simple',
            opacity: 1,
            isOpaque: false
          },
          {
            url: 'https://preview-production.wcms.abc-cdn.net.au/invalid.geojson',
            type: 'lines',
            colourMode: 'simple',
            opacity: 1,
            isOpaque: false
          },
          {
            url: 'https://live-production.wcms.abc-cdn.net.au/valid.geojson',
            type: 'lines',
            colourMode: 'simple',
            opacity: 1,
            isOpaque: false
          }
        ],
        imageSources: [
          {
            url: 'https://preview-production.wcms.abc-cdn.net.au/invalid.png',
            opacity: 1,
            coordinates: []
          }
        ]
      };
      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.geoJson?.length, 2);
      assert.strictEqual(decoded.geoJson![0].cmid, 12345678);
      assert.strictEqual(decoded.geoJson![1].url, 'https://live-production.wcms.abc-cdn.net.au/valid.geojson');
      assert.strictEqual(decoded.imageSources?.length, 0);
    });

    it('should encode and decode minimap options', async () => {
      const input: DecodedObject = {
        minimap: {
          enabled: true,
          bounds: [
            [144.9631, -37.8136],
            [151.2093, -33.8688]
          ]
        }
      };
      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.minimap?.enabled, true);
      assert.strictEqual(decoded.minimap?.bounds?.length, 2);
    });

    it('should encode and decode rasterLayers options', async () => {
      const input: DecodedObject = {
        rasterLayers: [
          {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 19,
            tileSize: 256,
            attribution: 'OpenStreetMap',
            zIndex: 100
          }
        ]
      };
      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.rasterLayers?.length, 1);
      assert.strictEqual(decoded.rasterLayers?.[0].url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
      assert.strictEqual(decoded.rasterLayers?.[0].maxZoom, 19);
      assert.strictEqual(decoded.rasterLayers?.[0].tileSize, 256);
      assert.strictEqual(decoded.rasterLayers?.[0].attribution, 'OpenStreetMap');
      assert.strictEqual(decoded.rasterLayers?.[0].zIndex, 100);
    });

    it('should filter out invalid rasterLayer URLs during encode', async () => {
      const input: DecodedObject = {
        rasterLayers: [
          {
            url: 'https://preview-production.wcms.abc-cdn.net.au/invalid.png',
            maxZoom: 7,
            tileSize: 256
          },
          {
            url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            maxZoom: 7,
            tileSize: 256
          }
        ]
      };
      const fragment = await markerSchema.encode(input);
      const decoded = await markerSchema.decode(fragment);
      assert.strictEqual(decoded.rasterLayers?.length, 1);
      assert.strictEqual(decoded.rasterLayers?.[0].url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    });
  });
});


