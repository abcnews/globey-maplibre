import { describe, it } from 'vitest';
import assert from 'node:assert';
import {
  globeJsonBlobSchema,
  parseGlobeJsonBlob,
  safeParseGlobeJsonBlob,
  formatGlobeJsonBlob,
  type GlobeJsonBlob
} from './jsonBlob.ts';

describe('globeJsonBlobSchema (Zod)', () => {
  it('should parse minimal valid empty blob with defaults', () => {
    const result = parseGlobeJsonBlob({});
    assert.strictEqual(result.version, 1);
    assert.deepStrictEqual(result.layers, []);
    assert.strictEqual(result.map.projection, 'globe');
    assert.strictEqual(result.map.base, 'satellite');
  });

  it('should validate and parse complete JSON blob with multiple layer types', () => {
    const rawBlob = {
      version: 1,
      title: 'Bushfire Scrollyteller 2026',
      map: {
        projection: 'globe',
        base: 'street',
        animationDuration: 1000,
        coords: [151.2093, -33.8688],
        bounds: [
          [150.0, -35.0],
          [152.0, -33.0]
        ],
        minimap: {
          enabled: true,
          bounds: []
        }
      },
      layers: [
        {
          id: 'layer-raster-1',
          name: 'satellite',
          type: 'raster',
          zIndex: 100,
          url: 'https://example.com/raster/{z}/{x}/{y}.png'
        },
        {
          id: 'layer-geojson-fires',
          name: 'fires',
          type: 'geojson',
          zIndex: 200,
          cmid: 123456,
          geometryType: 'points',
          colourMode: 'simple',
          opacity: 0.8
        },
        {
          id: 'layer-custom-labels',
          name: 'labels',
          type: 'customLabels',
          zIndex: 300,
          labels: [
            {
              name: 'Sydney',
              coords: [151.2, -33.8],
              style: 'country-large',
              number: 0
            }
          ]
        },
        {
          id: 'layer-icon-1',
          name: 'evac',
          type: 'icon',
          zIndex: 400,
          cmid: 998877,
          coords: [150.5, -34.2]
        },
        {
          id: 'layer-image-1',
          name: 'radar',
          type: 'image',
          zIndex: 500,
          url: 'https://example.com/radar.png',
          coordinates: [
            [-180, 85],
            [180, 85],
            [180, -85],
            [-180, -85]
          ]
        },
        {
          id: 'layer-map-labels',
          name: 'builtInLabels',
          type: 'mapLabels',
          zIndex: 600,
          countriesMajor: true,
          cities: true
        },
        {
          id: 'layer-osm',
          name: 'osm',
          type: 'streetMap',
          zIndex: 50,
          hideOsm: false
        }
      ]
    };

    const parsed = parseGlobeJsonBlob(rawBlob);
    assert.strictEqual(parsed.title, 'Bushfire Scrollyteller 2026');
    assert.strictEqual(parsed.layers.length, 7);
    assert.strictEqual(parsed.layers[1].type, 'geojson');
    if (parsed.layers[1].type === 'geojson') {
      assert.strictEqual(parsed.layers[1].cmid, 123456);
      assert.strictEqual(parsed.layers[1].geometryType, 'points');
    }
  });

  it('should format and parse JSON string seamlessly', () => {
    const blob: GlobeJsonBlob = {
      version: 1,
      title: 'Test',
      map: {
        projection: 'globe',
        base: 'dark',
        satelliteVariant: 'black',
        attribution: 'ABC News',
        animationDuration: 500,
        fitGlobe: false,
        constrainView: false
      },
      layers: [
        {
          id: 'fires-layer',
          name: 'fires',
          type: 'geojson',
          zIndex: 10,
          geometryType: 'areas',
          colourMode: 'scale',
          opacity: 1,
          isOpaque: false
        }
      ]
    };

    const jsonStr = formatGlobeJsonBlob(blob);
    const parsed = parseGlobeJsonBlob(jsonStr);
    assert.strictEqual(parsed.title, 'Test');
    assert.strictEqual(parsed.map.base, 'dark');
    assert.strictEqual(parsed.layers.length, 1);
  });

  it('safeParseGlobeJsonBlob should handle invalid layer structures gracefully', () => {
    const invalidBlob = {
      version: 1,
      layers: [
        {
          id: 'invalid-layer',
          type: 'unknownType'
        }
      ]
    };

    const result = safeParseGlobeJsonBlob(invalidBlob);
    assert.strictEqual(result.success, false);
  });
});
