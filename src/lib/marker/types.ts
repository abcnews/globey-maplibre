export interface Label {
  name: string;
  coords: [number, number];
  style: string;
  number: number;
}

export interface DecodedObject {
  z?: number;
  /** coordinate in [longitude, latutude] */
  coords?: [number, number];
  bounds?: [number, number][];
  labels?: Label[];
  legend?: any[];
  base?: 'street' | 'satellite';
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
  legend?: string;
  c?: string;
  gj?: string;
  p?: string;
  is?: string;
  cv?: string;
  attr?: string;
  ho?: string;
}
