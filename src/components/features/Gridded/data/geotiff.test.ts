import { writeArrayBuffer } from 'geotiff';
import { describe, expect, it } from 'vitest';
import { decodeGeoTiff, geoTiffCrs } from './geotiff.ts';

/** A 3×2 lat/lng GeoTIFF covering 0…30°E, 0…20°N. */
const fixture = () =>
  writeArrayBuffer([1, 2, 3, 4, 5, 6], {
    width: 3,
    height: 2,
    ModelPixelScale: [10, 10, 0],
    ModelTiepoint: [0, 0, 0, 0, 20, 0],
    GTModelTypeGeoKey: 2,
    GeographicTypeGeoKey: 4326
  } as any);

describe('geoTiffCrs', () => {
  it('recognises lat/lng and Web Mercator, and rejects other projections', () => {
    expect(geoTiffCrs({ GTModelTypeGeoKey: 2 })).toBe(4326);
    expect(geoTiffCrs({ ProjectedCSTypeGeoKey: 3857 })).toBe(3857);
    expect(geoTiffCrs({ ProjectedCSTypeGeoKey: 28355 })).toBeUndefined();
  });

  it('reads a mislabelled projected CRS as lat/lng only when its bbox is in degrees', () => {
    expect(geoTiffCrs({ ProjectedCSTypeGeoKey: 8859 }, [-180, -90, 180, 90])).toBe(4326);
    expect(geoTiffCrs({ ProjectedCSTypeGeoKey: 28355 }, [300000, 6000000, 400000, 6100000])).toBeUndefined();
  });
});

describe('decodeGeoTiff', () => {
  it('reads values, bounds and band count', async () => {
    const grid = await decodeGeoTiff(fixture());
    expect(grid).toMatchObject({ width: 3, height: 2, crs: 4326, bounds: [0, 0, 30, 20], bandCount: 1 });
    expect(Array.from(grid.values)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('rejects a band the file doesn’t have', async () => {
    await expect(decodeGeoTiff(fixture(), { band: 2 })).rejects.toThrow(/Band 3/);
  });
});
