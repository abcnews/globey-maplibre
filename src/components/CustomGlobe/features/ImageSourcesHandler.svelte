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

  // Track which images have successfully pre-loaded in the browser cache
  let loadedUrls = $state<Set<string>>(new Set());

  // Wait for all images in the config to be ready
  const allLoaded = $derived.by(() => {
    if (config.length === 0) return true;
    return config.every(item => loadedUrls.has(item.url));
  });

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

  // Pre-load images to prevent flickering/races
  $effect(() => {
    config.forEach(item => {
      if (!loadedUrls.has(item.url)) {
        const img = new Image();
        img.onload = () => {
          loadedUrls.add(item.url);
          loadedUrls = new Set(loadedUrls); // Trigger reactivity
        };
        img.onerror = () => {
          // Even if it fails, mark it so we can proceed (MapLibre will handle the error too)
          console.error(`[ImageSourcesHandler] Failed to pre-load image: ${item.url}`);
          loadedUrls.add(item.url);
          loadedUrls = new Set(loadedUrls);
        };
        img.src = item.url;
      }
    });
  });

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !allLoaded || config.length === 0) return;

    // We MUST re-calculate layerIds here to ensure reactivity picks up everything
    const layerIds = config.map((item: ImageSourceConfig) => getImageLayerId(item));

    const restack = () => {
      // Style must be loaded to reorder layers
      if (!map.isStyleLoaded()) return;
      stackLayers(map, layerIds, beforeId);
    };

    if (map.isStyleLoaded()) {
      restack();
    } else {
      map.on('styledata', restack);
      map.on('load', restack);
      return () => {
        map.off('styledata', restack);
        map.off('load', restack);
      };
    }
  });
</script>

{#if allLoaded}
  {#each config.slice().reverse() as item (item.id)}
    <ImageSourceHandler config={item} {beforeId} />
  {/each}
{/if}
