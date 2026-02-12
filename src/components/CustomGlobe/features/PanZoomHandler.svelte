<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { disableMapAnimation, prefersReducedMotion } from '../../../lib/stores';
  import { getContext } from 'svelte';

  const ANIMATION_DURATION = 2000;

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const {
    coords,
    bounds,
    z,
    fitGlobe = false
  } = $props<{
    coords?: [number, number];
    bounds?: [number, number][];
    z?: number;
    fitGlobe?: boolean;
  }>();

  let isFirstRun = $state(true);
  let isReducedMotionActive = $derived($prefersReducedMotion || $disableMapAnimation);

  let animationDuration = $derived.by(() => {
    if (isFirstRun || isReducedMotionActive) return 0;
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
    const lats = (bounds || []).map((p: [number, number]) => p[1]);
    const lngs = (bounds || []).map((p: [number, number]) => p[0]);
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

  // Fit globe on resize if enabled.
  $effect(() => {
    if (!mapRoot.map || !fitGlobe) return;

    function fitTheGlobe() {
      if (!mapRoot.map) return;

      const container = mapRoot.map.getContainer();
      const width = container.clientWidth;
      const height = container.clientHeight;

      // 1. Determine how big (in pixels) we want the globe diameter to be on screen.
      const padding = -20; // visually tweak to fit
      const targetDiameterPx = Math.min(width, height) - padding * 2;

      // 2. MapLibre's zoom logic is based on a Mercator projection, which stretches
      // the world as you move away from the equator by a factor of 1/cos(latitude).
      // To keep the globe a constant physical size, we must shrink our target
      // dimensions by cos(latitude) to counteract that internal magnification.
      const lat = mapRoot.map.getCenter().lat;
      const latRad = (lat * Math.PI) / 180;
      const mercatorScaleCorrection = Math.cos(latRad);

      // 3. Calculate the necessary world circumference (in pixels) to achieve
      // our target diameter. On a sphere, Circumference = Diameter * PI.
      const requiredWorldCircumferencePx = targetDiameterPx * Math.PI * mercatorScaleCorrection;

      // 4. MapLibre defines Zoom 0 as a world circumference of 512px.
      // Each zoom level doubles the pixel size (exponential growth: 512 * 2^z).
      // We use Math.log2 to convert that pixel growth back into a linear zoom level 'z'.
      const targetZoom = Math.log2(requiredWorldCircumferencePx / 512);

      const currentZoom = mapRoot.map.getZoom();
      const threshold = 0.01;

      if (Math.abs(currentZoom - targetZoom) > threshold) {
        mapRoot.map.flyTo({
          zoom: targetZoom,
          duration: animationDuration,
          essential: true
        });
      }
    }

    // Initial fit
    fitTheGlobe();

    const container = mapRoot.map.getContainer();
    const observer = new ResizeObserver(() => fitTheGlobe());
    observer.observe(container);

    // Lock zoom interactions
    const originalZooms = {
      scrollZoom: mapRoot.map.scrollZoom.isEnabled(),
      boxZoom: mapRoot.map.boxZoom.isEnabled(),
      dragRotate: mapRoot.map.dragRotate.isEnabled(),
      keyboard: mapRoot.map.keyboard.isEnabled(),
      doubleClickZoom: mapRoot.map.doubleClickZoom.isEnabled(),
      touchZoomRotate: mapRoot.map.touchZoomRotate.isEnabled()
    };

    mapRoot.map.scrollZoom.disable();
    mapRoot.map.boxZoom.disable();
    mapRoot.map.dragRotate.disable();
    mapRoot.map.keyboard.disable();
    mapRoot.map.doubleClickZoom.disable();
    mapRoot.map.touchZoomRotate.disable();

    return () => {
      observer.disconnect();

      // Restore interactions
      if (originalZooms.scrollZoom) mapRoot.map.scrollZoom.enable();
      if (originalZooms.boxZoom) mapRoot.map.boxZoom.enable();
      if (originalZooms.dragRotate) mapRoot.map.dragRotate.enable();
      if (originalZooms.keyboard) mapRoot.map.keyboard.enable();
      if (originalZooms.doubleClickZoom) mapRoot.map.doubleClickZoom.enable();
      if (originalZooms.touchZoomRotate) mapRoot.map.touchZoomRotate.enable();
    };
  });
</script>
