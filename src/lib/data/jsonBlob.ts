import { z } from 'zod';

/**
 * Coordinate tuple [longitude, latitude]
 */
export const coordinatesSchema = z.tuple([z.number(), z.number()]);
export type Coordinates = z.infer<typeof coordinatesSchema>;

/**
 * Bounding box as an array of coordinate tuples [[lng, lat], ...]
 */
export const boundsSchema = z.array(coordinatesSchema);
export type Bounds = z.infer<typeof boundsSchema>;

/**
 * Size schema for points and lines (e.g. { value: 12.5, unit: 'k' })
 */
export const sizeSchema = z.object({
  value: z.number(),
  unit: z.enum(['p', 'k'])
});
export type Size = z.infer<typeof sizeSchema>;

/**
 * Property filter schema for GeoJSON features
 */
export const geoJsonFilterSchema = z.object({
  prop: z.string(),
  values: z.array(z.union([z.string(), z.number()]))
});
export type GeoJsonFilter = z.infer<typeof geoJsonFilterSchema>;

/**
 * Colour palette / ramp schema for GeoJSON data
 */
export const geoJsonColourConfigSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  minColour: z.string().optional(),
  maxColour: z.string().optional(),
  basic: z.string().optional(),
  basicType: z.enum(['normal', 'highlighted', 'custom']).optional(),
  paletteType: z.enum(['sequential', 'divergent', 'ramp', 'threshold', 'category', 'custom']).optional(),
  paletteVariant: z.string().optional(),
  customPalette: z.array(z.string()).optional()
});
export type GeoJsonColourConfig = z.infer<typeof geoJsonColourConfigSchema>;

/**
 * 3D spike configuration schema
 */
export const geoJsonSpikeSchema = z.object({
  heightProp: z.string().optional(),
  scalar: z.number().optional(),
  maxHeight: z.number().optional(),
  radius: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional()
});
export type GeoJsonSpike = z.infer<typeof geoJsonSpikeSchema>;

/**
 * Animation clock transition mode for an individual layer
 */
export const animationClockSchema = z.enum(['scroll', 'immediate']);
export type AnimationClock = z.infer<typeof animationClockSchema>;

/**
 * Base layer definition schema with common properties: UUID and user-facing label/name.
 * Rendering stack order comes from each layer's position in `GlobeJsonBlob.layers`, not a stored field.
 */
const baseLayerObject = {
  /** Unique identifier / UUID for the layer */
  id: z.string(),
  /** Friendly, lowercase-alphanumeric name for identifying the layer in the Builder */
  name: z.string().regex(/^[a-z0-9]*$/, 'Lowercase letters and numbers only').optional(),
  /** Per-layer animation clock override */
  animationClock: animationClockSchema.optional()
};

/**
 * GeoJSON Layer schema
 */
export const geoJsonLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('geojson'),
  cmid: z.number().optional(),
  url: z.string().optional(),
  geometryType: z.enum(['areas', 'lines', 'points', 'spikes']).default('areas'),
  colourMode: z.enum(['scale', 'simple', 'basic']).default('simple'),
  colourProp: z.string().optional(),
  colourConfig: geoJsonColourConfigSchema.optional(),
  isOpaque: z.boolean().default(false),
  filter: geoJsonFilterSchema.optional(),
  pointSize: sizeSchema.optional(),
  lineWidth: sizeSchema.optional(),
  spike: geoJsonSpikeSchema.optional()
});
export type GeoJsonLayer = z.infer<typeof geoJsonLayerSchema>;

/**
 * Custom text label item schema
 */
export const labelItemSchema = z.object({
  name: z.string(),
  coords: coordinatesSchema,
  style: z.enum(['country-large', 'country-small', 'water-large', 'water-small']).default('country-large'),
  number: z.number().default(0)
});
export type LabelItem = z.infer<typeof labelItemSchema>;

/**
 * Custom text labels layer schema
 */
export const customLabelsLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('customLabels'),
  labels: z.array(labelItemSchema).default([])
});
export type CustomLabelsLayer = z.infer<typeof customLabelsLayerSchema>;

/**
 * Icon symbol marker layer schema
 */
export const iconLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('icon'),
  cmid: z.number(),
  coords: coordinatesSchema
});
export type IconLayer = z.infer<typeof iconLayerSchema>;

/**
 * Image overlay layer schema
 */
