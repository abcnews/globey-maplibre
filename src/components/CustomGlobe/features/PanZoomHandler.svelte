<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { coords, z } = $props();

  $effect(() => {
    if (!mapRoot.map || !coords) {
      return;
    }
    mapRoot.map.flyTo({
      center: coords,
      essential: true,
      duration: 2000
    });
  });
</script>
