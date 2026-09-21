<script lang="ts">
  import type { GeoJsonLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { fetchGeoJsonData } from './utils.ts';
  import { generateGeoJsonSourceId } from '../layers/layerUtils.ts';
  import { layerClockKey } from '../Tween/utils.ts';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';

  let {
    config,
    /** One opacity per panel (1 present / 0 absent). `[1]` = always visible. */
    opacityStops = [1],
    /** This item's own config per panel (undefined where absent) — lets colour cross-fade
     *  between panels, e.g. a marker LAYER override changing colour panel to panel. */
    configStops
  }: { config: Stacked<GeoJsonLayer>; opacityStops?: number[]; configStops?: (GeoJsonLayer | undefined)[] } = $props();

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
        console.error(`[GeoJsonHandler] Failed to load GeoJSON for ${sourceId}:`, e);
      });
  });
</script>

{#if data}
  {#if config.geometryType === 'areas'}
    <RenderArea {data} {config} {sourceId} {opacityStops} {configStops} {posKey} zIndex={config.zIndex} />
  {:else if config.geometryType === 'lines'}
    <RenderLine {data} {config} {sourceId} {opacityStops} {configStops} {posKey} zIndex={config.zIndex} />
  {:else if config.geometryType === 'points'}
    <RenderPoint {data} {config} {sourceId} {opacityStops} {configStops} {posKey} zIndex={config.zIndex} />
  {/if}
{/if}
