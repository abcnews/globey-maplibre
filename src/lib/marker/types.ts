export interface Label {
  name: string;
  coords: [number, number];
  style: string;
  number: number;
}

export interface Country {
  code: string;
  style: 'primary' | 'secondary';
}

export interface GeoJsonSize {
  value: number;
  unit: 'p' | 'k';
}

export interface GeoJsonStyleConfig {
  colourMode: 'scale' | 'simple' | 'basic';
  colourProp?: string;
  colourConfig?: {
    min?: number;
    max?: number;
    minColour?: string;
    maxColour?: string;
    scale?: { [key: string]: string };
    basic?: string;
    basicType?: 'normal' | 'highlighted' | 'custom';
    paletteType?: 'sequential' | 'divergent' | 'custom';
    paletteVariant?: string;
    customPalette?: string[];
  };
  opacity?: number;
  isOpaque?: boolean;
  filter?: { prop: string; values: string[] };
}

export interface GeoJsonConfig {
  url: string;
  type: 'areas' | 'lines' | 'points' | 'spikes';
  styles?: GeoJsonStyleConfig[];
  spike?: {
    heightProp: string;
    scalar: number;
    min?: number;
    max?: number;
  };
  pointSize?: GeoJsonSize;
  lineWidth?: GeoJsonSize;
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
  base?: 'street' | 'countries' | 'satellite';
  mapLabels?: {
    countries: number;
    states: boolean;
    cities: boolean;
    towns: boolean;
    oceans: boolean;
    continents: boolean;
    boundaries: 'none' | 'national' | 'state';
  };
  geoJson?: GeoJsonConfig[];
  imageSources?: ImageSourceConfig[];
  projection?: 'globe' | 'mercator';
  satelliteVariant?: 'blue' | 'black';
  fitGlobe?: boolean;
  attribution?: string;
  hideOsm?: boolean;
}

export interface DecodeProps {
  z?: string | number;
  geohash?: string;
  b?: string;
  labels?: string | string[];
  legend?: string;
  c?: string;
  gj?: string;
  p?: string;
  is?: string;
  attr?: string;
  ho?: string;
}
