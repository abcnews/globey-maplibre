<script lang="ts">
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import RenderArea from './RenderArea.svelte';
  import RenderLine from './RenderLine.svelte';
  import RenderPoint from './RenderPoint.svelte';
  import RenderSpike from './RenderSpike.svelte';

  let { data, config } = $props<{ data: any; config: GeoJsonConfig }>();
</script>

{#if config.type === 'areas'}
  <RenderArea {data} {config} />
{:else if config.type === 'lines'}
  <RenderLine {data} {config} />
{:else if config.type === 'points'}
  <RenderPoint {data} {config} />
{:else if config.type === 'spikes'}
  <RenderSpike {data} {config} />
{/if}
