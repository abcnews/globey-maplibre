import { parse, stringify } from '@abcnews/alternating-case-to-object';
import { decodeSchema, encodeSchema } from '@abcnews/hash-codec';
import type { DecodedObject, DecodeProps } from './marker/types.ts';
export * from './marker/types.ts';
import { markerSchema } from './marker/schema.ts';
export { markerSchema };
export { compressUrl, decompressUrl, isValidUrl } from './marker/utils.ts';
export {
  geohashCodec,
  boundsCodec,
  GEOHASH_PRECISION,
  customLabelsCodec,
  geoJsonCodec,
  mapLabelsCodec,
  defaultMapLabels
} from './marker/codecs.ts';
/**
 * Encode globey props into a hash string for the url or fragment
 */
export async function encodeFragment(data: DecodedObject) {
  const encoded = await encodeSchema({ data: data, schema: markerSchema });
  return stringify(encoded);
}

/**
 * Decode globey props in an object.
 */
export async function decodeObject(props: DecodeProps, isLive = false): Promise<DecodedObject> {
  const normalisedProps = props || {};
  const decoded = await decodeSchema({ data: normalisedProps, schema: markerSchema });
  return decoded as DecodedObject;
}

/**
 * Decode globey props back
 */
export async function decodeFragment(fragment: string): Promise<DecodedObject> {
  const props = fragment ? parse(fragment) : {};
  return decodeObject(props);
}
