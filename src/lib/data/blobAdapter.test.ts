import { describe, it, expect } from 'vitest';
import { blobToDecodedObject, decodedObjectToBlob } from './blobAdapter.ts';
import { type GlobeJsonBlob } from './jsonBlob.ts';
import { createDefaultJsonBlob } from './blobStore.ts';

describe('blobAdapter', () => {
  it('converts empty default GlobeJsonBlob to DecodedObject', () => {
    const blob = createDefaultJsonBlob('Test Title');
    const options = blobToDecodedObject(blob);

    expect(options.coords).toBeDefined();
    expect(options.base).toBe('satellite');
    expect(options.projection).toBe('globe');
    expect(options.geoJson).toEqual([]);
    expect(options.icons).toEqual([]);
  });

  it('converts layers from blob to decodedObject and back', () => {
    const blob: GlobeJsonBlob = {
      version: 1,
      title: 'Layers Test',
      map: {
        projection: 'mercator',
        base: 'street',
        satelliteVariant: 'blue',
        attribution: 'Test Attrib',
        animationDuration: 750,
        fitGlobe: false,
        constrainView: false,
        coords: [151.2, -33.8],
        z: 10
      },
      layers: [
        {
          id: 'gj-1',
          type: 'geojson',
          cmid: 12345,
          geometryType: 'areas',
          colourMode: 'simple',
          opacity: 0.8,
          isOpaque: false,
          zIndex: 410
        },
        {
          id: 'ic-1',
          type: 'icon',
          cmid: 9999,
          coords: [151.2, -33.8],
          zIndex: 420
        },
        {
          id: 'custom-labels',
          type: 'customLabels',
          zIndex: 600,
          labels: [
            {
              name: 'Sydney',
              coords: [151.2, -33.8],
              style: 'country-large',
              number: 0
            }
          ]
        }
      ]
    };

    const options = blobToDecodedObject(blob);

    expect(options.coords).toEqual([151.2, -33.8]);
    expect(options.z).toBe(10);
    expect(options.projection).toBe('mercator');
    expect(options.base).toBe('street');
    expect(options.geoJson?.length).toBe(1);
    expect(options.geoJson?.[0].cmid).toBe(12345);
    expect(options.icons?.length).toBe(1);
    expect(options.icons?.[0].cmid).toBe(9999);
    expect(options.labels?.length).toBe(1);
    expect(options.labels?.[0].name).toBe('Sydney');
    expect(options.labelsZIndex).toBe(600);

    // Now convert back
    const roundtrippedBlob = decodedObjectToBlob(blob, options);
    expect(roundtrippedBlob.map.coords).toEqual([151.2, -33.8]);
    expect(roundtrippedBlob.map.z).toBe(10);
    expect(roundtrippedBlob.layers.length).toBe(3);
  });
});
