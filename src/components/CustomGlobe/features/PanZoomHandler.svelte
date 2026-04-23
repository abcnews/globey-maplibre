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
    fitGlobe = false,
    constrainView
  } = $props<{
    coords?: [number, number];
    bounds?: [number, number][];
    z?: number;
    fitGlobe?: boolean;
    constrainView?: boolean;
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

  /** Calculate precise {center, zoom} for bounds based on container ratio */
  function calculateTargetView(
    points: [number, number][],
    width: number,
    height: number,
    mode: 'fit' | 'fill' = 'fit'
  ) {
    if (!points || points.length === 0) return null;

    const lats = points.map(p => p[1]);
    const lngs = points.map(p => p[0]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [number, number];

    // Mercator zoom math
    const deltaLng = Math.abs(maxLng - minLng) || 0.0001; // prevent div by zero
    const latRadMin = (minLat * Math.PI) / 180;
    const latRadMax = (maxLat * Math.PI) / 180;
    const yMin = Math.log(Math.tan(Math.PI / 4 + latRadMin / 2));
    const yMax = Math.log(Math.tan(Math.PI / 4 + latRadMax / 2));
    const deltaY = Math.abs(yMax - yMin) || 0.0001;

    // MapLibre zoom: world is 512px at zoom 0
    const zoomLng = Math.log2((width * 360) / (512 * deltaLng));
    const zoomLat = Math.log2((height * 2 * Math.PI) / (512 * deltaY));

    const zoom = mode === 'fit' ? Math.min(zoomLng, zoomLat) : Math.max(zoomLng, zoomLat);

    return { center, zoom };
  }

  // Snap-back handler for constrained views
  function handleSnapBack() {
    const map = mapRoot.map;
    if (!map || !constrainView || !bounds || bounds.length === 0) return;

    const container = map.getContainer();
    const target = calculateTargetView(bounds, container.clientWidth, container.clientHeight, 'fill');
    if (!target) return;

    // Check if current view is outside the safe range (simplified center check)
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const centerDiff =
      Math.abs(currentCenter.lng - target.center[0]) + Math.abs(currentCenter.lat - target.center[1]);
    const zoomDiff = Math.abs(currentZoom - target.zoom);

    // If offset is significant, snap back
    if (centerDiff > 0.001 || zoomDiff > 0.1) {
      console.log('[PanZoomHandler] Constraint violated, snapping back...');
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        duration: 800,
        essential: true
      });
    }
  }

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

  // Navigation Logic
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    // Clean up previous event listeners
    map.off('moveend', handleSnapBack);

    if (fitGlobe) {
      fitTheGlobe();
    } else if (bounds && bounds.length > 0) {
      const container = map.getContainer();
      const target = calculateTargetView(
        bounds,
        container.clientWidth,
        container.clientHeight,
        constrainView ? 'fill' : 'fit'
      );

      if (target) {
        map.flyTo({
          center: target.center,
          zoom: target.zoom,
          duration: animationDuration,
          essential: true
        });
      }
    } else if (coords) {
      map.flyTo({
        center: coords,
        essential: true,
        duration: animationDuration,
        zoom: z
      });
    }

    // Register snap-back if constrained
    if (constrainView) {
      map.on('moveend', handleSnapBack);
    }

    isFirstRun = false;

    return () => {
      map?.off('moveend', handleSnapBack);
    };
  });

  // Fit globe on resize/lock interactions
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
</script>
