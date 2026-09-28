import type { DecodedGrid } from './types.ts';
import { normaliseGrid } from './normaliseGrid.ts';
import { timed } from '../timing.ts';

/** Web Mercator EPSG codes, including the retired aliases some tools still write. */
const WEB_MERCATOR_CODES = [3857, 3785, 900913, 102100];
/** GeoTIFF "model type" key value for a geographic (lat/lng) raster. */
const MODEL_TYPE_GEOGRAPHIC = 2;
const EARTH_RADIUS = 6378137;

type GeoKeys = Record<string, unknown> | null;

/** Extent of a lat/lng raster; a bbox inside it can't sensibly be in metres. */
const DEGREES_EXTENT = [-180.001, -90.001, 360.001, 90.001];

const looksLikeDegrees = ([minX, minY, maxX, maxY]: number[]) =>
  minX >= DEGREES_EXTENT[0] && minY >= DEGREES_EXTENT[1] && maxX <= DEGREES_EXTENT[2] && maxY <= DEGREES_EXTENT[3];

/**
 * Which of our two supported CRSs the file is in, or undefined for anything else.
 *
 * Some exporters (notably Earth Engine) tag plain lat/lng grids with a projected CRS such as
 * "Equal Earth" while writing degrees for the geotransform. A projected CRS we don't know is
 * therefore still read as lat/lng when its bbox is within degree limits — real projected
 * rasters are in metres, so their bbox is far outside them.
 */
export function geoTiffCrs(geoKeys: GeoKeys, bbox?: number[]): DecodedGrid['crs'] | undefined {
  const projected = Number(geoKeys?.ProjectedCSTypeGeoKey);
  if (WEB_MERCATOR_CODES.includes(projected)) return 3857;
  if (projected && projected !== 32767) return bbox && looksLikeDegrees(bbox) ? 4326 : undefined;
  const isGeographic =
    geoKeys?.GTModelTypeGeoKey === MODEL_TYPE_GEOGRAPHIC || Number(geoKeys?.GeographicTypeGeoKey) === 4326;
  // A GeoTIFF with no geokeys at all is assumed to be lat/lng, same as ImageSource's importer.
  return isGeographic || !geoKeys ? 4326 : undefined;
}

/** Converts a Web Mercator metres x/y to lng/lat. */
function unprojectMercator(x: number, y: number): [number, number] {
  return [(x * 180) / (Math.PI * EARTH_RADIUS), (Math.atan(Math.exp(y / EARTH_RADIUS)) * 360) / Math.PI - 90];
}

const openImage = async (buffer: ArrayBuffer) => {
  const { fromArrayBuffer } = await import('geotiff');
  const tiff = await fromArrayBuffer(buffer);
  return tiff.getImage();
};

/** Decodes one band of a GeoTIFF in EPSG:4326 or EPSG:3857. */
export async function decodeGeoTiff(buffer: ArrayBuffer, { band = 0 }: { band?: number } = {}): Promise<DecodedGrid> {
  const image = await openImage(buffer);
  const crs = geoTiffCrs(image.getGeoKeys(), image.getBoundingBox());
  if (!crs) {
    throw new Error(
      'This GeoTIFF uses a projection we can’t display. Reproject it first, e.g. `gdalwarp -t_srs EPSG:4326 in.tif out.tif`.'
    );
  }

  const bandCount = image.getSamplesPerPixel();
  if (band >= bandCount) throw new Error(`Band ${band + 1} doesn’t exist (this file has ${bandCount})`);

  const [raster] = (await timed('geotiff readRasters', () =>
    image.readRasters({ samples: [band] })
  )) as unknown as ArrayLike<number>[];
  const noData = image.getGDALNoData();
  const values = Float32Array.from(raster, value => (value === noData ? NaN : value));

  const [minX, minY, maxX, maxY] = image.getBoundingBox();
  const [west, south] = crs === 3857 ? unprojectMercator(minX, minY) : [minX, minY];
  const [east, north] = crs === 3857 ? unprojectMercator(maxX, maxY) : [maxX, maxY];

  return normaliseGrid({
    width: image.getWidth(),
    height: image.getHeight(),
    values,
    bounds: [west, south, east, north],
    crs,
    bandCount
  });
}
