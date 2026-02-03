/**
 * parseKmlCoords
 * Extracts north, south, east, and west values from a KML string or fragment
 * and returns them as a 4-point coordinate array [TL, TR, BR, BL] as
 * expected by MapLibre image sources.
 * 
 * We use a regex approach here to be robust against XML fragments 
 * and to be testable in a Node environment without DOM dependencies.
 */
export function parseKmlCoords(input: string): [number, number][] | null {
  const extract = (tag: string) => {
    const match = input.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i'));
    return match ? Number(match[1].trim()) : null;
  };

  const n = extract('north');
  const s = extract('south');
  const e = extract('east');
  const w = extract('west');

  if (n !== null && s !== null && e !== null && w !== null && !isNaN(n) && !isNaN(s) && !isNaN(e) && !isNaN(w)) {
    // Return TL, TR, BR, BL
    return [
      [w, n], // TL
      [e, n], // TR
      [e, s], // BR
      [w, s] // BL
    ];
  }

  return null;
}

/**
 * parseNearmapUrl
 * Extracts latitude, longitude, zoom, and pitch from a Nearmap URL
 * and calculates the bounding box for a standard 1920x1080 container.
 */
export function parseNearmapUrl(url: string, width = 1920, height = 1080): { coordinates: [number, number][], pitch: number } | null {
  // Example URL: https://apps.nearmap.com/maps/#/wD1AwlSPT5q9e6b5KpoBvQ/@-27.4809010,153.0041531,18.00z,0d/V/20241106
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+\.?\d*)z,(\d+\.?\d*)d/);
  
  if (!match) return null;

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  const zoom = Number(match[3]);
  const pitch = Number(match[4]);

  const worldSize = 256 * Math.pow(2, zoom);

  // Convert Lat/Lon to "World Pixels"
  function project(lat: number, lon: number) {
    const siny = Math.sin((lat * Math.PI) / 180);
    const y = 0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI);
    const x = 0.5 + lon / 360;
    return {
      x: x * worldSize,
      y: y * worldSize
    };
  }

  // Convert "World Pixels" back to Lat/Lon
  function unproject(x: number, y: number): [number, number] {
    const lon = (x / worldSize - 0.5) * 360;
    const y2 = (y / worldSize - 0.5) * -2 * Math.PI;
    const lat = (2 * Math.atan(Math.exp(y2)) - Math.PI / 2) * (180 / Math.PI);
    return [lon, lat];
  }

  const center = project(lat, lon);

  // Find the corners by offseting half the container dimensions
  // MapLibre image sources expect TL, TR, BR, BL
  // Note: unproject uses (x, y) where y grows downwards (pixel space)
  const tl = unproject(center.x - width / 2, center.y - height / 2);
  const tr = unproject(center.x + width / 2, center.y - height / 2);
  const br = unproject(center.x + width / 2, center.y + height / 2);
  const bl = unproject(center.x - width / 2, center.y + height / 2);

  return {
    coordinates: [tl, tr, br, bl],
    pitch
  };
}

/**
 * parseGeoTiffCoords
 * Converts a GeoTIFF bounding box and geoKeys into MapLibre-ready coordinates.
 * Handles EPSG:3857 (Web Mercator) and EPSG:4326 (WGS84).
 */
export function parseGeoTiffCoords(bbox: number[], geoKeys: any): [number, number][] | null {
  const [minX, minY, maxX, maxY] = bbox;

  // Check for Web Mercator (EPSG:3857 is common)
  const isWebMercator =
    geoKeys.ProjectedCSTypeGeoKey === 3857 ||
    geoKeys.ProjectedCSTypeGeoKey === 3785 ||
    geoKeys.ProjectedCSTypeGeoKey === 900913 ||
    geoKeys.ProjectedCoordinateSystemGeoKey === 3857;

  if (isWebMercator) {
    // Unproject from Web Mercator meters to Lat/Lon
    // Standard Web Mercator radius
    const R = 6378137;

    const unprojectMeters = (x: number, y: number): [number, number] => {
      const lon = (x * 180) / (Math.PI * R);
      const lat = (Math.atan(Math.exp(y / R)) * 360) / Math.PI - 90;
      return [lon, lat];
    };

    const tl = unprojectMeters(minX, maxY);
    const tr = unprojectMeters(maxX, maxY);
    const br = unprojectMeters(maxX, minY);
    const bl = unprojectMeters(minX, minY);

    return [tl, tr, br, bl];
  }

  // Assume WGS84 or similar if not Web Mercator
  // GeoTIFF bbox is [West, South, East, North] for WGS84
  return [
    [minX, maxY], // TL
    [maxX, maxY], // TR
    [maxX, minY], // BR
    [minX, minY] // BL
  ];
}
