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
      encode: (z: number) => (typeof z === 'number' ? Math.round(Math.max(0, z) * 100000) : undefined),
      decode: (z: any) => (z !== undefined && z !== null ? Math.max(0, Number(z)) / 100000 : 200)
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
          const styles = ['country', 'level3', 'level4', 'water'];
          const styleIndex = styles.indexOf(style);
          const s = styleIndex > -1 ? styleIndex : style; // Fallback to string if not found
          
          // Compact format: hash,name,style,number,pointless
          // We use a custom delimiter derived from control characters or filtered pipes if name is safe.
          // But JSON array is robust. To be compact, we can just use the array.
          // Base36 encoding the stringified array is what was happening.
          // To be MORE compact, we could use a custom separator if names don't contain it.
          // Let's stick to the current array approach but ensure style is minimized (int).
          
          const data = [hash, name, s, number || 0, Number(pointless || 0)];
           // Remove trailing zeros/defaults to save space?
           // e.g. if pointless is 0, remove it. if number is 0, remove it.
           // [hash, name, s] if others are 0.
           while (data.length > 3 && data[data.length - 1] === 0) {
             data.pop();
           }
          return encode(JSON.stringify(data));
        }),
      decode: (encodedLabels: string | string[]) => {
        if (!encodedLabels) return [];
        const normalised = Array.isArray(encodedLabels) ? encodedLabels : [encodedLabels];
        return (normalised as string[]).map(string => {
          const decodedJSON = decode(string);
          const [encodedCoords, name, styleOrInt, number = 0, pointless = 0] =
            decodedJSON.slice(0, 1) === '['
              ? // Current labels are [coords,name,style,number] array
                JSON.parse(decodedJSON)
              : // legacy labels were fixed length
                [string.slice(0, 7), decode(string.slice(7))];
          
          const styles = ['country', 'level3', 'level4', 'water'];
          const style = typeof styleOrInt === 'number' ? styles[styleOrInt] || 'country' : styleOrInt || 'country';
          
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
