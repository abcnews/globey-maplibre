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

export interface Country {
  code: string;
  style: 'primary' | 'secondary';
}

export interface GeoJsonConfig {
  url: string;
  type: 'areas' | 'lines' | 'points' | 'spikes';
  colourMode: 'scale' | 'simple' | 'class' | 'override';
  colourProp?: string;
  colourConfig?: {
    min?: number;
    max?: number;
    minColour?: string;
    maxColour?: string;
    scale?: { [key: string]: string };
    override?: string;
    paletteType?: 'sequential' | 'divergent';
    paletteVariant?: string;
  };

  filter?: { prop: string; values: string[] };
  spike?: { heightProp: string; scalar: number };
}

export interface DecodedObject {
  z?: number;
  /** coordinate in [longitude, latutude] */
  coords?: [number, number];
  bounds?: [number, number][];
  highlightCountries?: Country[];
  labels?: Label[];
  legend?: any[];
  base?: string;
  geoJson?: GeoJsonConfig[];
}

export interface DecodeProps {
  z?: string | number;
  geohash?: string;
  b?: string;
  labels?: string | string[];
  legend?: string;
  c?: string;
  gj?: string;
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
 * Custom codec for country codes.
 * Encodes each country into 3 characters: 2 for the lowercase code, 
 * plus 'p' or 's' for primary or secondary styling.
 * e.g. [{code: 'AU', style: 'primary'}] -> "aup"
 */
export const countriesCodec = {
  encode: (countries: Country[]) =>
    countries
      ? countries
          .map(c => {
            const styleChar = c.style === 'secondary' ? 's' : 'p';
            return c.code.toLowerCase() + styleChar;
          })
          .join('')
      : undefined,
  decode: (hash: string) => {
    if (!hash) return [];
    
    const parts = hash.match(/.{3}/g) || [];
    return (parts as string[]).reduce<Country[]>((countries, part) => {
      const code = part.slice(0, 2).toUpperCase();
      const styleChar = part.slice(2, 3);
      countries.push({
        code,
        style: styleChar === 's' ? 'secondary' : 'primary'
      });
      return countries;
    }, []);

  }
};


/**
 * Custom codec for GeoJSON config
 * Flattens config to compact array
 */
export const geoJsonCodec = {
  encode: (configs: GeoJsonConfig[]) => {
    if (!configs || configs.length === 0) return undefined;
    
    // Config[] -> Array<CompactArray>
    const condensed = configs.map(config => {
        const types = ['areas', 'lines', 'points', 'spikes'];
        const modes = ['scale', 'simple', 'class', 'override'];

        // [url, type, mode, colourProp, ...]
        const arr: any[] = [
        config.url,
        types.indexOf(config.type),
        modes.indexOf(config.colourMode)
        ];

        if (config.colourProp) arr[3] = config.colourProp;

        // Condense Configs
        if (config.colourConfig || config.filter || config.spike) {
        const extras: any = {};
        if (config.colourConfig) extras.cc = config.colourConfig;
        if (config.filter) extras.f = config.filter;
        if (config.spike) extras.s = config.spike;
        arr[4] = extras;
        }

        return arr;
    });

    return encode(JSON.stringify(condensed));
  },
  decode: (hash: string) => {
    if (!hash) return [];
    try {
      const outerArr = JSON.parse(decode(hash));
      if (!Array.isArray(outerArr)) return [];

      const types = ['areas', 'lines', 'points', 'spikes'] as const;
      const modes = ['scale', 'simple', 'class', 'override'] as const;

      return outerArr.map((arr: any) => {
          if (!Array.isArray(arr)) return null;
          const [url, typeIdx, modeIdx, colourProp, extras] = arr;

          const config: GeoJsonConfig = {
            url,
            type: types[typeIdx] || 'areas',
            colourMode: modes[modeIdx] || 'scale'
          };

          if (colourProp) config.colourProp = colourProp;

          if (extras) {
            if (extras.cc) config.colourConfig = extras.cc;
            if (extras.f) config.filter = extras.f;
            if (extras.s) config.spike = extras.s;
          }

          return config;
      }).filter(Boolean) as GeoJsonConfig[];
    } catch (e) {
      return [];
    }
  }
};

/**
 * Schema for marker data
 */
export const markerSchema = {
  geoJson: {
    key: 'gj',
    type: 'custom',
    codec: geoJsonCodec,
    defaultValue: []
  },
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
  highlightCountries: {
    key: 'c',
    type: 'custom',
    codec: countriesCodec,
    defaultValue: []
  },
  z: {
    key: 'z',
    type: 'custom',
    codec: {
      encode: (z: number) => (typeof z === 'number' ? Math.round(Math.max(0, z) * 100000) : undefined),
      decode: (z: any) => (z !== undefined && z !== null ? Math.max(0, Number(z)) / 100000 : 200)
    },
    defaultValue: 2
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
  base: {
    key: 'base',
    type: 'enum',
    values: ['street', 'countries'],
    defaultValue: 'street'
  }
};

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
