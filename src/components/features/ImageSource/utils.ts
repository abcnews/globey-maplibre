/**
 * parseKmlCoords
 * Extracts north, south, east, and west values from a KML string or fragment
 * and returns them as a 4-point coordinate array [TL, TR, BR, BL] as
 * expected by MapLibre image sources.
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
export function parseNearmapUrl(
  url: string,
  width = 1920,
  height = 1080
): { coordinates: [number, number][]; pitch: number } | null {
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

  const tl = unproject(center.x - width / 4, center.y - height / 4);
  const tr = unproject(center.x + width / 4, center.y - height / 4);
  const br = unproject(center.x + width / 4, center.y + height / 4);
  const bl = unproject(center.x - width / 4, center.y + height / 4);

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

  const isWebMercator =
    geoKeys.ProjectedCSTypeGeoKey === 3857 ||
    geoKeys.ProjectedCSTypeGeoKey === 3785 ||
    geoKeys.ProjectedCSTypeGeoKey === 900913 ||
    geoKeys.ProjectedCoordinateSystemGeoKey === 3857;

  if (isWebMercator) {
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

  return [
    [minX, maxY], // TL
    [maxX, maxY], // TR
    [maxX, minY], // BR
    [minX, minY] // BL
  ];
}

/**
 * parseFilenameCoords
 * Extracts map coordinates from a filename in the format `top,left,bottom,right.png`
 * returns TL, TR, BR, BL coordinate array.
 */
export function parseFilenameCoords(filename: string): [number, number][] | null {
  const decoded = decodeURIComponent(filename);
  const name = decoded.split('/').pop() || decoded;
  const match = name.match(/(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)/);

  if (!match) return null;

  const top = Number(match[1]);
  const left = Number(match[2]);
  const bottom = Number(match[3]);
  const right = Number(match[4]);

  if (isNaN(top) || isNaN(left) || isNaN(bottom) || isNaN(right)) return null;

  return [
    [left, top], // TL
    [right, top], // TR
    [right, bottom], // BR
    [left, bottom] // BL
  ];
}

/**
 * parseCoordinates
 * Extracts both Lat and Lng from a single string.
 * Supports:
 * - DMS: 22°58'13.85" S 145°14'32.84" E
 * - Decimal: -22.9705, 145.2424
 */
export function parseCoordinates(input: string): { lat: number; lng: number } | null {
  const dmsRegex = /(\d+)°\s*(\d+)'\s*(\d+\.?\d*)"\s*([NSEW])/gi;
  const dmsMatches = Array.from(input.matchAll(dmsRegex));

  if (dmsMatches.length >= 2) {
    const parseMatch = (match: RegExpMatchArray) => {
      const [_, d, m, s, dir] = match;
      let deg = Number(d) + Number(m) / 60 + Number(s) / 3600;
      if (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W') deg = -deg;
      return deg;
    };
    return {
      lat: parseMatch(dmsMatches[0]),
      lng: parseMatch(dmsMatches[1])
    };
  }

  const decimalRegex = /(-?\d+\.\d+)\s*[,\s]\s*(-?\d+\.\d+)/;
  const decMatch = input.match(decimalRegex);
  if (decMatch) {
    const lat = Number(decMatch[1]);
    const lng = Number(decMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}


/**
 * calculateBoundsFromWidth
 * Calculates bounding box coordinates from a center point and a measured ground width.
 */
export function calculateBoundsFromWidth(
  lat: number,
  lng: number,
  widthKm: number,
  aspectRatio: number,
  heading: number = 0
): [number, number][] {
  const latMetersPerDegree = 111319.9;
  const lngMetersPerDegree = latMetersPerDegree * Math.cos((lat * Math.PI) / 180);

  const groundWidth = widthKm * 1000;
  const groundHeight = groundWidth / aspectRatio;

  const halfW = groundWidth / 2;
  const halfH = groundHeight / 2;

  const angleRad = (heading * Math.PI) / 180;
  const cosH = Math.cos(angleRad);
  const sinH = Math.sin(angleRad);

  const corners = [
    [-halfW, halfH], // TL
    [halfW, halfH], // TR
    [halfW, -halfH], // BR
    [-halfW, -halfH] // BL
  ];

  return corners.map(([x, y]) => {
    const xRot = x * cosH + y * sinH;
    const yRot = -x * sinH + y * cosH;

    return [lng + xRot / lngMetersPerDegree, lat + yRot / latMetersPerDegree] as [number, number];
  });
}
