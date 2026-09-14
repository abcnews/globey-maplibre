import { describe, it, expect } from 'vitest';
import { blobToDecodedObject, decodedObjectToBlob } from './blobAdapter.ts';
import { type GlobeJsonBlob } from './jsonBlob.ts';
import { createDefaultJsonBlob } from './blobStore.ts';

describe('blobAdapter', () => {
  it('converts empty default GlobeJsonBlob to DecodedObject', () => {
    const blob = createDefaultJsonBlob('Test Title');
    const options = blobToDecodedObject(blob);

    expect(options.coords).toBeDefined();
    expect(options.base).toBe('street');
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
          isOpaque: false
        },
        {
          id: 'ic-1',
          type: 'icon',
          cmid: 9999,
          coords: [151.2, -33.8]
        },
        {
          id: 'custom-labels',
          type: 'customLabels',
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
    expect(options.geoJson?.[0].zIndex).toBe(0);
    expect(options.icons?.length).toBe(1);
    expect(options.icons?.[0].cmid).toBe(9999);
    expect(options.icons?.[0].zIndex).toBe(1);
    expect(options.labels?.length).toBe(1);
    expect(options.labels?.[0].name).toBe('Sydney');
    expect(options.labelsZIndex).toBe(2);

    // Now convert back
    const roundtrippedBlob = decodedObjectToBlob(blob, options);
    expect(roundtrippedBlob.map.coords).toEqual([151.2, -33.8]);
    expect(roundtrippedBlob.map.z).toBe(10);
    expect(roundtrippedBlob.layers.length).toBe(3);
    // Original array order is preserved since blobToDecodedObject assigned zIndex
    // straight from position, and decodedObjectToBlob sorted by that same value.
    expect(roundtrippedBlob.layers.map(l => l.type)).toEqual(['geojson', 'icon', 'customLabels']);
    expect('zIndex' in roundtrippedBlob.layers[0]).toBe(false);
  });

  it('reorders layers across kinds by DecodedObject zIndex when converting back to a blob', () => {
    const blob = createDefaultJsonBlob('Reorder Test');
    const options = blobToDecodedObject(blob);

    options.icons = [{ id: 'icon-a', cmid: 1, coords: [0, 0], zIndex: 5 }];
    options.geoJson = [{ id: 'gj-a', type: 'areas', colourMode: 'simple', zIndex: 1 } as any];

    const result = decodedObjectToBlob(blob, options);

    expect(result.layers.map(l => l.type)).toEqual(['geojson', 'icon']);
    result.layers.forEach(layer => expect('zIndex' in layer).toBe(false));
  });

  it('does not persist opacity on geojson/image layers', () => {
    const blob = createDefaultJsonBlob('Opacity Test');
    const options = blobToDecodedObject(blob);

    options.imageSources = [
      { id: 'img-a', url: 'https://example.com/a.png', opacity: 0.4, coordinates: [] as any }
    ];

    const result = decodedObjectToBlob(blob, options);
    const imageLayer = result.layers.find(l => l.type === 'image');
    expect(imageLayer).toBeDefined();
    expect(imageLayer && 'opacity' in imageLayer).toBe(false);
  });

  it('places raster layers by array position and defaults un-indexed items to the top', () => {
    const blob = createDefaultJsonBlob('Raster Test');
    const options = blobToDecodedObject(blob);

    options.rasterLayers = [{ url: 'https://example.com/tiles/{z}/{x}/{y}.png', zIndex: 0 } as any];
    options.icons = [{ id: 'icon-no-z', cmid: 1, coords: [0, 0] }];

    const result = decodedObjectToBlob(blob, options);

    expect(result.layers.map(l => l.type)).toEqual(['raster', 'icon']);
  });

  it('round-trips a raster layer darkTheme flag through blob <-> DecodedObject conversion', () => {
    const blob = createDefaultJsonBlob('Raster Dark Theme Test');
    const options = blobToDecodedObject(blob);

    options.rasterLayers = [
      { url: 'https://example.com/tiles/{z}/{x}/{y}.png', darkTheme: true, zIndex: 0 } as any
    ];

    const result = decodedObjectToBlob(blob, options);
    const rasterLayer = result.layers.find(l => l.type === 'raster');
    expect(rasterLayer && 'darkTheme' in rasterLayer && rasterLayer.darkTheme).toBe(true);

    const roundTripped = blobToDecodedObject(result);
    expect(roundTripped.rasterLayers?.[0]?.darkTheme).toBe(true);
  });

  it('persists a disabled map-labels layer as enabled: false, and restores the _disabled marker on decode', () => {
    const blob = createDefaultJsonBlob('Map Labels Test');
    const options = blobToDecodedObject(blob);

    // Simulates mapLabelsFeature.delete(): materialised + marked disabled.
    options.mapLabels = {
      countriesMajor: false,
      countriesMedium: false,
      countriesMinor: false,
      continents: false,
      states: false,
      cities: false,
      towns: false,
      oceans: false,
      nationalBoundaries: false,
      stateBoundaries: false,
      ...({ _disabled: true } as any)
    };

    const savedBlob = decodedObjectToBlob(blob, options);
    const mapLabelsLayer = savedBlob.layers.find(l => l.type === 'mapLabels');
    expect(mapLabelsLayer).toBeDefined();
    expect(mapLabelsLayer && 'enabled' in mapLabelsLayer && mapLabelsLayer.enabled).toBe(false);

    // Round-tripping through decode must not silently re-enable it.
    const reDecoded = blobToDecodedObject(savedBlob);
    expect((reDecoded.mapLabels as any)?._disabled).toBe(true);
  });

  it('persists an enabled map-labels layer without a disabled marker on decode', () => {
    const blob = createDefaultJsonBlob('Map Labels Enabled Test');
    const options = blobToDecodedObject(blob);

    options.mapLabels = { countriesMajor: true, countriesMedium: true, countriesMinor: true } as any;

    const savedBlob = decodedObjectToBlob(blob, options);
    const mapLabelsLayer = savedBlob.layers.find(l => l.type === 'mapLabels');
    expect(mapLabelsLayer && 'enabled' in mapLabelsLayer && mapLabelsLayer.enabled).toBe(true);

    const reDecoded = blobToDecodedObject(savedBlob);
    expect((reDecoded.mapLabels as any)?._disabled).toBeUndefined();
  });
});
