---
trigger: always_on
---

# MapLibre Layer Management & Z-Index System

MapLibre GL JS renders layers strictly by array index, which causes stacking race conditions when components load asynchronously. To ensure deterministic stacking and Photoshop-style reordering, we wrap MapLibre in a virtual Z-Index system implemented in [layerManager.ts](../../src/components/CustomGlobe/features/layerManager.ts) and re-exported via [layerUtils.ts](../../src/components/CustomGlobe/features/layerUtils.ts).

* **Never call `map.addLayer()` or `map.removeLayer()` directly in components.** Always use `addLayerWithZIndex(map, layer, zIndex)` and `removeLayerWithZIndex(map, layerId)` imported from `$components/CustomGlobe/features/layerUtils`.
* **Standard Z-Index tiers:** `Z_INDEX_BACKGROUND` (0), `Z_INDEX_BASE_RASTER` (100), `Z_INDEX_BASE_VECTOR` (200), `Z_INDEX_IMAGE_LAYERS` (300), `Z_INDEX_GEOJSON` (400), `Z_INDEX_BASE_LABELS` (500), `Z_INDEX_CUSTOM_LABELS` (600), `Z_INDEX_UI_OVERLAYS` (700).
* **Multi-part layers and outlines:** Use `SUB_LAYER_OUTLINE_OFFSET` (0.001) so that outlines/fills sit beneath their parent stroke/casing (e.g. `zIndex - SUB_LAYER_OUTLINE_OFFSET`).
* **Dynamic reordering:** Call `setLayerZIndex(map, layerId, newZIndex)` to restack an existing layer in real time without removing and re-adding it.
* **Always clean up on unmount:** Invoke `removeLayerWithZIndex(map, layerId)` in component return/destroy cleanup functions to prevent stale entries in the registry.
* **Unindexed layers:** If `zIndex` is `undefined`, the layer is ignored in Z-Index calculations and added with normal MapLibre behaviour.
* **Reference and documentation:** See [layerManager.ts](../../src/components/CustomGlobe/features/layerManager.ts) for constants and implementation, and [MAPLIBRE_LAYERS.md](../../MAPLIBRE_LAYERS.md) for rendering engine background.
