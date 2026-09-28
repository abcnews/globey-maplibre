import type { GriddedLayer } from '../../../../lib/data/jsonBlob.ts';
import type { DecodedGrid } from './types.ts';
import { decodeGeoTiff } from './geotiff.ts';
import { timed } from '../timing.ts';

/** TIFF files start `II*\0` (little-endian), `MM\0*` (big-endian), or the BigTIFF `+` equivalents. */
export function isGeoTiff(buffer: ArrayBuffer): boolean {
  const start = String.fromCharCode(...new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)));
  return ['II*\0', 'MM\0*', 'II+\0', 'MM\0+'].includes(start);
}

/**
 * Downloads are cached per URL for the page's lifetime: every colour tweak in the Builder and
 * every panel of a scrollyteller re-decodes from the same buffer, never refetching.
 * A failed download is dropped so it can be retried.
 */
const bufferCache = new Map<string, Promise<ArrayBuffer>>();

function fetchGridBuffer(url: string): Promise<ArrayBuffer> {
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const request = timed(`download ${url}`, () =>
    fetch(url)
      .catch(() => {
        throw new Error('Couldn’t download the file. Check the URL, and that the server allows cross-origin (CORS) requests.');
      })
      .then(response => {
        if (!response.ok) throw new Error(`Couldn’t download the file (HTTP ${response.status})`);
        return response.arrayBuffer();
      })
  );

  bufferCache.set(url, request);
  request.catch(() => bufferCache.delete(url));
  return request;
}

/** Downloads a GeoTIFF and decodes the band a layer points at. */
export async function loadGrid({ url, band }: Pick<GriddedLayer, 'url' | 'band'>): Promise<DecodedGrid> {
  const buffer = await fetchGridBuffer(url);
  if (!isGeoTiff(buffer)) {
    throw new Error('This isn’t a GeoTIFF. Convert it with `gdal_translate -of GTiff in.file out.tif`.');
  }
  return timed(`decode ${url}`, () => decodeGeoTiff(buffer, { band }));
}
