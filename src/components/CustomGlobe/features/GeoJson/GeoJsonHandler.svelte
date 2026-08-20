<script lang="ts">
  import { feature } from 'topojson-client';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { fetchDownloadObject } from '../../../../lib/fetchDownloadObject';
  import { generateGeoJsonSourceId, Z_INDEX_GEOJSON } from '../layerUtils';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();

  // Local state to store parsed JSON, persisting across prop changes
  let dataMap = $state<Record<number, any>>({});

  // Check if all configurations have their data loaded
  const allLoaded = $derived.by(() => {
    if (config.length === 0) return true;
    return config.every((item: GeoJsonConfig) => !!dataMap[item.cmid]);
  });

  async function fetchAndParse(cmid: number) {
    if (!cmid) return null;
    try {
      const rawData = await fetchDownloadObject(cmid);

      let geojson: any = rawData;
      if (rawData.type === 'Topology') {
        const key = Object.keys(rawData.objects)[0];
        if (key) {
          geojson = feature(rawData, rawData.objects[key]);
        }
      }
      return geojson;
    } catch (e) {
      console.error(`[GeoJsonHandler] Error loading CMID ${cmid}:`, e);
      return null;
    }
  }

  // Reactively fetch data when config changes
  $effect(() => {
    config.forEach((item: GeoJsonConfig) => {
      if (item.cmid && !dataMap[item.cmid]) {
        fetchAndParse(item.cmid).then(data => {
          if (data) {
            dataMap = { ...dataMap, [item.cmid]: data };
          }
        });
      }
    });
  });
</script>

{#if allLoaded}
  {#each config as item, index (item.cmid)}
    <GeoJsonRenderer
      data={dataMap[item.cmid]}
      config={item}
      sourceId={generateGeoJsonSourceId(item.cmid)}
      zIndex={item.zIndex ?? Z_INDEX_GEOJSON + index * 0.1}
    />
  {/each}
{/if}
