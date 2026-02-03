import { parse, stringify } from '@abcnews/alternating-case-to-object';
import { decode, encode } from '@abcnews/base-36-text';
import { decodeSchema, encodeSchema } from '@abcnews/hash-codec';
import Geohash from 'latlon-geohash';

export const GEOHASH_PRECISION = 10;

const URL_TOKENS = [
  ['https://www.abc.net.au/res/sites/news-projects/', '~1'],
  ['https://abc.net.au/dat/news/', '~2'],
  ['https://live-production.wcms.abc-cdn.net.au/', '~3']
] as const;

const INVALID_URL_PREFIX = 'https://preview-production.wcms.abc-cdn.net.au/';

export function isValidUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.startsWith(INVALID_URL_PREFIX);
}

export function compressUrl(url: string): string {
  if (!url) return url;
  for (const [full, token] of URL_TOKENS) {
    if (url.startsWith(full)) {
      return url.replace(full, token);
    }
  }
  return url;
}

export function decompressUrl(compressed: string): string {
  if (!compressed) return compressed;
  for (const [full, token] of URL_TOKENS) {
    if (compressed.startsWith(token)) {
      return compressed.replace(token, full);
    }
  }
  return compressed;
}

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
    paletteType?: 'sequential' | 'divergent' | 'custom';
    paletteVariant?: string;
    customPalette?: string[];
  };

  filter?: { prop: string; values: string[] };
  spike?: { heightProp: string; scalar: number };
  pointSize?: string;
}

