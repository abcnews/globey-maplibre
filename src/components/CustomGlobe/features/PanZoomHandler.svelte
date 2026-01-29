<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import { getContext } from 'svelte';

  const ANIMATION_DURATION = 2000;

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { coords, bounds, z } = $props();

  let isFirstRun = $state(true);
  let isReducedMotionActive = $derived($prefersReducedMotion && !isFirstRun && !$disableMapAnimation);

  let animationDuration = $derived.by(() => {
    if (isReducedMotionActive) return 0;
    return ANIMATION_DURATION;
  });

  /** Trigger a subtle opacity bounce to provide a static visual cue for reduced motion */
  function triggerOpacityBounce() {
    if (!mapRoot.map) return;
    mapRoot.map.getContainer().animate([{ opacity: 0.4 }, { opacity: 1 }], {
      duration: 300,
      easing: 'ease-out'
    });
  }

  // Visual cue effect for reduced motion
  $effect(() => {
    // Watch relevant navigation triggers
    coords;
    bounds;
    z;
    if (isReducedMotionActive) {
      triggerOpacityBounce();
    }
  });

  // Zoom to coord
  $effect(() => {
    if (!mapRoot.map || !coords || (bounds && bounds.length > 0)) {
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
    if (!mapRoot.map || !bounds || bounds.length === 0) {
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
