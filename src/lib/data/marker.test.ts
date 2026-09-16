import { describe, it } from 'vitest';
import assert from 'node:assert';
import Geohash from 'latlon-geohash';
import { GEOHASH_PRECISION } from '../marker/schema.ts';
import acto from '@abcnews/alternating-case-to-object';
import {
  decodeMarker,
  encodeMarker,
  markerConfigFromParsed,
  parseLayerOverride,
  formatLayerOverride,
  decodeGeohashBounds,
  encodeGeohashBounds,
  type MarkerConfig
} from './marker.ts';

describe('marker ACTO data codec (REFACTOR.md spec)', () => {
  describe('parseLayerOverride & formatLayerOverride', () => {
    it('should parse simple on/off layers', () => {
      assert.deepStrictEqual(parseLayerOverride('fireson'), {
        name: 'fires',
        state: 'on'
      });
      assert.deepStrictEqual(parseLayerOverride('evacoff'), {
        name: 'evac',
        state: 'off'
      });
    });

    it('should parse duration in ms', () => {
      assert.deepStrictEqual(parseLayerOverride('fireson2000ms'), {
        name: 'fires',
        state: 'on',
        duration: 2000
      });
      assert.deepStrictEqual(parseLayerOverride('firesoff500ms'), {
        name: 'fires',
        state: 'off',
        duration: 500
      });
    });

    it('should parse hex colours (both 6-char and 3-char)', () => {
      assert.deepStrictEqual(parseLayerOverride('firesonff3300'), {
        name: 'fires',
        state: 'on',
        colour: 'ff3300'
      });
      assert.deepStrictEqual(parseLayerOverride('firesonf30'), {
        name: 'fires',
        state: 'on',
        colour: 'ff3300'
      });
    });

    it('should parse combined duration and hex colour', () => {
      assert.deepStrictEqual(parseLayerOverride('fireson2000msff3300'), {
        name: 'fires',
        state: 'on',
        duration: 2000,
        colour: 'ff3300'
      });
    });

    it('should return null for invalid layer format', () => {
      assert.strictEqual(parseLayerOverride(''), null);
      assert.strictEqual(parseLayerOverride('invalidformat'), null);
    });

    it('should format layer overrides to ACTO token strings', () => {
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'on' }),
        'fireson'
      );
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'on', duration: 2000 }),
        'fireson2000ms'
      );
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'on', colour: 'ff3300' }),
        'firesonff3300'
      );
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'on', colour: '#ff3300' }),
        'firesonff3300'
      );
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'on', duration: 2000, colour: 'ff3300' }),
        'fireson2000msff3300'
      );
      assert.strictEqual(
        formatLayerOverride({ name: 'fires', state: 'off', duration: 500 }),
        'firesoff500ms'
      );
    });
  });

  describe('geohash bounds encoding/decoding', () => {
    it('should roundtrip bounds', () => {
      const original: [number, number][] = [
        [151.2093, -33.8688],
        [144.9631, -37.8136]
      ];
      const encoded = encodeGeohashBounds(original);
      assert.strictEqual(encoded.length, original.length * GEOHASH_PRECISION);

      const decoded = decodeGeohashBounds(encoded);
      assert.strictEqual(decoded.length, 2);
      assert.ok(Math.abs(decoded[0][0] - original[0][0]) < 0.001);
      assert.ok(Math.abs(decoded[0][1] - original[0][1]) < 0.001);
      assert.ok(Math.abs(decoded[1][0] - original[1][0]) < 0.001);
      assert.ok(Math.abs(decoded[1][1] - original[1][1]) < 0.001);
    });
  });

  describe('decodeMarker & encodeMarker', () => {
    it('should decode full example from REFACTOR.md', () => {
      const hash = 'BBOXknpp5e9cbbknpp5e9cbbCAM1500msLAYERsatelliteonLAYERfireson2000msff3300LAYERevacoffBASEstreetLABELSonMINIMAPoff';
      const decoded = decodeMarker(hash);

      assert.strictEqual(decoded.cam, 1500);
      assert.strictEqual(decoded.base, 'street');
      assert.strictEqual(decoded.labels, true);
      assert.strictEqual(decoded.minimap, false);
      assert.ok(decoded.bbox && decoded.bbox.length === 2);
      assert.deepStrictEqual(decoded.layers, [
        { name: 'satellite', state: 'on' },
        { name: 'fires', state: 'on', duration: 2000, colour: 'ff3300' },
        { name: 'evac', state: 'off' }
      ]);
    });

    it('markerConfigFromParsed matches decodeMarker given the same acto-parsed object', () => {
      // `loadScrollyteller` (@abcnews/svelte-scrollyteller) already strips the marker
      // prefix off the mount id and runs `acto()` on the remainder before handing panels
      // their data — this is exactly that shape, not a raw string.
      const raw = 'CAM1500msLAYERsatelliteonBASEstreetLABELSonMINIMAPoff';
      assert.deepStrictEqual(markerConfigFromParsed(acto(raw)), decodeMarker(raw));
    });

    it('should decode when prefixed with #mark or mark', () => {
      const raw = '#markCAM1500msLAYERsatelliteon';
      const decoded = decodeMarker(raw);
      assert.strictEqual(decoded.cam, 1500);
      assert.deepStrictEqual(decoded.layers, [{ name: 'satellite', state: 'on' }]);
    });

    it('should roundtrip encode and decode marker configuration', () => {
      const config: MarkerConfig = {
        bbox: [
          [151.2093, -33.8688],
          [144.9631, -37.8136]
        ],
        cam: 2000,
        base: 'satellite',
        labels: false,
        minimap: true,
        layers: [
          { name: 'fires', state: 'on', duration: 1000, colour: 'ff0000' },
          { name: 'roads', state: 'off' }
        ]
      };

      const encoded = encodeMarker(config);
      const decoded = decodeMarker(encoded);

      assert.strictEqual(decoded.cam, 2000);
      assert.strictEqual(decoded.base, 'satellite');
      assert.strictEqual(decoded.labels, false);
      assert.strictEqual(decoded.minimap, true);
      assert.deepStrictEqual(decoded.layers, config.layers);

      assert.ok(decoded.bbox && decoded.bbox.length === 2);
      assert.ok(Math.abs(decoded.bbox[0][0] - config.bbox![0][0]) < 0.001);
      assert.ok(Math.abs(decoded.bbox[0][1] - config.bbox![0][1]) < 0.001);
    });

    it('should roundtrip fitGlobe on and off', () => {
      assert.strictEqual(decodeMarker(encodeMarker({ fitGlobe: true })).fitGlobe, true);
      assert.strictEqual(decodeMarker(encodeMarker({ fitGlobe: false })).fitGlobe, false);
      assert.strictEqual(decodeMarker(encodeMarker({})).fitGlobe, undefined);
    });

    it('should roundtrip a fit-globe centre point', () => {
      const config: MarkerConfig = { fitGlobe: true, center: [151.2093, -33.8688] };
      const decoded = decodeMarker(encodeMarker(config));
      assert.strictEqual(decoded.fitGlobe, true);
      assert.ok(decoded.center);
      assert.ok(Math.abs(decoded.center![0] - config.center![0]) < 0.001);
      assert.ok(Math.abs(decoded.center![1] - config.center![1]) < 0.001);
    });

    it('should handle single layer encoding correctly without breaking into array', () => {
      const config: MarkerConfig = {
        cam: 500,
        layers: [{ name: 'satellite', state: 'on' }]
      };
      const encoded = encodeMarker(config);
      assert.strictEqual(encoded, 'CAM500msLAYERsatelliteon');
      const decoded = decodeMarker(encoded);
      assert.strictEqual(decoded.cam, 500);
      assert.deepStrictEqual(decoded.layers, [{ name: 'satellite', state: 'on' }]);
    });
  });
});
