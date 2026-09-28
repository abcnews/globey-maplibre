import { parseGlobeJsonBlob, type GlobeJsonBlob } from './jsonBlob.ts';

/**
 * A pre-configured blob exercising every major layer kind, for demos and manual testing.
 * Uses local `public/` test data (`/test-topojson.json`, the Copernicus image, two GeoTIFFs) plus NASA tiles.
 * Parsed through the schema so every default is filled in.
 */
export function createKitchenSinkBlob(): GlobeJsonBlob {
  return parseGlobeJsonBlob({
    title: 'Kitchen sink demo',
    map: { projection: 'globe', coords: [133.7751, -25.2744], z: 3.5 },
    layers: [
      {
        id: 'bluemarble',
        type: 'raster',
        url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-blue-marble/{z}/{x}/{y}.webp',
        maxZoom: 7,
        darkTheme: false,
        attribution: 'NASA Blue Marble'
      },
      {
        id: 'blackmarble',
        type: 'raster',
        url: 'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-black-marble/{z}/{x}/{y}.webp',
        maxZoom: 7,
        darkTheme: true,
        attribution: 'NASA Black Marble'
      },
      {
        id: 'qld',
        type: 'geojsonAreas',
        url: '/test-topojson.json',
        filter: { prop: 'name', values: ['Queensland'] },
        colourMode: 'basic',
        colourConfig: { basic: '#ff6600' },
        isOpaque: false
      },
      {
        id: 'explorerline',
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
      {
        id: 'tasmania',
        type: 'image',
        url: '/test-copernicus-tas.-39.504041,143.195801,-43.675818,149.540405.avif',
        coordinates: [
          [143.195801, -39.504041],
          [149.540405, -39.504041],
          [149.540405, -43.675818],
          [143.195801, -43.675818]
        ]
      },
      {
        id: 'sstanomaly',
        type: 'gridded',
        // Global sea-surface temperature anomaly (°C), 1° cells. Diverging: blue cold, red warm.
        url: '/ee-sst-anomaly-month-1.tif',
        colourConfig: { paletteType: 'divergent', paletteVariant: 'RedBlue', min: -3, max: 3 },
        opacity: 0.85
      },
      {
        id: 'indosmoke',
        type: 'gridded',
        // Forecast PM2.5 (kg/m³) over Indonesia, 0.4° cells. Most of the grid is faint background, so
        // everything below `min` is transparent and only the plume is coloured.
        url: '/indo-smoke-aug30-0800.tif',
        colourConfig: { paletteType: 'sequential', paletteVariant: 'red', min: 2e-8, max: 2e-7 },
        hideBelowMin: true
      },
      {
        id: 'states',
        type: 'customLabels',
        // Australian states and territories, abbreviated, at rough visual centres.
        labels: [
          { name: 'WA', coords: [122.0, -25.5], style: 'country-large' },
          { name: 'NT', coords: [133.4, -19.4], style: 'country-large' },
          { name: 'SA', coords: [135.8, -30.0], style: 'country-large' },
          { name: 'Qld', coords: [144.5, -22.5], style: 'country-large' },
          { name: 'NSW', coords: [146.9, -32.2], style: 'country-large' },
          { name: 'ACT', coords: [149.0, -35.5], style: 'country-small' },
          { name: 'Vic', coords: [144.3, -36.9], style: 'country-large' },
          { name: 'Tas', coords: [146.6, -42.0], style: 'country-large' }
        ]
      }
    ]
  });
}
