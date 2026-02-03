<script lang="ts">
  import { getContext } from 'svelte';
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { getImageLayerId, getLabelAnchor, stackLayers, getGeoJsonLayerIds } from './layerUtils';
  import ImageSourceHandler from './ImageSourceHandler.svelte';

  let { config = [], geoJsonConfig = [] } = $props<{
    config?: ImageSourceConfig[];
    geoJsonConfig?: any[]; // Pass this to know where to stack images below
  }>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    // We want to stack images BELOW GeoJSON layers and BELOW labels.
    // The safest "beforeId" for the topmost image is the first layer of the first GeoJSON,
    // or if no GeoJSON, the first map label.
    let beforeId = getLabelAnchor(map);

    if (geoJsonConfig.length > 0) {
      const firstGjLayers = getGeoJsonLayerIds(geoJsonConfig[0]);
      if (firstGjLayers.length > 0 && map.getLayer(firstGjLayers[0])) {
        // Technically we want to be below the LAST layer of the LAST GeoJSON?
        // No, we want to be below ALL GeoJSONs if we are images.
        // So we should find the most bottom GeoJSON layer and be below that?
        // Actually moveLayer(id, beforeId) puts 'id' BEFORE 'beforeId' (above it).
        // Wait, MapLibre moveLayer(id, beforeId) places 'id' at index of 'beforeId',
        // effectively pushing 'beforeId' up. So 'id' is BELOW 'beforeId'.

        // Let's verify MapLibre moveLayer:
        // "Moves a layer to a different z-order. The layer will be inserted before the layer with ID 'beforeId'."
        // So yes, moveLayer('image', 'geojson-1') puts 'image' BELOW 'geojson-1'.

        // So for images to be below ALL GeoJSONs, we should find the BOTTOM-MOST GeoJSON layer id.
        const lastGj = geoJsonConfig[geoJsonConfig.length - 1];
        const lastGjLayers = getGeoJsonLayerIds(lastGj);
        if (lastGjLayers.length > 0) {
          beforeId = lastGjLayers[lastGjLayers.length - 1];
        }
      }
    }

    const layerIds = config.map(item => getImageLayerId(item));
    stackLayers(map, layerIds, beforeId);
  });
</script>

{#each config as item (item.id + item.url)}
  <ImageSourceHandler config={item} />
{/each}
