import assert from 'node:assert';
import Geohash from 'latlon-geohash';
import { geohashCodec, markerSchema, encodeFragment, decodeFragment } from './marker.ts';

describe('marker', () => {
  describe('geohashCodec', () => {
    it('should encode coordinates to a geohash', () => {
      const coords: [number, number] = [10, -10];
      const encoded = geohashCodec.encode(coords);
      const expected = Geohash.encode(-10, 10, 7);
      assert.strictEqual(encoded, expected);
    });

    it('should decode a geohash to coordinates', () => {
      const coords: [number, number] = [10, -10];
      const hash = Geohash.encode(-10, 10, 7);
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

  describe('markerSchema', () => {
    it('should have the expected keys', () => {
      assert.ok(markerSchema.coords);
      assert.ok(markerSchema.z);
      assert.ok(markerSchema.labels);
      assert.ok(markerSchema.legend);
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
  });
});
