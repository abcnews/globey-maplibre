import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice_wrapdateline_as_lines.geojson';
const OUTPUT_FILE = 'arctic_ice_reordered.geojson';

/**
 * For each LineString, we assume it was originally a closed polygon ring.
 * If the line currently "jumps" across the anti-meridian, we rotate the 
 * coordinate array so that the largest longitude jump occurs between the
 * last and first points, effectively removing that segment from the LineString.
 */
function reorderLines() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    let fixedCount = 0;

    turf.featureEach(geojson, (feature) => {
      if (feature.geometry.type === 'LineString') {
        const coords = feature.geometry.coordinates;
        if (coords.length < 3) return;

        // We check all segments of the "moral" loop, including the gap 
        // between the current end and start.
        const first = coords[0];
        const last = coords[coords.length - 1];
        
        // Initial max jump is the current gap between end and start
        let maxJump = Math.abs(first[0] - last[0]);
        let breakIndex = -1; // -1 represents the gap between end and start

        // Check internal segments
        coords.forEach((coord, i) => {
          if (i === coords.length - 1) return;
          const next = coords[i + 1];
          const jump = Math.abs(coord[0] - next[0]);
          
          if (jump > maxJump) {
            maxJump = jump;
            breakIndex = i;
          }
        });

        // If the largest jump is internal and > 180 degrees, rotate the array
        // to move that jump to the start/end (the "break").
        if (breakIndex !== -1 && maxJump > 180) {
          const rotationIndex = breakIndex + 1;
          feature.geometry.coordinates = [
            ...coords.slice(rotationIndex),
            ...coords.slice(0, rotationIndex)
          ];
          fixedCount++;
        }
      }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 2));

    console.log(`✅ Success! Reordered ${fixedCount} lines.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error);
  }
}

reorderLines();
