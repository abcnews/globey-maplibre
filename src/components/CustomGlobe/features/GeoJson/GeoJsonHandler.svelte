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

    // We want to stack GeoJSON layers BELOW map labels
    const beforeId = getLabelAnchor(map);
    const allLayerIds = config.flatMap(item => getGeoJsonLayerIds(item));

    stackLayers(map, allLayerIds, beforeId);
  });
</script>

{#each config as item (item.url)}
  <GeoJsonLayerLoader config={item} />
{/each}
