<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { coords, bounds, z } = $props();

  // Zoom to coord
  $effect(() => {
    if (!mapRoot.map || !coords || bounds?.length) {
      return;
    }
    mapRoot.map.flyTo({
      center: coords,
      essential: true,
      duration: 2000,
      zoom: z
    });
  });

  // Fit to bounds
  $effect(() => {
    const _coords = coords;
    if (!mapRoot.map || !bounds?.length) {
      return;
    }
    const lats = bounds.map(p => p[1]);
    const lngs = bounds.map(p => p[0]);
    const mapBounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ];

    mapRoot.map.fitBounds(mapBounds, {
      padding: 50,
      essential: true,
      duration: 2000
    });
  });
</script>
