import { parse, stringify } from '@abcnews/alternating-case-to-object';
import type { DecodedObject, DecodeProps } from './marker/types.ts';
import {
  markerSchema,
  mapLabelsSchema,
  coordsCodec,
  boundsCodec,
  twoDecimalCodec,
  compressPalette,
  decompressPalette,
  GEOHASH_PRECISION
} from './marker/schema.ts';

export * from './marker/types.ts';
export {
  markerSchema,
  mapLabelsSchema,
  coordsCodec,
  boundsCodec,
  twoDecimalCodec,
  compressPalette,
  decompressPalette,
  GEOHASH_PRECISION
};
export { compressUrl, decompressUrl, isValidUrl } from './marker/utils.ts';

/**
 * Encode globey props into an ACTO hash string for the URL or fragment.
 */
export async function encodeFragment(data: DecodedObject): Promise<string> {
  const encoded = await markerSchema.encode(data as any);
  return stringify(encoded || {});
}

/**
 * Decode globey props from an ACTO object.
 */
export async function decodeObject(props: DecodeProps = {}, isLive = false): Promise<DecodedObject> {
  const decoded = await markerSchema.decode(props || {});
  return decoded as DecodedObject;
}

/**
 * Decode globey props from an ACTO hash string fragment.
 */
export async function decodeFragment(fragment: string): Promise<DecodedObject> {
  const props = fragment ? parse(fragment) : {};
  return decodeObject(props as DecodeProps);
}
