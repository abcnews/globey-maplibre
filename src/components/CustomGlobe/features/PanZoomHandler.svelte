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
    if (!mapRoot.map || !coords || (bounds && bounds.length > 0) || fitGlobe) {
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
      padding: 0,
      essential: true,
      duration: animationDuration
    });
    isFirstRun = false;
  });

  /** Logic to fit the globe to screen based on current latitude and container size */
  function fitTheGlobe() {
    if (!mapRoot.map || !fitGlobe) return;

    const container = mapRoot.map.getContainer();
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Determine how big (in pixels) we want the globe diameter to be on screen.
    const padding = -20; // visually tweak to fit
    const targetDiameterPx = Math.min(width, height) - padding * 2;

    // 2. MapLibre's zoom logic is based on a Mercator projection, which stretches
    // the world as you move away from the equator by a factor of 1/cos(latitude).
    // To keep the globe a constant physical size, we must shrink our target
    // dimensions by cos(latitude) to counteract that internal magnification.
    const currentCenter = mapRoot.map.getCenter();
    const currentLat = coords ? coords[1] : currentCenter.lat;
    const latRad = (currentLat * Math.PI) / 180;
    const mercatorScaleCorrection = Math.cos(latRad);

    // 3. Calculate the necessary world circumference (in pixels) to achieve
    // our target diameter. On a sphere, Circumference = Diameter * PI.
    const requiredWorldCircumferencePx = targetDiameterPx * Math.PI * mercatorScaleCorrection;

    // 4. MapLibre defines Zoom 0 as a world circumference of 512px.
    // Each zoom level doubles the pixel size (exponential growth: 512 * 2^z).
    // We use Math.log2 to convert that pixel growth back into a linear zoom level 'z'.
    const targetZoom = Math.log2(requiredWorldCircumferencePx / 512);

    const currentZoom = mapRoot.map.getZoom();
    const zoomThreshold = 0.01;

    // Check if we also need to center
    const needsCentering =
      coords && (Math.abs(currentCenter.lng - coords[0]) > 0.0001 || Math.abs(currentCenter.lat - coords[1]) > 0.0001);

    if (Math.abs(currentZoom - targetZoom) > zoomThreshold || needsCentering) {
      mapRoot.map.flyTo({
        center: coords || currentCenter,
        zoom: targetZoom,
        duration: animationDuration,
        essential: true
      });
    }
  }

  // Fit globe on resize and coord changes if enabled.
  $effect(() => {
    if (!mapRoot.map || !fitGlobe) return;

    fitTheGlobe();

    const container = mapRoot.map.getContainer();
    const observer = new ResizeObserver(() => fitTheGlobe());
    observer.observe(container);

    // Lock zoom interactions
    const map = mapRoot.map;
    const originalZooms = {
      scrollZoom: map.scrollZoom.isEnabled(),
      boxZoom: map.boxZoom.isEnabled(),
      dragRotate: map.dragRotate.isEnabled(),
      keyboard: map.keyboard.isEnabled(),
      doubleClickZoom: map.doubleClickZoom.isEnabled(),
      touchZoomRotate: map.touchZoomRotate.isEnabled()
    };

    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();

    return () => {
      observer.disconnect();

      // Restore interactions
      if (originalZooms.scrollZoom) map.scrollZoom.enable();
      if (originalZooms.boxZoom) map.boxZoom.enable();
      if (originalZooms.dragRotate) map.dragRotate.enable();
      if (originalZooms.keyboard) map.keyboard.enable();
      if (originalZooms.doubleClickZoom) map.doubleClickZoom.enable();
      if (originalZooms.touchZoomRotate) map.touchZoomRotate.enable();
    };
  });

  // Re-run fit if coords change while fitGlobe is enabled
  $effect(() => {
    if (fitGlobe && coords) {
      fitTheGlobe();
    }
  });
</script>
