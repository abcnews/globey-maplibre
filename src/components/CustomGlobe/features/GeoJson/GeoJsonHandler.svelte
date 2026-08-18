<script lang="ts">
  import { feature } from 'topojson-client';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { generateGeoJsonSourceId, Z_INDEX_GEOJSON } from '../layerUtils';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

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
          geojson = feature(rawData, rawData.objects[key]);
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
</script>

{#if allLoaded}
  {#each config as item, index (item.url)}
    <GeoJsonRenderer
      data={dataMap[item.url]}
      config={item}
      sourceId={generateGeoJsonSourceId(item.url)}
      zIndex={Z_INDEX_GEOJSON + index * 0.1}
    />
  {/each}
{/if}
