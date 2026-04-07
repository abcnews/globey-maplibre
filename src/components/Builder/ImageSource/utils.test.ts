import { describe, it, expect, assert } from 'vitest';
import { parseKmlCoords, parseNearmapUrl, parseGeoTiffCoords, parseFilenameCoords } from './utils.ts';

describe('ImageSource Utils', () => {
  describe('parseKmlCoords', () => {
    it('should parse a full KML LatLonBox', () => {
      const input = `
                <LatLonBox>
                    <north>59.17592824927138</north>
                    <south>55.272857215315355</south>
                    <east>-1.3623046875000002</east>
                    <west>-7.789306640625001</west>
                </LatLonBox>
            `;
      const result = parseKmlCoords(input);
      assert.ok(result);
      if (!result) return;
      assert.strictEqual(result.length, 4);
      assert.deepStrictEqual(result[0], [-7.789306640625001, 59.17592824927138]); // TL
      assert.deepStrictEqual(result[2], [-1.3623046875000002, 55.272857215315355]); // BR
    });

    it('should parse a raw snippet without root tags', () => {
      const input = `
                <north>59.17592824927138</north>
                <south>55.272857215315355</south>
                <east>-1.3623046875000002</east>
                <west>-7.789306640625001</west>
            `;
      const result = parseKmlCoords(input);
      assert.ok(result);
      if (!result) return;
      assert.strictEqual(result[0][1], 59.17592824927138);
    });

    it('should handle different ordering of tags', () => {
      const input = `
                <west>-7.7</west>
                <east>-1.3</east>
                <south>55.2</south>
                <north>59.1</north>
            `;
      const result = parseKmlCoords(input);
      assert.ok(result);
      if (!result) return;
      assert.deepStrictEqual(result[0], [-7.7, 59.1]);
    });

    it('should return null for missing tags', () => {
      const input = `
                <north>59.1</north>
                <south>55.2</south>
                <east>-1.3</east>
            `;
      assert.strictEqual(parseKmlCoords(input), null);
    });

    it('should return null for non-numeric values', () => {
      const input = `
                <north>abc</north>
                <south>55.2</south>
                <east>-1.3</east>
                <west>-7.7</west>
            `;
      assert.strictEqual(parseKmlCoords(input), null);
    });

    it('should handle full document content', () => {
      const input = `
                <?xml version='1.0' encoding='UTF-8'?>
                <kml xmlns="http://www.opengis.net/kml/2.2">
                    <GroundOverlay>
                        <LatLonBox>
                            <north>10</north>
                            <south>20</south>
                            <east>30</east>
                            <west>40</west>
                        </LatLonBox>
                    </GroundOverlay>
                </kml>
            `;
      const result = parseKmlCoords(input);
      assert.ok(result);
      if (!result) return;
      assert.deepStrictEqual(result[0], [40, 10]);
    });
  });

  describe('parseNearmapUrl', () => {
    const url = 'https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.4809010,153.0041531,18.00z,0d/V/20241106';

    it('should extract lat, lon, zoom, and pitch from URL', () => {
      const result = parseNearmapUrl(url);
      assert.ok(result);
      if (!result) return;
      assert.strictEqual(result.pitch, 0);
      assert.strictEqual(result.coordinates.length, 4);
    });

    it('should calculate correct bounding box for 1920x1080 at zoom 18', () => {
      // center: -27.4809010, 153.0041531
      const result = parseNearmapUrl(url, 1920, 1080);
      assert.ok(result);
      if (!result) return;
      // Rough check for center
      const centerLon = (result.coordinates[0][0] + result.coordinates[1][0]) / 2;
      const centerLat = (result.coordinates[0][1] + result.coordinates[3][1]) / 2;
      assert.ok(Math.abs(centerLon - 153.0041531) < 0.0001);
      assert.ok(Math.abs(centerLat - -27.480901) < 0.0001);

      // Verify width (should be halved from original 1:1 expectation because Nearmap export is double resolution)
      const widthDeg = Math.abs(result.coordinates[1][0] - result.coordinates[0][0]);
      assert.ok(Math.abs(widthDeg - 0.0051498) < 0.0001);
    });

    it('should handle URL with pitch', () => {
      const pitchUrl =
        'https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.3546586,153.4187044,17.00z,101d/V/20240611';
      const result = parseNearmapUrl(pitchUrl);
      assert.ok(result);
      if (!result) return;
      assert.strictEqual(result.pitch, 101);
    });

    it('should return null for invalid URLs', () => {
      const invalidUrl = 'https://google.com';
      assert.strictEqual(parseNearmapUrl(invalidUrl), null);
    });
  });

  describe('parseGeoTiffCoords', () => {
    it('should parse WGS84 bbox', () => {
      const bbox = [140, -40, 150, -30]; // [W, S, E, N]
      const geoKeys = { GeographicTypeGeoKey: 4326 };
      const result = parseGeoTiffCoords(bbox, geoKeys);
      assert.ok(result);
      if (!result) return;
      assert.deepStrictEqual(result, [
        [140, -30], // TL
        [150, -30], // TR
        [150, -40], // BR
        [140, -40] // BL
      ]);
    });

    it('should parse Web Mercator bbox', () => {
      // Roughly Sydney in meters
      const bbox = [16800000, -4000000, 16900000, -3900000];
      const geoKeys = { ProjectedCSTypeGeoKey: 3857 };
      const result = parseGeoTiffCoords(bbox, geoKeys);
      assert.ok(result);
      if (!result) return;
      // Verify TL is NW of BR
      assert.ok(result[0][0] < result[2][0]); // Lon
      assert.ok(result[0][1] > result[2][1]); // Lat
    });
  });

  describe('parseFilenameCoords', () => {
    it('should parse coordinates from a simple filename', () => {
      const filename = '-27.472667,153.023245,-27.481308,153.033005.png';
      const result = parseFilenameCoords(filename);
      assert.ok(result);
      if (!result) return;
      assert.strictEqual(result.length, 4);
      assert.deepStrictEqual(result[0], [153.023245, -27.472667]); // TL (left, top)
      assert.deepStrictEqual(result[2], [153.033005, -27.481308]); // BR (right, bottom)
    });

    it('should parse coordinates from a full URL', () => {
      const url = 'https://example.com/images/-27.472667,153.023245,-27.481308,153.033005.png';
      const result = parseFilenameCoords(url);
      assert.ok(result);
      if (!result) return;
      assert.deepStrictEqual(result[0], [153.023245, -27.472667]);
    });

    it('should handle URL-encoded commas', () => {
      const url =
        'https://www.abc.net.au/res/sites/news-projects/interactive-bits-aky/builder--27.310706%2C152.534699%2C-27.713365%2C153.304517.webp';
      const result = parseFilenameCoords(url);
      assert.ok(result);
      if (!result) return;
      assert.deepStrictEqual(result[0], [152.534699, -27.310706]);
    });

    it('should return null for invalid formats', () => {
      assert.strictEqual(parseFilenameCoords('map.png'), null);
      assert.strictEqual(parseFilenameCoords('123,456.png'), null);
    });
  });
});
