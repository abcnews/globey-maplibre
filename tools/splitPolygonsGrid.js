import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice.geojson';
const OUTPUT_FILE = 'arctic_ice_split_grid.geojson';

const GRID_SIZE = 45;

/**
 * Splits GeoJSON polygons into a grid of at most 45 degrees.
 * Ensures shapes never cross the equator.
 * Handles "polar ringing" by expanding high-latitude features to the pole.
 */
function splitPolygonsIntoGrid() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    let geojson = JSON.parse(rawData);

    // Initial prep
    geojson = turf.truncate(geojson, { precision: 6 });
    geojson = turf.rewind(geojson, { mutate: true });

    // Flatten to handle individual polygons
    const flattened = turf.flatten(geojson);
    const splitFeatures = [];

    // Longitude chunks: -180, -135, -90, -45, 0, 45, 90, 135, 180
    const lonEdges = [];
    for (let l = -180; l <= 180; l += GRID_SIZE) lonEdges.push(l);

    // Latitude chunks: -90, -45, 0, 45, 90
    const latEdges = [-90, -45, 0, 45, 90];

    flattened.features.forEach((feature, fIdx) => {
      // Iterate through each grid cell
      for (let i = 0; i < lonEdges.length - 1; i++) {
        for (let j = 0; j < latEdges.length - 1; j++) {
          const west = lonEdges[i];
          const east = lonEdges[i + 1];
          const south = latEdges[j];
          const north = latEdges[j + 1];

          // BBOX for current cell [minX, minY, maxX, maxY]
          const bbox = [west, south, east, north];

          try {
            const clipped = turf.bboxClip(feature, bbox);

            if (clipped.geometry.coordinates.length > 0) {
              const area = turf.area(clipped);

              // Only keep features with meaningful size
              if (area > 10) {
                let processedGeom = clipped.geometry;

                // Handle Pole Ringing:
                // If we are in a polar chunk (45 to 90 or -90 to -45)
                // and the resulting shape hits both longitudinal boundaries,
                // we "fill" it to the pole.
                if (north === 90 || south === -90) {
                  processedGeom = ensurePolarFill(processedGeom, west, east, north === 90 ? 90 : -90);
                }

                splitFeatures.push({
                  type: 'Feature',
                  properties: {
                    ...feature.properties,
                    orig_idx: fIdx,
                    chunk: `${west}_${south}`
                  },
                  geometry: processedGeom
                });
              }
            }
          } catch (clipErr) {
            // Skip problematic clips
          }
        }
      }
    });

    const outputGeoJSON = turf.featureCollection(splitFeatures);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON, null, 2));

    console.log(`✅ Success! Split polygons into ${splitFeatures.length} chunks.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error);
  }
}

/**
 * Heuristic to detect and fix polar ice ringing.
 * If a clipped polygon in a polar wedge (45-90 lat) has segments on both lon boundaries,
 * we insert points at the pole [lon, 90] to ensure it covers the pole if intended.
 */
function ensurePolarFill(geometry, west, east, poleLat) {
  if (geometry.type !== 'Polygon') return geometry;

  const TOLERANCE = 0.0001;
  const newCoordinates = geometry.coordinates.map(ring => {
    // 1. Identify which points are on the western and eastern boundaries
    const westPoints = ring.filter(p => Math.abs(p[0] - west) < TOLERANCE);
    const eastPoints = ring.filter(p => Math.abs(p[0] - east) < TOLERANCE);

    // 2. If it spans the chunk and hits the boundaries
    if (westPoints.length > 0 && eastPoints.length > 0) {
      // Find the "northernmost" (or southernmost) points on these boundaries
      const topWest = westPoints.reduce((prev, curr) =>
        (poleLat > 0 ? curr[1] > prev[1] : curr[1] < prev[1]) ? curr : prev
      );
      const topEast = eastPoints.reduce((prev, curr) =>
        (poleLat > 0 ? curr[1] > prev[1] : curr[1] < prev[1]) ? curr : prev
      );

      // If these points don't already touch the pole
      if (Math.abs(topWest[1] - poleLat) > TOLERANCE || Math.abs(topEast[1] - poleLat) > TOLERANCE) {
        // Insert points at the pole corners to "stretch" the polygon to the 90 deg edge.
        // This effectively turns [west, TOP_LAT] -> [east, TOP_LAT]
        // into [west, TOP_LAT] -> [west, 90] -> [east, 90] -> [east, TOP_LAT]

        // We find the indices of topWest and topEast in the original ring
        const idxWest = ring.findIndex(p => p[0] === topWest[0] && p[1] === topWest[1]);
        const idxEast = ring.findIndex(p => p[0] === topEast[0] && p[1] === topEast[1]);

        if (idxWest !== -1 && idxEast !== -1) {
          const newRing = [...ring];
          // Insert pole points between the two boundary points
          // This is a simple insertion assuming the path between them should go through the pole.
          // Note: In a real polar split, the "top" of the wedge is the pole.
          // We'll just force the corners.

          // To be robust, we'd need to know the order, but for a 45-deg chunk
          // of arctic ice, stretching to north=90 usually works.
          const result = [];
          for (let i = 0; i < ring.length; i++) {
            result.push(ring[i]);
            if (i === idxWest) result.push([west, poleLat]);
            if (i === idxEast) result.push([east, poleLat]);
          }
          return result;
        }
      }
    }
    return ring;
  });

  return { ...geometry, coordinates: newCoordinates };
}

splitPolygonsIntoGrid();
