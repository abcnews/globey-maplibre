import acto from '@abcnews/alternating-case-to-object';
import { decode, encode } from '@abcnews/base-36-text';
import Geohash from 'latlon-geohash';
import { decodeString, encodeString } from './x36';

export interface Label {
  name: string;
  coords: [number, number];
  style: string;
  number: number;
  pointless: boolean;
}

export interface CustomPoint {
  name: string;
  colour: string;
  coords: [number, number];
}

export interface DecodedObject {
  z: number;
  coords: [number, number];
  labels: Label[];
  layers: Record<string, any>;
  atmosphere: any[];
  legend?: any[];
  /** Custom points generated from spreadsheet data */
  customPoints?: CustomPoint[];
  [key: string]: any;
}

export interface DecodeProps {
  z?: string | number;
  geohash?: string;
  labels?: string | string[];
  custompoints?: string;
  cstompoints?: string;
  layers?: string;
  atmosphere?: string;
  legend?: string;
  [key: string]: any;
}

function actoEncode(obj: Record<string, any>) {
  return Object.entries(obj)
    .map(([key, value]) => {
      return [
        key.toUpperCase(),
        Array.isArray(value)
          ? value.map(item => String(item).toLowerCase()).join(key.toUpperCase())
          : String(value).toLowerCase()
      ].join('');
    })
    .join('');
}

/**
 * Encode globey props into a hash string for the url or fragment
 */
export async function encodeFragment({
  coords = [0, 0],
  z,
  labels,
  layers,
  atmosphere,
  customPoints,
  legend,
  ...extraProps
}: Partial<DecodedObject> = {}) {
  // Encode labels as a [coords,name,style,number] array, to cut down on size.
  const encodedLabels = labels?.map(({ coords, name, style, number, pointless }) => {
    const hash = Geohash.encode(coords[1], coords[0], 7);
    const json = JSON.stringify([hash, name, style, number || 0, Number(pointless || 0)]);
    return encode(json);
  });

  const encodedPoints = customPoints?.map(({ coords, name, colour }) => {
    return [name, Geohash.encode(coords[1], coords[0]), colour];
  });

  const objectToEncode = {
    geohash: Geohash.encode(coords[1], coords[0], 7),
    z: typeof z === 'number' ? Math.round(z * 1000) / 1000 : undefined,
    ...(encodedLabels?.length ? { labels: encodedLabels } : undefined),
    layers: encode(JSON.stringify(layers || {})),
    atmosphere: encode(JSON.stringify(atmosphere || [])),
    legend: encode(JSON.stringify(legend || [])),
    ...(encodedPoints ? { cstompoints: await encodeString(JSON.stringify(encodedPoints)) } : undefined),
    ...extraProps
  };

  return actoEncode(objectToEncode);
}

/**
 * Decode globey props in an object. This is probably the one you want to use in
 * Scrollyteller.
 * @example
 * ```js
 * $: ({ coords, zoom, duration = 1000 } = decodeProps(props));
 * ```
 */
export async function decodeObject(props: DecodeProps, isLive = false): Promise<DecodedObject> {
  if (!props) {
    return {
      z: 200,
      coords: [0, 0],
      labels: [],
      layers: {},
      atmosphere: []
    };
  }
  const {
    z,
    geohash,
    labels: encodedLabels = [],
    custompoints: encodedLegacyCustomPoints,
    cstompoints: encodedCustomPoints,
    layers,
    atmosphere,
    legend,
    ...extraProps
  } = props;
  const decodedGeo = geohash ? Geohash.decode(geohash) : { lon: 0, lat: 0 };

  const normalisedEncodedLabels = Array.isArray(encodedLabels) ? encodedLabels : [encodedLabels];
  const labels: Label[] = (normalisedEncodedLabels as string[])?.map(string => {
    const decodedJSON = decode(string);
    const [encodedCoords, name, style, number, pointless] =
      decodedJSON.slice(0, 1) === '['
        ? // Current labels are [coords,name,style,number] array
          JSON.parse(decodedJSON)
        : // legacy labels were fixed length
          [string.slice(0, 7), decode(string.slice(7))];
    const coords = Geohash.decode(encodedCoords);
    return { name, coords: [coords.lon, coords.lat], style, number, pointless: Boolean(pointless) };
  });

  let decodedCustomPoints;
  if (encodedCustomPoints) {
    decodedCustomPoints = JSON.parse(await decodeString(encodedCustomPoints));
  } else if (encodedLegacyCustomPoints) {
    if (isLive) {
      console.error('Old format marker found. Not applying.');
    } else {
      console.time('decoding old format');
      console.log(encodedLegacyCustomPoints);
      decodedCustomPoints = JSON.parse(decode(encodedLegacyCustomPoints));
      console.timeEnd('decoding old format');
    }
  }
  const customPoints: CustomPoint[] | undefined = decodedCustomPoints?.map(
    ([name, geohash, colour]: [string, string, string]) => {
      const coords = Geohash.decode(geohash);
      return { name, colour, coords: [coords.lon, coords.lat] };
    }
  );

  const decodedLayers = layers ? JSON.parse(decode(layers)) : {};
  const decodedAtmosphere = atmosphere ? JSON.parse(decode(atmosphere)) : [];

  const decodedObject: DecodedObject = {
    z: Number(z) || 200,
    coords: [decodedGeo.lon, decodedGeo.lat].map(Number) as [number, number],
    labels,
    layers: decodedLayers,
    atmosphere: decodedAtmosphere,
    legend: legend ? JSON.parse(decode(legend)) : undefined,
    ...(customPoints ? { customPoints } : {}),
    ...extraProps
  };

  return decodedObject;
}

/**
 * Decode globey props back
 */
export async function decodeFragment(fragment: string): Promise<DecodedObject> {
  const props = fragment ? acto(fragment) : {};
  return decodeObject(props);
}
