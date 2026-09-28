/**
 * Standard default Z-Index constants for MapLibre visual layers.
 *
 * Layers are rendered from lowest Z-Index to highest Z-Index (bottom-to-top).
 *
 * A blob layer's own z-index is derived from its position in `GlobeJsonBlob.layers`
 * by `stackLayers()` (`src/lib/data/stack.ts`), not from these constants. They remain
 * as the base offset and as fallbacks for handlers rendered outside a blob (and for
 * a layer's internal sub-layer offsets).
 */

export const Z_INDEX_BASE_RASTER = 100;

/**
 * Base vector cartographic geometry (land, water bodies, coastlines, roads, country/state boundaries).
 */
export const Z_INDEX_BASE_VECTOR = 200;

/**
 * User-provided image overlay layers (georeferenced raster maps/textures).
 */
export const Z_INDEX_IMAGE_LAYERS = 300;

/**
 * User-provided GeoJSON vector feature layers (polygons, lines, points, spikes).
 */
export const Z_INDEX_GEOJSON = 400;

/**
 * Base map administrative labels and geographic place names.
 */
export const Z_INDEX_BASE_LABELS = 500;

/**
 * Custom user annotations, callout pins, and user label elements.
 */
export const Z_INDEX_CUSTOM_LABELS = 600;

/**
 * Foreground UI overlays and 3D visual indicators.
 */
export const Z_INDEX_UI_OVERLAYS = 700;

/**
 * Offset subtracted for sub-layer outlines so that outlines render directly underneath fills/strokes.
 */
export const SUB_LAYER_OUTLINE_OFFSET = 0.001;
