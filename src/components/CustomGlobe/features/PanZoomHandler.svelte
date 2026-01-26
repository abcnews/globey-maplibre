<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { disableMapAnimation } from '../../../lib/stores';
  import { getContext } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { coords, bounds, z } = $props();

  let isFirstRun = $state(true);

  let animationDuration = $derived.by(() => {
    if (isFirstRun) return 0;
    if ($disableMapAnimation) return 0;
    return 2000;
  });

  // Zoom to coord
  $effect(() => {
    if (!mapRoot.map || !coords || bounds?.length) {
      return;
    }
    mapRoot.map.flyTo({
      center: coords,
      essential: true,
      duration: animationDuration,
      zoom: z
    });
    isFirstRun = false;
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
      duration: animationDuration
    });
    isFirstRun = false;
  });
</script>
