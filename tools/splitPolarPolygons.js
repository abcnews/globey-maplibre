import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice.geojson';
const OUTPUT_FILE = 'arctic_ice_fixed.geojson';

// Configuration
const MAX_LAT = 80;
const LAT_STEP = 20;
const LON_STEP = 90; // Splitting by longitude helps MapLibre calculate bounds

async function fixPolarGeoJSON() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    const splitFeatures = [];

    turf.flattenEach(geojson, feature => {
      // Iterate through Longitude chunks (-180 to 180)
      for (let lon = -180; lon < 180; lon += LON_STEP) {
        // Iterate through Latitude chunks (e.g., 50 to 89.9)
        for (let lat = 0; lat < 90; lat += LAT_STEP) {
          const northernEdge = Math.min(lat + LAT_STEP, MAX_LAT);

          // Create the clipping box
          const bbox = [lon, lat, lon + LON_STEP, northernEdge];

          try {
            const clipped = turf.bboxClip(feature, bbox);

            if (clipped.geometry.coordinates.length > 0) {
              clipped.properties = {
                ...feature.properties,
                chunk_id: `${lat}_${lon}`
              };
              splitFeatures.push(clipped);
            }
          } catch (err) {
            // Silent catch for empty clips
          }
        }
      }
    });

    const outputGeoJSON = turf.featureCollection(splitFeatures);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON));

    console.log(`Finished! Created ${splitFeatures.length} segments.`);
    console.log(`The maximum latitude is now capped at ${MAX_LAT}°`);
  } catch (error) {
    console.error('Processing error:', error);
  }
}

fixPolarGeoJSON();