export const imageLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('image'),
  url: z.string(),
  coordinates: boundsSchema
});
export type ImageLayer = z.infer<typeof imageLayerSchema>;

/**
 * Raster map tile layer schema
 */
export const rasterLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('raster'),
  url: z.string(),
  maxZoom: z.number().default(7),
  tileSize: z.number().default(256),
  attribution: z.string().default(''),
  /** Whether this raster layer's imagery is visually dark, so label/UI styling should switch to a dark theme. */
  darkTheme: z.boolean().default(false)
});
export type RasterLayer = z.infer<typeof rasterLayerSchema>;

/**
 * Built-in vector map labels schema
 */
export const mapLabelsLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('mapLabels'),
  /** False when the user has deleted this layer from the builder; distinct from
   *  every sub-field being individually unchecked while the layer stays "added". */
  enabled: z.boolean().default(true),
  countriesMajor: z.boolean().default(true),
  countriesMedium: z.boolean().default(true),
  countriesMinor: z.boolean().default(true),
  continents: z.boolean().default(false),
  states: z.boolean().default(false),
  cities: z.boolean().default(false),
  towns: z.boolean().default(false),
  oceans: z.boolean().default(false),
  nationalBoundaries: z.boolean().default(false),
  stateBoundaries: z.boolean().default(false)
});
export type MapLabelsLayer = z.infer<typeof mapLabelsLayerSchema>;

/**
 * Base vector street map layer schema
 */
export const streetMapLayerSchema = z.object({
  ...baseLayerObject,
  type: z.literal('streetMap'),
  hideOsm: z.boolean().default(false)
});
export type StreetMapLayer = z.infer<typeof streetMapLayerSchema>;

/**
 * Discriminated union of all supported globe layers
 */
export const globeLayerSchema = z.discriminatedUnion('type', [
  geoJsonLayerSchema,
  customLabelsLayerSchema,
  iconLayerSchema,
  imageLayerSchema,
  rasterLayerSchema,
  mapLabelsLayerSchema,
  streetMapLayerSchema
]);
export type GlobeLayer = z.infer<typeof globeLayerSchema>;

/**
 * Minimap locator inset schema
 */
export const minimapSchema = z.object({
  enabled: z.boolean().default(true),
  bounds: boundsSchema.default([])
});
export type MinimapConfig = z.infer<typeof minimapSchema>;

/**
 * Global Map configuration schema (projections, defaults, base)
 */
export const mapDefaultsSchema = z.object({
  projection: z.enum(['globe', 'mercator']).default('globe'),
  base: z.enum(['street', 'dark']).default('street'),
  attribution: z.string().default(''),
  animationDuration: z.number().default(500),
  fitGlobe: z.boolean().default(false),
  constrainView: z.boolean().default(false),
  coords: coordinatesSchema.optional(),
  bounds: boundsSchema.optional(),
  z: z.number().optional(),
  minimap: minimapSchema.optional()
});
export type MapDefaults = z.infer<typeof mapDefaultsSchema>;

/**
 * Root JSON Blob Schema according to REFACTOR.md.
 * Unifies all layers and data upfront for the Scrollyteller and Globeyteller Builder.
 */
export const globeJsonBlobSchema = z.object({
  /** Schema version */
  version: z.literal(1).default(1),
  /** Title or name of the project / graphic */
  title: z.string().optional(),
  /** Global map settings and defaults */
  map: mapDefaultsSchema.default(() => mapDefaultsSchema.parse({})),
  /** All layers available in the presentation; array order defines rendering stack order (index 0 = bottom) */
  layers: z.array(globeLayerSchema).default([])
});
export type GlobeJsonBlob = z.infer<typeof globeJsonBlobSchema>;

/**
 * Parses and validates raw JSON or an unknown object into a validated GlobeJsonBlob.
 */
export function parseGlobeJsonBlob(input: unknown): GlobeJsonBlob {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  return globeJsonBlobSchema.parse(data);
}

/**
 * Safely parses input into GlobeJsonBlob, returning validation errors if invalid.
 */
export function safeParseGlobeJsonBlob(input: unknown) {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    return globeJsonBlobSchema.safeParse(data);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Serialises a GlobeJsonBlob object into formatted JSON string.
 */
export function formatGlobeJsonBlob(blob: GlobeJsonBlob, space = 2): string {
  return JSON.stringify(blob, null, space);
}
