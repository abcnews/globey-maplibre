import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice.geojson';
const OUTPUT_FILE = 'arctic_ice_reordered_lines.geojson';

/**
 * Converts GeoJSON Polygons to LineStrings, reordering the points of each ring
 * so that the largest longitudinal jump occurs between the start and end of the line.
 * This effectively "breaks" the line where it would have crossed the anti-meridian.
 */
function polygonsToReorderedLines() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    const lineFeatures = [];

    turf.flattenEach(geojson, feature => {
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(ring => {
          // 1. Polygons are closed (last point == first).
          // We remove the last point to work with the unique sequence.
          const coords = ring.slice(0, -1);
          if (coords.length < 2) return;

          // 2. Find the largest longitude jump in the circular sequence.
          let maxJump = 0;
          let breakIndex = -1; // Index after which the "break" should occur

          coords.forEach((coord, i) => {
            const next = coords[(i + 1) % coords.length];
            // Calculate longitudinal distance, accounting for 180/-180 wrap
            let jump = Math.abs(coord[0] - next[0]);

            // If the jump is > 180, it's crossing the meridian.
            // We find the segment that spans the widest distance.
            if (jump > maxJump) {
              maxJump = jump;
              breakIndex = i;
            }
          });

          // 3. Rotate the array so the largest jump is the "gap" between end and start.
          // The new start will be breakIndex + 1.
          let reordered;
          if (breakIndex !== -1 && maxJump > 180) {
            const rotationIndex = (breakIndex + 1) % coords.length;
            reordered = [...coords.slice(rotationIndex), ...coords.slice(0, rotationIndex)];
          } else {
            reordered = coords;
          }

          // 4. Create the LineString
          if (reordered.length >= 2) {
            lineFeatures.push(turf.lineString(reordered, feature.properties));
          }
        });
      }
    });

    const outputGeoJSON = turf.featureCollection(lineFeatures);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON, null, 2));

    console.log(`✅ Success! Converted polygons to ${lineFeatures.length} reordered LineStrings.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error);
  }
}

polygonsToReorderedLines();
