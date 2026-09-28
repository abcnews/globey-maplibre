import { parseGlobeJsonBlob, type GlobeJsonBlob } from '../../lib/data/jsonBlob.ts';

/**
 * A minimal blob showing the three things most consumers need: imagery (NASA day/night
 * rasters), GeoJSON loaded from a URL (TopoJSON works too) and custom labels.
 *
 * `parseGlobeJsonBlob()` fills in every schema default, so only the interesting fields are set.
 * Array order is stacking order — index 0 at the bottom.
 */
export const demoBlob: GlobeJsonBlob = parseGlobeJsonBlob({
  title: 'Library demo',
  map: { projection: 'globe', coords: [134, -27], z: 3 },
  layers: [
    // ---- Imagery ----
    {
      id: 'day',
      type: 'raster',
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      attribution: 'NASA Blue Marble'
    },
    {
      id: 'night',
      type: 'raster',
      url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-black-marble/{z}/{x}/{y}.webp',
      maxZoom: 7,
      darkTheme: true,
      attribution: 'NASA Black Marble'
    },

    // ---- GeoJSON: one file, split into kinds by a property filter ----
    {
      id: 'qld',
      type: 'geojsonAreas',
      url: '/test-topojson.json',
      filter: { prop: 'name', values: ['Queensland'] },
      colourMode: 'basic',
      colourConfig: { basic: '#ff6600' }
    },
    {
      id: 'route',
      type: 'geojsonLines',
      url: '/test-topojson.json',
      filter: { prop: 'name', values: ['Between Adelaide and Darwin'] },
      colourMode: 'basic',
      colourConfig: { basic: '#00e5ff' },
      lineWidth: { value: 3, unit: 'p' },
      lineAnimationStyle: 'draw'
    },
    {
      id: 'islands',
      type: 'geojsonPoints',
      url: '/test-topojson.json',
      filter: { prop: 'name', values: ["K'gari", 'Norfolk Island', 'Kangaroo Island', 'Tasmania'] },
      colourMode: 'basic',
      colourConfig: { basic: '#ffd700' },
      pointSize: { value: 8, unit: 'p' }
    },

    // ---- Gridded data (GeoTIFF) ----
    {
      id: 'sstanomaly',
      type: 'gridded',
      url: '/ee-sst-anomaly-month-1.tif',
      colourConfig: { paletteType: 'divergent', paletteVariant: 'RedBlue', min: -3, max: 3 },
      opacity: 0.85
    },
    {
      id: 'indosmoke',
      type: 'gridded',
      url: '/indo-smoke-aug30-0800.tif',
      colourConfig: { paletteType: 'sequential', paletteVariant: 'red', min: 2e-8, max: 2e-7 },
      hideBelowMin: true,
      opacity: 0.9
    },

    // ---- Custom labels ----
    {
      id: 'states',
      type: 'customLabels',
      labels: [
        { name: 'WA', coords: [122.0, -25.5] },
        { name: 'NT', coords: [133.4, -19.4] },
        { name: 'SA', coords: [135.8, -30.0] },
        { name: 'Qld', coords: [144.5, -22.5] },
        { name: 'NSW', coords: [146.9, -32.2] },
        { name: 'Vic', coords: [144.3, -36.9] },
        { name: 'Tas', coords: [146.6, -42.0], style: 'country-small' }
      ]
    }
  ]
});
