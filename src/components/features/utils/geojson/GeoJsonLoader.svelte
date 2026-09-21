<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { GeoJsonAnyLayer } from '../../../../lib/data/jsonBlob.ts';
  import { fetchGeoJsonData } from './data.ts';
  import { generateGeoJsonSourceId } from '../../layers/layerUtils.ts';
  import { layerClockKey } from '../../Tween/utils.ts';

  interface Props {
    config: GeoJsonAnyLayer;
    /** Rendered once the data has loaded, with the MapLibre source id and this layer's tween clock key. */
    children: Snippet<[{ data: any; sourceId: string; posKey: string }]>;
  }

  let { config, children }: Props = $props();

  const sourceId = $derived(generateGeoJsonSourceId(config.id));
  const posKey = $derived(layerClockKey(config.animationClock));

  // Fetched once per dataset (URL/CMID never change for a given layer instance).
  let data = $state<any>();

  $effect(() => {
    fetchGeoJsonData({ cmid: config.cmid, url: config.url })
      .then(result => {
        data = result;
      })
      .catch(e => {
        console.error(`[GeoJsonLoader] Failed to load GeoJSON for ${sourceId}:`, e);
      });
  });
</script>

{#if data}
  {@render children({ data, sourceId, posKey })}
{/if}
