<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext } from 'svelte';
  import { resolveAllPanelViews, createZoomInterpolator } from './utils';
  import { getTween } from '../Tween/context.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  // Shared tween clock (mode, timing and panel pair all live here now).
  const tween = getTween();

  let containerDimensions = $state({ width: 0, height: 0 });

  // Panel view resolution depends on container size, so observe it reactively.
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    const container = map.getContainer();
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerDimensions = {
          width: entry.contentRect.width,
          height: entry.contentRect.height
        };
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  });

  // Resolve every panel to an absolute camera view, with forward inheritance for
  // panels that omit geographic options.
  let views = $derived.by(() => {
    const map = mapRoot.map;
    if (!map) return [];
    containerDimensions; // re-resolve when the container resizes
    return resolveAllPanelViews(map, tween.panels);
  });

  let startView = $derived(views[tween.fromPanel]);
  let targetView = $derived(views[tween.toPanel] ?? startView);
  let interpolator = $derived(
    startView && targetView && startView !== targetView ? createZoomInterpolator(startView, targetView) : null
  );

  // Apply the blended camera position each time the tween advances. The central
  // position tween already provides wheel smoothing and reduced-motion snapping,
  // so this just reads `tween.t` and jumps the map there.
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !startView) return;

    const view = interpolator ? interpolator(tween.t) : startView;
    map.jumpTo({ center: view.center, zoom: view.zoom });
  });
</script>
