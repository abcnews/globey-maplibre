import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice_wrapdateline.geojson';
const OUTPUT_FILE = 'arctic_ice_wrapdateline_as_lines.geojson';

function polygonsToLines() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    const lineFeatures = [];

    turf.flattenEach(geojson, feature => {
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        // For each ring in the polygon (exterior + holes)
        geometry.coordinates.forEach(ring => {
          // If the user "doesn't need them to close", we can strip the last point
          // which is identical to the first in a valid Polygon ring.
          const coords = ring.slice(0, -1);

          if (coords.length >= 2) {
            lineFeatures.push(turf.lineString(coords, feature.properties));
          }
        });
      }
    });

    const outputGeoJSON = turf.featureCollection(lineFeatures);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON));

    console.log(`✅ Success! Converted polygons to ${lineFeatures.length} LineStrings.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error);
  }
}

polygonsToLines();
