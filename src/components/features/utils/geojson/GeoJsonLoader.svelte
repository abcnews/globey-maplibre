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

  // Fetched once per dataset. `config` is a fresh object on every blob change, so the
  // effect depends on these primitives rather than `config` itself — otherwise every
  // toggle of an unrelated layer refetched the data.
  const cmid = $derived(config.cmid);
  const url = $derived(config.url);
  let data = $state<any>();

  $effect(() => {
    fetchGeoJsonData({ cmid, url })
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
