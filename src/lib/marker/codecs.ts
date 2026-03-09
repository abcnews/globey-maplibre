import Geohash from 'latlon-geohash';
import { decode, encode } from '@abcnews/base-36-text';
import type { Label, Country, GeoJsonConfig, DecodedObject, ImageSourceConfig, GeoJsonSize } from './types.ts';
import { isValidUrl, compressUrl, decompressUrl } from './utils.ts';

const STYLE_TO_CODE: Record<string, string> = {
  primary: 'p',
  secondary: 's'
};

const CODE_TO_STYLE: Record<string, Country['style']> = Object.fromEntries(
  Object.entries(STYLE_TO_CODE).map(([style, code]) => [code, style as Country['style']])
);

export const GEOHASH_PRECISION = 10;

const GEOJSON_TYPES = ['areas', 'lines', 'points', 'spikes'] as const;
const GEOJSON_MODES = ['scale', 'simple', 'class', 'override'] as const;

/**
 * Encodes hex colors into a compact base36 string.
 */
function compressPalette(colours: string[]): string {
  return (colours || [])
    .map(c => {
      let hex = c.replace('#', '');
      if (hex.length === 3)
        hex = hex
          .split('')
          .map(x => x + x)
          .join('');
      return parseInt(hex, 16).toString(36).padStart(5, '0');
    })
    .join('');
}

/**
 * Decodes a base36 string back into hex colors.
 */
function decompressPalette(encoded: string): string[] {
  const colours: string[] = [];
  for (let i = 0; i < encoded.length; i += 5) {
    const chunk = encoded.slice(i, i + 5);
    colours.push(`#${parseInt(chunk, 36).toString(16).padStart(6, '0')}`);
  }
  return colours;
}

/**
 * Parses a GeoJSON size string (e.g., "12.5k") into a GeoJsonSize object.
 */
export function decodeGeoJsonSize(s: string | undefined): GeoJsonSize | undefined {
  if (!s) return undefined;
  const match = String(s).match(/^(\d+(?:\.\d+)?)([pk])$/);
  if (!match) return undefined;
  return {
    value: Number(match[1]),
    unit: match[2] as 'p' | 'k'
  };
}

/**
 * Formats a GeoJsonSize object into a string (e.g., "12.5k").
 */
export function encodeGeoJsonSize(ps: GeoJsonSize | undefined): string | undefined {
  if (!ps) return undefined;
  return `${ps.value}${ps.unit}`;
}

/**
 * Converts a GeoJsonConfig object into a compact array.
 */
function encodeGeoJsonConfig(config: GeoJsonConfig): any[] {
  const { url, type, colourMode, colourProp, colourConfig, filter, spike, pointSize, lineWidth } = config;

  const typeIdx = GEOJSON_TYPES.indexOf(type);
  const modeIdx = GEOJSON_MODES.indexOf(colourMode);

  let extras: any = undefined;

  // Condense Extras
  if (colourConfig || filter || spike) {
    extras = {};
    if (colourConfig) {
      const cc = { ...colourConfig };
      // If custom palette, encode colors into a compact base36 string
      if (cc.paletteType === 'custom' && Array.isArray(cc.customPalette) && cc.customPalette.length > 0) {
        cc.customPalette = [compressPalette(cc.customPalette)] as any; // Store as single-item array/string
      }
      extras.cc = cc;
    }
    if (filter) extras.f = filter;
    if (spike) extras.s = spike;
  }

  // [url, typeIdx, modeIdx, colourProp, extras, pointSize, lineWidth]
  const arr = [
    isValidUrl(url) ? compressUrl(url) : undefined,
    typeIdx,
    modeIdx,
    colourProp,
    extras,
    encodeGeoJsonSize(pointSize),
    encodeGeoJsonSize(lineWidth)
  ];

  // Trim trailing undefined values to save space
  while (arr.length > 0 && arr[arr.length - 1] === undefined) {
    arr.pop();
  }

  return arr;
}

/**
 * Converts a compact array back into a GeoJsonConfig object.
 */
