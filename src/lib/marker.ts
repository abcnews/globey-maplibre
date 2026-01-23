import { parse, stringify } from '@abcnews/alternating-case-to-object';
import { decode, encode } from '@abcnews/base-36-text';
import { decodeSchema, encodeSchema } from '@abcnews/hash-codec';
import Geohash from 'latlon-geohash';

export interface Label {
  name: string;
  coords: [number, number];
  style: string;
  number: number;
  pointless: boolean;
}

export interface DecodedObject {
  z?: number;
  /** coordinate in [longitude, latutude] */
  coords?: [number, number];
  bounds?: [number, number][];
  labels?: Label[];
  legend?: any[];
}

export interface DecodeProps {
  z?: string | number;
  geohash?: string;
  b?: string;
  labels?: string | string[];
  legend?: string;
}

/**
 * Custom codec for Geohashes
 * Encodes [lon, lat] to a 7-character geohash string
 */
export const geohashCodec = {
  encode: (coords: [number, number]) => (coords ? Geohash.encode(coords[1], coords[0], 7) : undefined),
  decode: (hash: string) => {
    if (!hash) return [0, 0];
    const { lat, lon } = Geohash.decode(hash);
    return [Number(lon), Number(lat)];
  }
};

/**
 * Custom codec for multiple Geohashes (bounds)
 * Encodes [[lon, lat], ...] to a concatenated geohash string
 */
export const boundsCodec = {
  encode: (bounds: [number, number][]) =>
    bounds?.length ? bounds.map(coords => Geohash.encode(coords[1], coords[0], 7)).join('') : undefined,
  decode: (hash: string) => {
    if (!hash) return [];
    const points: [number, number][] = [];
    for (let i = 0; i < hash.length; i += 7) {
      const part = hash.slice(i, i + 7);
      const { lat, lon } = Geohash.decode(part);
      points.push([Number(lon), Number(lat)]);
    }
    return points;
  }
};

/**
 * Schema for marker data
 */
export const markerSchema = {
  coords: {
    key: 'geohash',
    type: 'custom',
    codec: geohashCodec,
    defaultValue: [0, 0]
  },
  bounds: {
    key: 'b',
    type: 'custom',
    codec: boundsCodec,
    defaultValue: []
  },
  z: {
    key: 'z',
    type: 'custom',
    codec: {
      encode: (z: number) => (typeof z === 'number' ? Math.round(Math.max(0, z) * 1000) : undefined),
      decode: (z: any) => (z !== undefined && z !== null ? Math.max(0, Number(z)) / 1000 : 200)
    },
    defaultValue: 200
  },
  labels: {
    key: 'labels',
    type: 'custom',
    codec: {
      encode: (labels: Label[]) =>
        labels?.map(({ coords, name, style, number, pointless }) => {
          const hash = Geohash.encode(coords[1], coords[0], 7);
          const json = JSON.stringify([hash, name, style, number || 0, Number(pointless || 0)]);
          return encode(json);
        }),
      decode: (encodedLabels: string | string[]) => {
        if (!encodedLabels) return [];
        const normalised = Array.isArray(encodedLabels) ? encodedLabels : [encodedLabels];
        return (normalised as string[]).map(string => {
          const decodedJSON = decode(string);
          const [encodedCoords, name, style, number, pointless] =
            decodedJSON.slice(0, 1) === '['
              ? // Current labels are [coords,name,style,number] array
                JSON.parse(decodedJSON)
              : // legacy labels were fixed length
                [string.slice(0, 7), decode(string.slice(7))];
          const { lat, lon } = Geohash.decode(encodedCoords);
          return { name, coords: [Number(lon), Number(lat)], style, number, pointless: Boolean(pointless) };
        });
      }
    },
    defaultValue: []
  },
  legend: {
    key: 'legend',
    type: 'custom',
    codec: {
      encode: (data: any) => encode(JSON.stringify(data || [])),
      decode: (string: string) => (string ? JSON.parse(decode(string)) : undefined)
    },
    defaultValue: []
  }
};

/**
 * Encode globey props into a hash string for the url or fragment
 */
export async function encodeFragment({ coords, bounds, z, labels, legend, ...extraProps }: DecodedObject) {
  const encoded = await encodeSchema({ data: { coords, bounds, z, labels, legend }, schema: markerSchema });

  const objectToEncode = {
    ...encoded,
    ...extraProps
  };

  return stringify(objectToEncode);
}

/**
 * Decode globey props in an object.
 */
export async function decodeObject(props: DecodeProps, isLive = false): Promise<DecodedObject> {
  const normalisedProps = props || {};
  const decoded = await decodeSchema({ data: normalisedProps, schema: markerSchema });

  const { z: _z, geohash: _geohash, b: _b, labels: _labels, legend: _legend, ...extraProps } = normalisedProps;

  const decodedObject: DecodedObject = {
    ...decoded,
    ...extraProps
  };

  return decodedObject;
}

/**
 * Decode globey props back
 */
export async function decodeFragment(fragment: string): Promise<DecodedObject> {
  const props = fragment ? parse(fragment) : {};
  return decodeObject(props);
}
