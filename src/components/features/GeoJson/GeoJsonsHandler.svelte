<script lang="ts">
  import type { GeoJsonConfig } from '../../../lib/marker';
  import GeoJsonHandler from './GeoJsonHandler.svelte';

  let { config = [] }: { config?: GeoJsonConfig[] } = $props();
</script>

{#each config as item (item.id || item.url || item.cmid)}
  <GeoJsonHandler config={item} />
{/each}
