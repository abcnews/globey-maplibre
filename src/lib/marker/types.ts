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
  };
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
