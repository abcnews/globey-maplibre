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

  const beforeId = $derived.by(() => {
    const map = mapRoot.map;
    if (!map) return undefined;

    // Default to below labels
    let id = getLabelAnchor(map);

    // If we have GeoJSON, try to be below the FIRST layer of the FIRST GeoJSON
    // (which is effectively below all GeoJSONs)
    if (geoJsonConfig.length > 0) {
      const firstGj = geoJsonConfig[0];
      const layers = getGeoJsonLayerIds(firstGj);
      if (layers.length > 0) {
        id = layers[0];
      }
    }

    return id;
  });

  $effect(() => {
    const map = mapRoot.map;
    if (!map || config.length === 0) return;

    // This effect ensures that as image sources are added/removed/reordered,
    // they maintain their relative order and their position below beforeId.
    const layerIds = config.map((item: ImageSourceConfig) => getImageLayerId(item));

    const restack = () => {
      // Style must be loaded to reorder layers
      if (!map.isStyleLoaded()) return;
      stackLayers(map, layerIds, beforeId);
    };

    restack();
    map.on('styledata', restack);
    map.on('load', restack);

    return () => {
      map.off('styledata', restack);
      map.off('load', restack);
    };
  });
</script>

{#each config as item (item.id)}
  <ImageSourceHandler config={item} {beforeId} />
{/each}
