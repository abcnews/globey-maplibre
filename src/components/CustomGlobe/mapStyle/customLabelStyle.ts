import type { SymbolLayerSpecification } from 'maplibre-gl';
import { getBaseStyleSource } from './streetMap.ts';
import type { LabelStyle } from '../../../lib/marker';

const SATELLITE_TEXT_COLOUR = '#FFF';
const SATELLITE_HALO_COLOUR = 'rgba(0,0,0,0.8)';

/**
 * Maps custom label styles to their corresponding layer IDs in the base style document.
 */
export const STYLE_LAYER_MAP: Record<LabelStyle, string> = {
  'country-large': 'place-country-rank1-symbol',
  'country-small': 'place-country-rank>=3-symbol',
  'water-large': 'water_name-ocean-symbol',
  'water-small': 'water_name-lake-symbol'
};

/**
 * Extracts and adapts symbol layers verbatim from the base map style document (`styleStoryLab.json`).
 *
 * Why this is needed:
 * 1. Visual consistency: Custom labels reuse the exact fonts, sizing stops, letter spacing,
 *    text transforms, and halos defined in the base map style without hardcoding duplicates.
 * 2. GeoJSON adaptation: The base stylesheet targets OpenMapTiles vector tiles. We strip out
 *    vector-specific constraints (`source-layer`, `minzoom`, `maxzoom`), re-target the layer to
 *    our custom GeoJSON `sourceId`, and scope each layer by feature `style` (`country-large`, etc.).
 * 3. Overlap priority: Enables `text-allow-overlap` and `text-ignore-placement` so user-placed
 *    annotations are never hidden by base map label collision boxes.
 *
 * @param isDark Whether the active base map theme is dark/satellite (applies white text & dark halo)
 * @param sourceId The GeoJSON source ID containing custom label features
 */
export function getCustomLabelLayers(
  isDark = false,
  sourceId = 'custom-labels'
): SymbolLayerSpecification[] {
  const baseStyle = getBaseStyleSource();

  return (Object.entries(STYLE_LAYER_MAP) as [LabelStyle, string][]).map(([styleKey, layerId]) => {
    const baseLayer = baseStyle.layers?.find(l => l.id === layerId) as SymbolLayerSpecification | undefined;
    const layer: SymbolLayerSpecification = baseLayer
      ? JSON.parse(JSON.stringify(baseLayer))
      : {
          id: layerId,
          type: 'symbol',
          source: sourceId,
          layout: { 'text-field': ['get', 'name'] }
        };

    layer.id = `custom-labels-${styleKey}`;
    layer.source = sourceId;
    delete (layer as any)['source-layer'];
    delete layer.minzoom;
    delete layer.maxzoom;

    // Filter by the custom label style property
    layer.filter = ['==', ['get', 'style'], styleKey];

    layer.layout = {
      ...layer.layout,
      'text-field': ['get', 'name'],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      visibility: 'visible'
    };

    // Per-feature opacity so the tween can cross-fade labels between panels.
    // Missing `opacity` (builder / static path) resolves to fully opaque.
    layer.paint = {
      ...(layer.paint ?? {}),
      'text-opacity': ['number', ['get', 'opacity'], 1]
    };

    if (isDark && layer.paint) {
      layer.paint['text-color'] = SATELLITE_TEXT_COLOUR;
      layer.paint['text-halo-color'] = SATELLITE_HALO_COLOUR;
    }

    return layer;
  });
}
