import fs from 'node:fs/promises';
import path from 'node:path';
import * as d3 from 'd3-geo';
import sharp from 'sharp';

const INPUT_FILE = path.resolve(import.meta.dirname, 'arctic_ice.geojson');
const OUTPUT_FILE = path.resolve(import.meta.dirname, 'arctic_ice_mercator.png');
const SIZE = 4096; // High res for tiling

async function renderWithSharp() {
  try {
    const rawData = await fs.readFile(INPUT_FILE, 'utf8');
    const geojson = JSON.parse(rawData);

    // 1. Setup Mercator Projection
    // Scale is (Size / 2PI)
    const projection = d3
      .geoMercator()
      .scale(SIZE / (2 * Math.PI))
      .translate([SIZE / 2, SIZE / 2]);

    const pathGenerator = d3.geoPath(projection);

    // 2. Generate the SVG path data
    const pathData = pathGenerator(geojson);

    // 3. Wrap in a simple SVG string
    // We set the background to transparent and the path to solid orange (consistent with other script)
    const svg = `
            <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
                <path d="${pathData}" fill="orange" stroke="none" />
            </svg>
        `;

    // 4. Use Sharp to convert SVG to PNG
    await sharp(Buffer.from(svg)).png().toFile(OUTPUT_FILE);

    console.log(`✅ Success! Rendered to ${OUTPUT_FILE} using Sharp.`);
  } catch (err) {
    console.error('❌ Rendering failed:', err);
  }
}

renderWithSharp();
