import type { infer as Infer } from '@abcnews/hash-codec';
import type {
  sizeSchema,
  geoJsonFilterSchema,
  geoJsonColourConfigSchema,
  geoJsonStyleSchema,
  geoJsonSpikeSchema,
  geoJsonItemSchema,
  labelSchema,
  imageSourceItemSchema,
  mapLabelsSchema,
  markerSchema
} from './schema.ts';

export type LabelStyle = 'country-large' | 'country-small' | 'water-large' | 'water-small';

export type Label = Infer<typeof labelSchema>;
export type GeoJsonSize = Infer<typeof sizeSchema>;
export type GeoJsonColourConfig = Infer<typeof geoJsonColourConfigSchema>;
export type GeoJsonFilter = Infer<typeof geoJsonFilterSchema>;
export type GeoJsonSpike = Infer<typeof geoJsonSpikeSchema>;
export type GeoJsonStyleConfig = Infer<typeof geoJsonStyleSchema>;
export type GeoJsonConfig = Infer<typeof geoJsonItemSchema>;
export type ImageSourceConfig = Infer<typeof imageSourceItemSchema>;
export type MapLabelsConfig = Infer<typeof mapLabelsSchema>;

export type Marker = Infer<typeof markerSchema>;
export type DecodedObject = Partial<Marker>;
