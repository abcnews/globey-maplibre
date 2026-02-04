<script lang="ts">
  import { getContext } from 'svelte';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import type { maplibregl } from '../../../mapLibre/index';
  import { getGeoJsonLayerIds, getLabelAnchor, stackLayers } from '../layerUtils';
  import GeoJsonLayerLoader from './GeoJsonLayerLoader.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    // Track config dependency at the top level of the effect
    const currentConfig = config;

    const arrangeLayers = () => {
      // We want to stack GeoJSON layers BELOW map labels
      const beforeId = getLabelAnchor(map);
      const allLayerIds = currentConfig.flatMap(item => getGeoJsonLayerIds(item));
      stackLayers(map, allLayerIds, beforeId);
    };

    if (map.isStyleLoaded()) {
      arrangeLayers();
    } else {
      map.once('styledata', arrangeLayers);
      return () => map.off('styledata', arrangeLayers);
    }
  });
</script>

{#each config as item (item.url)}
  <GeoJsonLayerLoader config={item} />
{/each}
