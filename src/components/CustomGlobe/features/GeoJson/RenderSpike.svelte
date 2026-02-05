<script lang="ts">
  import { ThreeJSLoader } from '../../../threeJS/index';
  import RenderSpikeInner from './RenderSpikeInner.svelte';
  import type { GeoJsonConfig } from '../../../../lib/marker';

  let { data, config, sourceId }: { data: any; config: GeoJsonConfig; sourceId: string } = $props();
</script>

<ThreeJSLoader>
  <RenderSpikeInner {data} {config} {sourceId} />
</ThreeJSLoader>
