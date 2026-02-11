import fs from 'node:fs';
import * as turf from '@turf/turf';

const INPUT_FILE = 'arctic_ice.geojson';
const OUTPUT_FILE = 'arctic_ice_processed.geojson';

/**
 * Processes GeoJSON Polygons:
 * 1. Truncates precision to 6 decimal places.
 * 2. Rewinds to ensure correct winding order.
 * 3. Reorders ring points so the largest longitudinal jump is at the start/end.
 */
function processPolygons() {
  try {
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);
    
    turf.featureEach(geojson, (feature) => {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        
        // 1. Truncate precision (helps with floating point noise near -180/180)
        feature.geometry = turf.truncate(feature, { precision: 6 }).geometry;

        // 2. Rewind (ensures right-hand rule)
        feature.geometry = turf.rewind(feature, { mutate: true }).geometry;

        // 3. Reorder points to move meridian jumps to the array boundary
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates = feature.geometry.coordinates.map(reorderRing);
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates = feature.geometry.coordinates.map(polygon => 
            polygon.map(reorderRing)
          );
        }
      }
    });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(geojson, null, 2));

    console.log(`✅ Success! Processed polygons with truncate, rewind, and reordering.`);
    console.log(`Saved to ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Error processing GeoJSON:', error);
  }
}

/**
 * Rotates a polygon ring array so the largest longitude jump occurs 
 * between the last point and the first point.
 */
function reorderRing(ring) {
  if (ring.length < 4) return ring; // Need at least a triangle [A, B, C, A]

  // Remove the closing point for calculation
  const coords = ring.slice(0, -1);
  let maxJump = 0;
  let breakIndex = -1;

  coords.forEach((coord, i) => {
    const next = coords[(i + 1) % coords.length];
    let jump = Math.abs(coord[0] - next[0]);
    
    // We prioritize jumps across the anti-meridian (> 180)
    if (jump > maxJump) {
      maxJump = jump;
      breakIndex = i;
    }
  });

  // If we found a substantial jump, rotate
  if (breakIndex !== -1 && maxJump > 10) { // Using 10 as a threshold for "significant"
    const rotationIndex = (breakIndex + 1) % coords.length;
    const reordered = [
      ...coords.slice(rotationIndex),
      ...coords.slice(0, rotationIndex)
    ];
    // Re-add the closing point
    reordered.push(reordered[0]);
    return reordered;
  }

  return ring;
}

processPolygons();
