export type LabelStyle = 'country-large' | 'country-small' | 'water-large' | 'water-small';

export interface Label {
  name: string;
  coords: [number, number];
  style: LabelStyle;
  number: number;
}

export interface GeoJsonSize {
  value: number;
  unit: 'p' | 'k';
}

export interface GeoJsonColourConfig {
  min?: number;
  max?: number;
  minColour?: string;
  maxColour?: string;
  basic?: string;
  basicType?: 'normal' | 'inverse';
  paletteType?: 'sequential' | 'divergent' | 'ramp' | 'threshold' | 'category' | 'custom';
  paletteVariant?: string;
  customPalette?: string[];
}

export interface GeoJsonFilter {
  prop: string;
  values: (string | number)[];
}

export interface GeoJsonSpike {
  heightProp?: string;
  scalar?: number;
  maxHeight?: number;
  radius?: number;
}

export interface GeoJsonStyleConfig {
  colourMode: 'scale' | 'simple' | 'basic';
  colourProp?: string;
  colourConfig?: GeoJsonColourConfig;
  opacity?: number;
  isOpaque?: boolean;
  filter?: GeoJsonFilter;
}

export interface GeoJsonConfig {
  url: string;
  type: 'areas' | 'lines' | 'points' | 'spikes';
  styles: GeoJsonStyleConfig[];
  pointSize?: GeoJsonSize;
  lineWidth?: GeoJsonSize;
  spike?: GeoJsonSpike;
}

export interface ImageSourceConfig {
  id?: string;
  url: string;
  opacity: number;
  coordinates: [number, number][];
}

export interface MapLabelsConfig {
  countriesMajor: boolean;
  countriesMedium: boolean;
  countriesMinor: boolean;
  continents: boolean;
  states: boolean;
  cities: boolean;
  towns: boolean;
  oceans: boolean;
  nationalBoundaries: boolean;
  stateBoundaries: boolean;
}

export interface DecodedObject {
  z?: number;
  /** coordinate in [longitude, latitude] */
  coords?: [number, number];
  bounds?: [number, number][];
  labels?: Label[];
  base?: 'street' | 'satellite';
  mapLabels?: MapLabelsConfig;
  geoJson?: GeoJsonConfig[];
  imageSources?: ImageSourceConfig[];
  projection?: 'globe' | 'mercator';
  satelliteVariant?: 'blue' | 'black';
  fitGlobe?: boolean;
  constrainView?: boolean;
  attribution?: string;
  hideOsm?: boolean;
  animationDuration?: number;
}

export interface DecodeProps {
  z?: string | number;
  geohash?: string;
  b?: string;
  labels?: string | string[];
  base?: string | number;
  ml?: string | number;
  gj?: string;
  p?: string | number;
  sv?: string | number;
  is?: string;
  fit?: string | number | boolean;
  cv?: string | number | boolean;
  attr?: string;
  ho?: string | number | boolean;
  ad?: string | number;
}
