<script lang="ts">
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';
  import RenderSpike from './RenderSpike.svelte';

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
</script>

{#if config.type === 'areas'}
  <RenderArea {data} {config} {sourceId} {zIndex} />
{:else if config.type === 'lines'}
  <RenderLine {data} {config} {sourceId} {zIndex} />
{:else if config.type === 'points'}
  <RenderPoint {data} {config} {sourceId} {zIndex} />
{:else if config.type === 'spikes'}
  <RenderSpike {data} {config} {sourceId} {zIndex} />
{/if}