function decodeGeoJsonConfig(arr: any): GeoJsonConfig | null {
  if (!Array.isArray(arr)) return null;
  const [url, typeIdx, modeIdx, colourProp, extras, pointSize, lineWidth] = arr;

  const config: GeoJsonConfig = {
    url: decompressUrl(url),
    type: GEOJSON_TYPES[typeIdx] || 'areas',
    colourMode: GEOJSON_MODES[modeIdx] || 'scale'
  };

  if (colourProp) config.colourProp = colourProp;

  if (extras) {
    if (extras.cc) {
      const cc = extras.cc;
      // Decode custom palette if it was compressed
      if (cc.paletteType === 'custom' && Array.isArray(cc.customPalette) && cc.customPalette.length === 1) {
        cc.customPalette = decompressPalette(cc.customPalette[0]);
      }
      config.colourConfig = cc;
    }
    if (extras.f) config.filter = extras.f;
    if (extras.s) config.spike = extras.s;
  }

  if (pointSize) config.pointSize = decodeGeoJsonSize(pointSize);
  if (lineWidth) config.lineWidth = decodeGeoJsonSize(lineWidth);

  return config;
}

/**
 * Custom codec for Geohashes
 * Encodes [lon, lat] to a 7-character geohash string
 * @example [151.2, -33.8] -> "r3gx2ue"
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
 * @example [[10, -10], [20, -20]] -> "m7r6ru56m7rdv3t"
 */
export const boundsCodec = {
  encode: (bounds: [number, number][]) =>
    bounds?.length ? bounds.map(coords => Geohash.encode(coords[1], coords[0], GEOHASH_PRECISION)).join('') : undefined,
  decode: (hash: string) => {
    if (!hash) return [];
    const regex = new RegExp(`.{${GEOHASH_PRECISION}}`, 'g');
    return (hash.match(regex) || []).map(part => {
      const { lat, lon } = Geohash.decode(part);
      return [Number(lon), Number(lat)];
    });
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
            const styleChar = STYLE_TO_CODE[c.style] || 'p';
            return c.code.toLowerCase() + styleChar;
          })
          .join('')
      : undefined,
  decode: (hash: string) => {
    if (!hash) return [];
    return (hash.match(/.{3}/g) || []).map(part => {
      const code = part.slice(0, 2).toUpperCase();
      const styleChar = part.slice(2, 3);
      return {
        code,
        style: CODE_TO_STYLE[styleChar] || 'primary'
      };
    });
  }
};

/**
 * Custom codec for Custom Labels
 * Encodes an array of Label objects into an array of base36-encoded JSON strings
 * @example [{coords: [10, -10], name: "Marker"}] -> ["242f36v45917f54c9v4g5q"]
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
 * Flattens config to compact array and encodes as base36 JSON
 * @example [{url: "data.json", type: "areas", mode: "scale"}] -> "242f36v459etc"
 */
export const geoJsonCodec = {
  encode: (configs: GeoJsonConfig[]) => {
    if (!configs || configs.length === 0) return undefined;
    return encode(JSON.stringify(configs.filter(c => isValidUrl(c.url)).map(encodeGeoJsonConfig)));
  },
  decode: (hash: string) => {
    if (!hash) return [];
    try {
      const outerArr = JSON.parse(decode(hash));
      if (!Array.isArray(outerArr)) return [];
      return outerArr.map(decodeGeoJsonConfig).filter(Boolean) as GeoJsonConfig[];
    } catch (e) {
      return [];
    }
  }
};

export const defaultMapLabels = {
  countries: 3,
  states: false,
  cities: false,
  towns: false,
  oceans: false,
  continents: false
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
      val.oceans === defaultMapLabels.oceans &&
      val.continents === defaultMapLabels.continents;

    if (isDefault) return undefined;

    return [
      val.countries,
      val.states ? 1 : 0,
      val.cities ? 1 : 0,
      val.towns ? 1 : 0,
      val.oceans ? 1 : 0,
      val.continents ? 1 : 0
    ].join('');
  },
  decode: (hash: any) => {
    if (hash === undefined || hash === null) return { ...defaultMapLabels };
    const s = String(hash).padEnd(6, '0');
    if (s.length < 5) return { ...defaultMapLabels }; // Support legacy 5-char format
    const [countries, states, cities, towns, oceans, continents = 0] = s.split('').map(Number);
    return {
      countries,
      states: states === 1,
      cities: cities === 1,
      towns: towns === 1,
      oceans: oceans === 1,
      continents: continents === 1
    };
  }
};

/**
 * Custom codec for Image Sources
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
