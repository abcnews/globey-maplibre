<script lang="ts">
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import GeoJsonLayerLoader from './GeoJsonLayerLoader.svelte';

  let { config = [] } = $props<{ config?: GeoJsonConfig[] }>();
</script>

{#each config as item (item.url)}
  <GeoJsonLayerLoader config={item} />
{/each}
