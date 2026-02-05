<script lang="ts">
  import { getSpikeLayer } from '../../../../snippets/SpikeLayer';
  import RenderSpikeInner from './RenderSpikeInner.svelte';
  import type { GeoJsonConfig } from '../../../../lib/marker';

  let { data, config, sourceId }: { data: any; config: GeoJsonConfig; sourceId: string } = $props();

  let SpikeLayerClass = $state<any>();

  $effect(() => {
    getSpikeLayer().then(cls => {
      SpikeLayerClass = cls;
    });
  });
</script>

{#if SpikeLayerClass}
  <RenderSpikeInner {data} {config} {sourceId} {SpikeLayerClass} />
{/if}