export interface ImageSourceConfig {
  id: string;
  url: string;
  opacity: number;
  coordinates: [number, number][];
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
  mapLabels?: {
    countries: number;
    states: boolean;
    cities: boolean;
    towns: boolean;
    oceans: boolean;
  };
  geoJson?: GeoJsonConfig[];
  imageSources?: ImageSourceConfig[];
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
  encode: (coords: [number, number]) => (coords ? Geohash.encode(coords[1], coords[0], GEOHASH_PRECISION) : undefined),
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
    bounds?.length ? bounds.map(coords => Geohash.encode(coords[1], coords[0], GEOHASH_PRECISION)).join('') : undefined,
  decode: (hash: string) => {
    if (!hash) return [];
    const points: [number, number][] = [];
    for (let i = 0; i < hash.length; i += GEOHASH_PRECISION) {
      const part = hash.slice(i, i + GEOHASH_PRECISION);
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
 * Custom codec for Custom Labels
 */
export const customLabelsCodec = {
  encode: (labels: Label[]) =>
    labels?.map(({ coords, name, style, number, pointless }) => {
      const hash = Geohash.encode(coords[1], coords[0], GEOHASH_PRECISION);
      const styles = ['country', 'level3', 'level4', 'water'];
      const styleIndex = styles.indexOf(style);
      const s = styleIndex > -1 ? styleIndex : style; // Fallback to string if not found
      
      // Compact format: hash,name,style,number,pointless
      const data = [hash, name, s, number || 0, Number(pointless || 0)];
       // Remove trailing zeros/defaults to save space
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
            [string.slice(0, GEOHASH_PRECISION), decode(string.slice(GEOHASH_PRECISION))];
      
      const styles = ['country', 'level3', 'level4', 'water'];
      const style = typeof styleOrInt === 'number' ? styles[styleOrInt] || 'country' : styleOrInt || 'country';
      
      const { lat, lon } = Geohash.decode(encodedCoords);
      return { name, coords: [Number(lon), Number(lat)], style, number, pointless: Boolean(pointless) };
    });
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
    const condensed = configs
      .filter(config => isValidUrl(config.url))
      .map(config => {
        const types = ['areas', 'lines', 'points', 'spikes'];
        const modes = ['scale', 'simple', 'class', 'override'];

        // [url, type, mode, colourProp, ...]
        const arr: any[] = [compressUrl(config.url), types.indexOf(config.type), modes.indexOf(config.colourMode)];

      if (config.colourProp) arr[3] = config.colourProp;

      // Condense Configs
      if (config.colourConfig || config.filter || config.spike) {
        const extras: any = {};
        if (config.colourConfig) {
          const cc = { ...config.colourConfig };
          // If custom palette, encode colours into a compact base36 string
          if (cc.paletteType === 'custom' && Array.from(cc.customPalette || []).length > 0) {
            cc.customPalette = [
              cc.customPalette!
                .map(c => {
                  let hex = c.replace('#', '');
                  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                  return parseInt(hex, 16).toString(36).padStart(5, '0');
                })
                .join('')
            ] as any; // Store as single-item array/string to trigger compact JSON
          }
          extras.cc = cc;
        }
        if (config.filter) extras.f = config.filter;
        if (config.spike) extras.s = config.spike;
        arr[4] = extras;
      }

      if (config.pointSize) arr[5] = config.pointSize;

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

      return outerArr
        .map((arr: any) => {
          if (!Array.isArray(arr)) return null;
          const [compressedUrl, typeIdx, modeIdx, colourProp, extras] = arr;

          const config: GeoJsonConfig = {
            url: decompressUrl(compressedUrl),
            type: types[typeIdx] || 'areas',
            colourMode: modes[modeIdx] || 'scale'
          };

          if (colourProp) config.colourProp = colourProp;

          if (extras) {
            if (extras.cc) {
              const cc = extras.cc;
              // Decode custom palette if it was compressed
              if (cc.paletteType === 'custom' && Array.isArray(cc.customPalette) && cc.customPalette.length === 1) {
                const encoded = cc.customPalette[0];
                const colours: string[] = [];
                for (let i = 0; i < encoded.length; i += 5) {
                  const chunk = encoded.slice(i, i + 5);
                  colours.push(`#${parseInt(chunk, 36).toString(16).padStart(6, '0')}`);
                }
                cc.customPalette = colours;
              }
              config.colourConfig = cc;
            }
            if (extras.f) config.filter = extras.f;
            if (extras.s) config.spike = extras.s;
          }

          if (arr[5]) config.pointSize = arr[5];

          return config;
        })
        .filter(Boolean) as GeoJsonConfig[];
    } catch (e) {
      return [];
    }
  }
};

/**
 * Custom codec for ImageSource config
 * [url, opacity, coordinates[]]
 */
export const imageSourceCodec = {
  encode: (configs: ImageSourceConfig[]) => {
    if (!configs || configs.length === 0) return undefined;

    const condensed = configs
      .filter(config => isValidUrl(config.url))
      .map(config => {
        // coords -> geohashes
        const hashes = config.coordinates.map(c => Geohash.encode(c[1], c[0], GEOHASH_PRECISION));
        return [compressUrl(config.url), Math.round(config.opacity * 100), hashes];
      });

    return encode(JSON.stringify(condensed));
  },
  decode: (hash: string) => {
    if (!hash) return [];
    try {
      const outerArr = JSON.parse(decode(hash));
      if (!Array.isArray(outerArr)) return [];

      return outerArr.map((arr: any, index: number) => {
        const [compressedUrl, opacityInt, hashes] = arr;
        const coordinates = hashes.map((h: string) => {
          const { lat, lon } = Geohash.decode(h);
          return [Number(lon), Number(lat)];
        });

        return {
          id: `img-${index}`,
          url: decompressUrl(compressedUrl),
          opacity: opacityInt / 100,
          coordinates
        };
      });
    } catch (e) {
      return [];
    }
  }
};

const defaultMapLabels = {
  countries: 3,
  states: false,
  cities: false,
  towns: false,
  oceans: false
};

/**
 * Custom codec for MapLabels
 * Encodes as a 5-character string: [countries][states][cities][towns][oceans]
 * e.g. {countries: 3, states: false, ...} -> "30000"
 */
export const mapLabelsCodec = {
  encode: (val: DecodedObject['mapLabels']) => {
    if (!val) return undefined;

    const isDefault =
      val.countries === defaultMapLabels.countries &&
      val.states === defaultMapLabels.states &&
      val.cities === defaultMapLabels.cities &&
      val.towns === defaultMapLabels.towns &&
      val.oceans === defaultMapLabels.oceans;

    if (isDefault) return undefined;

    return [
      val.countries,
      val.states ? 1 : 0,
      val.cities ? 1 : 0,
      val.towns ? 1 : 0,
      val.oceans ? 1 : 0
    ].join('');
  },
  decode: (hash: any) => {
    if (hash === undefined || hash === null) return { ...defaultMapLabels };
    const s = String(hash).padStart(5, '0');
    if (s.length !== 5) return { ...defaultMapLabels };
    const [countries, states, cities, towns, oceans] = s.split('').map(Number);
    return {
      countries,
      states: states === 1,
      cities: cities === 1,
      towns: towns === 1,
      oceans: oceans === 1
    };
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
    codec: customLabelsCodec,
    defaultValue: []
  },
  base: {
    key: 'base',
    type: 'enum',
    values: ['street', 'countries'],
    defaultValue: 'street'
  },
  mapLabels: {
    key: 'ml',
    type: 'custom',
    codec: mapLabelsCodec,
    defaultValue: defaultMapLabels
  },
  imageSources: {
    key: 'is',
    type: 'custom',
    codec: imageSourceCodec,
    defaultValue: []
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
