import Geohash from 'latlon-geohash';
import { parse, stringify } from '@abcnews/alternating-case-to-object';
import { object, array, oneOf, decimal, boolean, base36String, string, wrap, z, packBits } from '@abcnews/hash-codec';
import { compressUrl, decompressUrl, isValidUrl } from './utils.ts';

export const GEOHASH_PRECISION = 10;

/**
 * Encodes hex colours into a compact base36 string.
 * @example ["#ff0000", "#00ff00"] -> "2b00000e00"
 */
export function compressPalette(colours: string[]): string {
  return (colours || [])
    .map(c => {
      let hex = c.replace('#', '');
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map(x => x + x)
          .join('');
      }
      return Number.parseInt(hex, 16).toString(36).padStart(5, '0');
    })
    .join('');
}

/**
 * Decodes a base36 string back into hex colours.
 */
export function decompressPalette(encoded: string): string[] {
  if (!encoded) return [];
  const chunks = encoded.match(/.{1,5}/g) || [];
  return chunks.map(chunk => `#${Number.parseInt(chunk, 36).toString(16).padStart(6, '0')}`);
}

/**
 * Coordinate codec converting [longitude, latitude] to a Geohash string.
 * Encodes: [151.2, -33.8] -> "r3gx2ue..."
 * Decodes: "r3gx2ue..." -> [151.2, -33.8]
 */
export const coordsCodec = wrap(z.tuple([z.number(), z.number()])).transform(
  ([lng, lat]: [number, number]) => Geohash.encode(lat, lng, GEOHASH_PRECISION),
  (hash: string) => {
    if (!hash) return [0, 0] as [number, number];
    const { lat, lon } = Geohash.decode(hash);
    return [Number(lon), Number(lat)] as [number, number];
  }
);

/**
 * Bounds codec converting [[longitude, latitude], ...] to concatenated Geohashes.
 */
export const boundsCodec = wrap(z.array(z.tuple([z.number(), z.number()])))
  .default([])
  .transform(
    (bounds: [number, number][]) =>
      bounds?.length ? bounds.map(([lng, lat]) => Geohash.encode(lat, lng, GEOHASH_PRECISION)).join('') : '',
    (hash: string) => {
      if (!hash) return [] as [number, number][];
      const regex = new RegExp(`.{${GEOHASH_PRECISION}}`, 'g');
      return (hash.match(regex) || []).map(part => {
        const { lat, lon } = Geohash.decode(part);
        return [Number(lon), Number(lat)] as [number, number];
      });
    }
  );

/**
 * Codec converting a floating-point number to an integer rounded to 2 decimal places.
 * Encodes: 6.136 -> 614
 * Decodes: 614 -> 6.14
 */
export const twoDecimalCodec = wrap(z.number()).transform(
  (val: number) => Math.round(val * 100),
  (val: number) => val / 100
);

/**
 * Codec for compressing and decompressing recognized ABC URLs.
 */
export const urlCodec = wrap(z.string()).transform(
  (url: string) => (isValidUrl(url) ? compressUrl(url) : url),
  (str: string) => (str ? decompressUrl(str) : '')
);

/**
 * Size schema for GeoJSON points and lines (e.g. { value: 12.5, unit: 'k' }).
 */
export const sizeSchema = object({
  value: decimal(1).key('v'),
  unit: oneOf(['p', 'k'] as const).key('u')
}).asArray();

/**
 * Filter schema for GeoJSON properties.
 */
export const geoJsonFilterSchema = object({
  prop: string().key('p'),
  values: array(wrap(z.union([z.string(), z.number()]))).key('v')
}).asArray();

/**
 * Colour scale configuration schema.
 */
export const geoJsonColourConfigSchema = object({
  min: decimal(2).key('mn').optional(),
  max: decimal(2).key('mx').optional(),
  minColour: string().key('mc').optional(),
  maxColour: string().key('xc').optional(),
  basic: string().key('b').optional(),
  basicType: oneOf(['normal', 'inverse'] as const)
    .key('bt')
    .optional(),
  paletteType: oneOf(['sequential', 'divergent', 'ramp', 'threshold', 'category', 'custom'] as const)
    .key('pt')
    .optional(),
  paletteVariant: string().key('pv').optional(),
  customPalette: wrap(z.array(z.string()))
    .transform(
      (colours: string[]) => (colours?.length ? compressPalette(colours) : ''),
      (str: string) => (str ? decompressPalette(str) : [])
    )
    .key('cp')
    .optional()
}).asArray();

