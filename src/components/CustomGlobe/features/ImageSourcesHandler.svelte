<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import { Z_INDEX_IMAGE_LAYERS } from './layerUtils';
  import ImageSourceHandler from './ImageSourceHandler.svelte';

  let { config = [] }: { config?: ImageSourceConfig[]; geoJsonConfig?: any[] } = $props();
</script>

{#each config as item, index (item.id)}
  <ImageSourceHandler config={item} zIndex={Z_INDEX_IMAGE_LAYERS + index * 0.1} />
{/each}
