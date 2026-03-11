/**
 * @file node_patchStyleFromBen.js
 * @description Pre-processes the map style exported from Maputnik (styleStoryLabFromBen.json)
 * to apply ABC-specific patches and generate styleStoryLab.json.
 *
 * To run: `npm run patch-style`
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT_FILE = path.resolve(__dirname, 'styleStoryLabFromBen.json');
const OUTPUT_FILE = path.resolve(__dirname, 'styleStoryLab.json');

const OPENMAPTILES_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-tiles-world/world.json';
const SPRITE_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite';
const GLYPHS_URL = 'https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf';

const EXCLUDED_LAYER_IDS = ['terrarium', 'natural_earth_shading'];
const EXCLUDED_SOURCES = ['IndividualCountries', 'NaturalEarthShading', 'terrarium'];

async function patchStyle() {
  try {
    const rawData = await fs.readFile(INPUT_FILE, 'utf-8');
    const style = JSON.parse(rawData);

    // 1. Update asset URLs
    if (style.sources.openmaptiles) {
      style.sources.openmaptiles.url = OPENMAPTILES_URL;
    }
    style.sprite = SPRITE_URL;
    style.glyphs = GLYPHS_URL;

    // 2. Remove excluded sources
    for (const sourceId of EXCLUDED_SOURCES) {
      delete style.sources[sourceId];
    }

    // 3. Process layers
    style.layers = style.layers.filter(layer => {
      // Remove excluded layers
      if (EXCLUDED_LAYER_IDS.includes(layer.id)) return false;
      if (EXCLUDED_SOURCES.includes(layer.source)) return false;
      return true;
    }).map(layer => {
      // 4. Fix Font 404s: Ensure all symbol layers have a valid font stack
      if (layer.type === 'symbol') {
        layer.layout = layer.layout || {};

        // If text-field is present but text-font is missing, MapLibre defaults
        // to Open Sans which causes 404s on our server.
        if (layer.layout['text-field'] && !layer.layout['text-font']) {
          layer.layout['text-font'] = ['ABC Sans Regular'];
        }
      }
      return layer;
    });

    // 5. Write the patched style
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(style, null, 2), 'utf-8');
    console.log(`Successfully patched style and saved to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error patching style:', error);
    process.exit(1);
  }
}

patchStyle();