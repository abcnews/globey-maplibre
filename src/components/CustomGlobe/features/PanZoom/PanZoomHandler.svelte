<script lang="ts">
  import type { maplibregl } from '../../../mapLibre/index';
  import { disableMapAnimation, prefersReducedMotion } from '../../../../lib/stores';
  import { getContext } from 'svelte';
  import type { PanZoomProps } from './types';
  import { calculateTargetView, calculateGlobeFitZoom } from './utils';

  const ANIMATION_DURATION = 2000;

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { coords, bounds, z, fitGlobe = false, constrainView }: PanZoomProps = $props();

  let isFirstRun = $state(true);
  let isReducedMotionActive = $derived($prefersReducedMotion || $disableMapAnimation);

  let animationDuration = $derived.by(() => {
    if (isFirstRun || isReducedMotionActive) return 0;
    return ANIMATION_DURATION;
  });

  /**
   * Triggers a subtle opacity bounce to provide a static visual cue for reduced motion.
   */
  function triggerOpacityBounce() {
    if (!mapRoot.map) return;
    mapRoot.map.getContainer().animate([{ opacity: 0.4 }, { opacity: 1 }], {
      duration: 300,
      easing: 'ease-out'
    });
  }

  /**
   * Calculates the current globe fit and applies it to the map.
   */
  function applyGlobeFit() {
    const map = mapRoot.map;
    if (!map || !fitGlobe) return;

    const targetZoom = calculateGlobeFitZoom(map, coords);
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const needsCentering =
      coords &&
      (Math.abs(currentCenter.lng - coords[0]) > 0.0001 || Math.abs(currentCenter.lat - coords[1]) > 0.0001);

    if (Math.abs(currentZoom - targetZoom) > 0.01 || needsCentering) {
      map.flyTo({
        center: coords || currentCenter,
        zoom: targetZoom,
        duration: animationDuration,
        essential: true
      });
    }
  }

  /**
   * Checks for boundary violations and snaps the view back to the target bounds.
   * This provides a "soft" constraint without using setMaxBounds.
   */
  function handleSnapBack() {
    const map = mapRoot.map;
    if (!map || !constrainView || !bounds || bounds.length === 0) return;

    const container = map.getContainer();
    const target = calculateTargetView(bounds, container.clientWidth, container.clientHeight, 'fill');
    if (!target) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const centerDiff = Math.abs(currentCenter.lng - target.center[0]) + Math.abs(currentCenter.lat - target.center[1]);
    const zoomDiff = Math.abs(currentZoom - target.zoom);

    // If offset is significant, snap back
    if (centerDiff > 0.001 || zoomDiff > 0.1) {
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        duration: 800,
        essential: true
      });
    }
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

  // Main Navigation Logic
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    // Clean up previous event listeners
    map.off('moveend', handleSnapBack);

    if (fitGlobe) {
      applyGlobeFit();
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

  // Fit globe on resize and lock interactions when in globe-fit mode.
  $effect(() => {
    if (!mapRoot.map || !fitGlobe) return;

    applyGlobeFit();

    const container = mapRoot.map.getContainer();
    const observer = new ResizeObserver(() => applyGlobeFit());
    observer.observe(container);

    // Lock interactions that would break the globe fit
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
