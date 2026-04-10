<script lang="ts">
  import { getContext } from 'svelte';
  import * as topojson from 'topojson-client';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import type { maplibregl } from '../../../mapLibre/index';
  import { getGeoJsonLayerIds, getLabelAnchor, stackLayers, generateGeoJsonSourceId } from '../layerUtils';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  // Local state to store parsed JSON, persisting across prop changes
  let dataMap = $state<Record<string, any>>({});

  // Check if all configurations have their data loaded
  const allLoaded = $derived.by(() => {
    if (config.length === 0) return true;
    return config.every((item: GeoJsonConfig) => !!dataMap[item.url]);
  });

  async function fetchAndParse(url: string) {
    if (!url) return null;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const rawData = await res.json();

      let geojson: any = rawData;
      if (rawData.type === 'Topology') {
        const key = Object.keys(rawData.objects)[0];
        if (key) {
          geojson = topojson.feature(rawData, rawData.objects[key]);
        }
      }
      return geojson;
    } catch (e) {
      console.error(`[GeoJsonHandler] Error loading ${url}:`, e);
      return null;
    }
  }

  // Reactively fetch data when config changes
  $effect(() => {
    config.forEach((item: GeoJsonConfig) => {
      if (!dataMap[item.url]) {
        fetchAndParse(item.url).then(data => {
          if (data) {
            dataMap = { ...dataMap, [item.url]: data };
          }
        });
      }
    });
  });

  // Re-stack layers whenever config changes or children are ready
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !allLoaded) return;

    // Track config dependency at the top level of the effect
    const currentConfig = config;

    const arrangeLayers = () => {
      // Style must be loaded to move layers
      if (!map.isStyleLoaded()) return;

      const beforeId = getLabelAnchor(map);
      const allLayerIds = currentConfig.flatMap((item: GeoJsonConfig) => getGeoJsonLayerIds(item));
      stackLayers(map, allLayerIds, beforeId);
    };

    if (map.isStyleLoaded()) {
      arrangeLayers();
    } else {
      map.on('styledata', arrangeLayers);
      return () => map.off('styledata', arrangeLayers);
    }
  });
</script>

{#if allLoaded}
  {#each config.slice().reverse() as item (item.url)}
    <GeoJsonRenderer 
      data={dataMap[item.url]} 
      config={item} 
      sourceId={generateGeoJsonSourceId(item.url)} 
    />
  {/each}
{/if}
