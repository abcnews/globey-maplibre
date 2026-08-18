<script lang="ts">
  import { getSpikeLayer } from './SpikeLayer';
  import RenderSpikeInner from './RenderSpikeInner.svelte';
  import type { GeoJsonConfig } from '../../../../lib/marker';

  let {
    data,
    config,
    sourceId,
    zIndex
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  let SpikeLayerClass = $state<any>();

  $effect(() => {
    getSpikeLayer().then(cls => {
      SpikeLayerClass = cls;
    });
  });
</script>

{#if SpikeLayerClass}
  <RenderSpikeInner {data} {config} {sourceId} {SpikeLayerClass} {zIndex} />
{/if}
