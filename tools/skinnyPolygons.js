import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice.geojson';
const OUTPUT_FILE = 'arctic_ice_skinny.geojson';
const TOP_LAT = 89.9; 

/**
 * Creates "skinny polygons" for every segment of the original GeoJSON.
 * For each segment [P1, P2], it creates a quadrilateral:
 * [P1, P2, (P2_longitude, TOP_LAT), (P1_longitude, TOP_LAT), P1]
 */
function createSkinnyPolygons() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    const skinnyFeatures = [];

    turf.flattenEach(geojson, (feature) => {
      if (feature.geometry.type === 'Polygon') {
        feature.geometry.coordinates.forEach((ring) => {
          for (let i = 0; i < ring.length - 1; i++) {
            let p1 = ring[i];
            let p2 = ring[i + 1];

            // Skip segments that cross the anti-meridian (they aren't "skinny")
            // These usually represent the "jump" in 2D GeoJSON.
            if (Math.abs(p1[0] - p2[0]) > 180) continue;

            // Ensure no segment crosses the equator (though Arctic ice should be safe)
            // If one is above and one below, we could split, but for this dataset 
            // we'll just skip or assume they are all North.
            if ((p1[1] > 0 && p2[1] < 0) || (p1[1] < 0 && p2[1] > 0)) {
               // Hard split at equator if necessary
               // For Arctic ice, this shouldn't happen.
            }

            const p1Lon = p1[0];
            const p1Lat = p1[1];
            const p2Lon = p2[0];
            const p2Lat = p2[1];

            // Create the quadrilateral: P1 -> P2 -> (P2_lon, 89.9) -> (P1_lon, 89.9) -> P1
            // This creates a wedge-like shape pointing towards the pole.
            const coords = [[
              [p1Lon, p1Lat],
              [p2Lon, p2Lat],
              [p2Lon, TOP_LAT],
              [p1Lon, TOP_LAT],
              [p1Lon, p1Lat]
            ]];

            try {
              const poly = turf.polygon(coords, {
                ...feature.properties,
                segment_idx: i
              });
              skinnyFeatures.push(poly);
            } catch (e) {
              // Ignore invalid polygons (e.g. coincident points)
            }
          }
        });
      }
    });

    const outputCollection = turf.featureCollection(skinnyFeatures);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputCollection));

    console.log(`✅ Success! Created ${skinnyFeatures.length} skinny polygons.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing:', error);
  }
}

createSkinnyPolygons();
