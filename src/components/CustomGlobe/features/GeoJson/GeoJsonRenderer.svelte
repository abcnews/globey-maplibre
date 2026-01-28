<script lang="ts">
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';
  import RenderSpike from './RenderSpike.svelte';

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();
</script>

{#if config.type === 'areas'}
  <RenderArea {data} {config} {sourceId} />
{:else if config.type === 'lines'}
  <RenderLine {data} {config} {sourceId} />
{:else if config.type === 'points'}
  <RenderPoint {data} {config} {sourceId} />
{:else if config.type === 'spikes'}
  <RenderSpike {data} {config} {sourceId} />
{/if}
