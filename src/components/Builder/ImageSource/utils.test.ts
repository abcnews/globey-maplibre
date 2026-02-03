import assert from 'node:assert';
import { parseKmlCoords, parseNearmapUrl } from './utils.ts';

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
            assert.deepStrictEqual(result[0], [40, 10]);
        });
    });

    describe('parseNearmapUrl', () => {
        const url = 'https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.4809010,153.0041531,18.00z,0d/V/20241106';

        it('should extract lat, lon, zoom, and pitch from URL', () => {
            const result = parseNearmapUrl(url);
            assert.ok(result);
            assert.strictEqual(result.pitch, 0);
            assert.strictEqual(result.coordinates.length, 4);
        });

        it('should calculate correct bounding box for 1920x1080 at zoom 18', () => {
            // center: -27.4809010, 153.0041531
            const result = parseNearmapUrl(url, 1920, 1080);
            assert.ok(result);
            // Rough check for center
            const centerLon = (result.coordinates[0][0] + result.coordinates[1][0]) / 2;
            const centerLat = (result.coordinates[0][1] + result.coordinates[3][1]) / 2;
            assert.ok(Math.abs(centerLon - 153.0041531) < 0.0001);
            assert.ok(Math.abs(centerLat - (-27.4809010)) < 0.0001);
        });

        it('should handle URL with pitch', () => {
            const pitchUrl = 'https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.3546586,153.4187044,17.00z,101d/V/20240611';
            const result = parseNearmapUrl(pitchUrl);
            assert.ok(result);
            assert.strictEqual(result.pitch, 101);
        });

        it('should return null for invalid URLs', () => {
            const invalidUrl = 'https://google.com';
            assert.strictEqual(parseNearmapUrl(invalidUrl), null);
        });
    });
});