/**
 * Style configuration schema for a GeoJSON layer.
 */
export const geoJsonStyleSchema = object({
  colourMode: oneOf(['scale', 'simple', 'basic'] as const)
    .key('cm')
    .default('scale'),
  colourProp: string().key('cp').optional(),
  colourConfig: geoJsonColourConfigSchema.key('cc').optional(),
  opacity: decimal(2).key('o').default(1),
  isOpaque: boolean().key('io').default(false),
  filter: geoJsonFilterSchema.key('f').optional()
}).asArray();

/**
 * 3D spike configuration schema.
 */
export const geoJsonSpikeSchema = object({
  heightProp: string().key('hp').optional(),
  scalar: decimal(2).key('sc').optional(),
  maxHeight: decimal().key('mh').optional(),
  radius: decimal().key('r').optional(),
  min: decimal(2).key('mn').optional(),
  max: decimal(2).key('mx').optional()
}).asArray();

/**
 * Item schema for a single GeoJSON source dataset.
 */
export const geoJsonItemSchema = object({
  url: urlCodec.key('u'),
  type: oneOf(['areas', 'lines', 'points', 'spikes'] as const)
    .key('t')
    .default('areas'),
  styles: array(geoJsonStyleSchema).key('s').default([]),
  pointSize: sizeSchema.key('ps').optional(),
  lineWidth: sizeSchema.key('lw').optional(),
  spike: geoJsonSpikeSchema.key('sp').optional()
}).asArray();

/**
 * Label schema for custom map annotations.
 */
export const labelSchema = object({
  name: string().key('n'),
  coords: coordsCodec.key('c'),
  style: oneOf(['country-large', 'country-small', 'water-large', 'water-small'] as const)
    .key('s')
    .default('country-large'),
  number: decimal().key('num').default(0)
}).asArray();

/**
 * Image source item schema.
 */
export const imageSourceItemSchema = object({
  id: string().key('id').optional(),
  url: urlCodec.key('u'),
  opacity: decimal(2).key('o').default(1),
  coordinates: boundsCodec.key('c')
}).asArray();

/**
 * MapLabels configuration schema bitpacked into a compact base36 string.
 */
export const mapLabelsSchema = object({
  countriesMajor: boolean(),
  countriesMedium: boolean(),
  countriesMinor: boolean(),
  continents: boolean(),
  states: boolean(),
  cities: boolean(),
  towns: boolean(),
  oceans: boolean(),
  nationalBoundaries: boolean(),
  stateBoundaries: boolean()
})
  .asArray()
  .transform(packBits);

/**
 * Root Marker Schema for globey-maplibre.
 */
export const markerSchema = object({
  coords: coordsCodec.key('geohash').default([0, 0]),
  bounds: boundsCodec.key('b').default([]),
  z: twoDecimalCodec.key('z').default(2),
  base: oneOf(['street', 'satellite'] as const)
    .key('base')
    .default('street'),
  projection: oneOf(['globe', 'mercator'] as const)
    .key('p')
    .default('globe'),
  satelliteVariant: oneOf(['blue', 'black'] as const)
    .key('sv')
    .default('blue'),
  mapLabels: mapLabelsSchema.key('ml').default({
    countriesMajor: true,
    countriesMedium: true,
    countriesMinor: true,
    continents: false,
    states: false,
    cities: false,
    towns: false,
    oceans: false,
    nationalBoundaries: true,
    stateBoundaries: false
  }),
  geoJson: array(geoJsonItemSchema)
    .transform(
      (items: any[]) => items?.filter(item => isValidUrl(Array.isArray(item) ? item[0] : item?.url || item?.u)) ?? [],
      (items: any) => items
    )
    .asBase36()
    .key('gj')
    .default([]),
  imageSources: array(imageSourceItemSchema)
    .transform(
      (items: any[]) => items?.filter(item => isValidUrl(Array.isArray(item) ? item[1] : item?.url || item?.u)) ?? [],
      (items: any) => items
    )
    .asBase36()
    .key('is')
    .default([]),
  labels: array(labelSchema).asBase36().key('labels').default([]),
  fitGlobe: boolean().key('fit').default(false),
  constrainView: boolean().key('cv').default(false),
  attribution: base36String().key('attr').default(''),
  hideOsm: boolean().key('ho').default(false),
  animationDuration: decimal().key('ad').default(2000)
}).transform(
  (encoded: any) => stringify(encoded || {}),
  (input: any) => {
    if (typeof input === 'string') {
      return input ? parse(input) : {};
    }
    return input || {};
  }
);
