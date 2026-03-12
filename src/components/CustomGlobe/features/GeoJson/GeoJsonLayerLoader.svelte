<script lang="ts">
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import GeoJsonRenderer from './GeoJsonRenderer.svelte';
  import * as topojson from 'topojson-client';
  import { generateId } from './utils';

  let { config } = $props<{ config: GeoJsonConfig }>();

  let data = $state.raw<any>(null);
  let lastUrl = '';
  let sourceId = $derived(generateId(config.url));

  async function fetchAndParse(url: string) {
    if (!url) return;
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
      data = geojson;
      if (geojson?.features?.length > 0) {
        console.log(`[GeoJSON] Loaded ${geojson.features.length} features from ${url}`);
        const hitFeature = geojson.features.find(
          (f: any) => f.properties?.status === 'hit' || f.properties?.name?.includes('mes')
        );
        if (hitFeature) {
          console.log(`[GeoJSON] Found interesting feature:`, hitFeature.properties);
        } else {
          console.log(`[GeoJSON] Sample feature properties:`, geojson.features[0].properties);
        }
      }
    } catch (e) {
      console.error(e);
      data = null;
    }
  }

  $effect(() => {
    if (config?.url && config.url !== lastUrl) {
      lastUrl = config.url;
      fetchAndParse(config.url);
    } else if (!config?.url) {
      data = null;
      lastUrl = '';
    }
  });
</script>

{#if data}
  <GeoJsonRenderer {data} {config} {sourceId} />
{/if}
