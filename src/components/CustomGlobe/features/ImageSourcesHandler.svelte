<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import ImageSourceHandler from './ImageSourceHandler.svelte';

  let { config = [] } = $props<{ config?: ImageSourceConfig[] }>();
</script>

{#each config as item (item.id + item.url)}
  <ImageSourceHandler config={item} />
{/each}
