import type { infer as Infer } from '@abcnews/hash-codec';
import type {
  sizeSchema,
  geoJsonFilterSchema,
  geoJsonColourConfigSchema,
  geoJsonSpikeSchema,
  geoJsonItemSchema,
  labelSchema,
  iconItemSchema,
  imageSourceItemSchema,
  mapLabelsSchema,
  rasterItemSchema,
  minimapSchema,
  markerSchema
} from './schema.ts';

export type LabelStyle = 'country-large' | 'country-small' | 'water-large' | 'water-small';

export type Label = Infer<typeof labelSchema>;
export type GeoJsonSize = Infer<typeof sizeSchema>;
export type GeoJsonColourConfig = Infer<typeof geoJsonColourConfigSchema>;
export type GeoJsonFilter = Infer<typeof geoJsonFilterSchema>;
export type GeoJsonSpike = Infer<typeof geoJsonSpikeSchema>;
export type GeoJsonConfig = Infer<typeof geoJsonItemSchema>;
export type IconConfig = Infer<typeof iconItemSchema>;
export type ImageSourceConfig = Infer<typeof imageSourceItemSchema>;
export type MapLabelsConfig = Infer<typeof mapLabelsSchema>;
export type RasterLayerConfig = Infer<typeof rasterItemSchema>;
export type MinimapConfig = Infer<typeof minimapSchema>;

export type Marker = Infer<typeof markerSchema>;
export type DecodedObject = Partial<Marker>;
