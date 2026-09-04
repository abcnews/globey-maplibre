<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { Map } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import type { MinimapConfig } from '../../../lib/marker';
  import mapStyle from '../../CustomGlobe/mapStyle/streetMap.ts';
  import { getMainMapBoundsFeature, unwrapLongitude } from './utils.ts';

  interface Props {
    config: MinimapConfig;
    interactive?: boolean;
  }

  let { config = $bindable(), interactive = false }: Props = $props();

  const mapRoot = getContext<{ map: Map | null }>('mapInstance');

  let container = $state<HTMLDivElement>();
  let minimap = $state<Map>();
  let isReady = $state(false);

  const BOUNDS_SOURCE_ID = 'main-map-bounds-source';
  const BOUNDS_LINE_LAYER_ID = 'main-map-bounds-line';
  const BOUNDS_DOT_LAYER_ID = 'main-map-bounds-dot';

  onMount(() => {
    if (!container || config.enabled === false) return;

    const initialBounds = config.bounds && config.bounds.length >= 2 ? config.bounds : undefined;

    const map = new Map({
      container,
      style: mapStyle(),
      interactive: !!interactive,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
      projection: { type: 'mercator' },
      zoom: initialBounds ? undefined : 0,
      center: initialBounds ? undefined : [0, 0],
      bounds: initialBounds ? (initialBounds as [number, number][]) : undefined
    } as any);

    map.on('moveend', e => {
      // Only sync bounds back to schema when the user interacted with the minimap
      if (e.originalEvent && interactive) {
        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        // Keep east ahead of west even when the view straddles the antimeridian, so the
        // stored pair round-trips through fitBounds instead of spanning most of the globe.
        const eastLng = unwrapLongitude(ne.lng, sw.lng);
        config.bounds = [
          [Number(sw.lng.toFixed(5)), Number(sw.lat.toFixed(5))],
          [Number(eastLng.toFixed(5)), Number(ne.lat.toFixed(5))]
        ];
      }
    });

    map.on('load', () => {
      minimap = map;
      if (initialBounds) {
        map.fitBounds(initialBounds as [number, number][], { duration: 0 });
      }
      map.once('render', () => {
        isReady = true;
      });
      requestAnimationFrame(() => {
        isReady = true;
      });
    });

    return () => {
      isReady = false;
      map.remove();
      minimap = undefined;
    };
  });

  // Track main map bounds in real-time and render a GeoJSON rectangle or 6px dot on the minimap
  $effect(() => {
    const mainMap = mapRoot?.map;
    const mini = minimap;
    if (!mainMap || !mini) return;

    const setupBoundsLayer = () => {
      if (!mini.getStyle()) return;

      const initialFeature = getMainMapBoundsFeature(mainMap, mini);

      if (!mini.getSource(BOUNDS_SOURCE_ID)) {
        mini.addSource(BOUNDS_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [initialFeature]
          }
        });
      }

      if (!mini.getLayer(BOUNDS_LINE_LAYER_ID)) {
        mini.addLayer({
          id: BOUNDS_LINE_LAYER_ID,
          type: 'line',
          source: BOUNDS_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'line-color': '#00267e',
            'line-width': 1,
            'line-opacity': 1.0
          }
        });
      }

      if (!mini.getLayer(BOUNDS_DOT_LAYER_ID)) {
        mini.addLayer({
          id: BOUNDS_DOT_LAYER_ID,
          type: 'circle',
          source: BOUNDS_SOURCE_ID,
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-radius': isMobile ? 2 : 3, // 4px on mobile (radius 2), 6px on desktop (radius 3)
            'circle-color': '#00267e',
            'circle-opacity': 1.0
          }
        });
      }
    };

    const updateBounds = () => {
      const source = mini.getSource(BOUNDS_SOURCE_ID) as any;
      if (source && typeof source.setData === 'function') {
        source.setData({
          type: 'FeatureCollection',
          features: [getMainMapBoundsFeature(mainMap, mini)]
        });
      }
    };

    setupBoundsLayer();
    mini.on('styledata', setupBoundsLayer);

    mainMap.on('move', updateBounds);
    mainMap.on('resize', updateBounds);
    mini.on('move', updateBounds);

    return () => {
      mini.off('styledata', setupBoundsLayer);
      mainMap.off('move', updateBounds);
      mainMap.off('resize', updateBounds);
      mini.off('move', updateBounds);

      if (mini.getLayer(BOUNDS_DOT_LAYER_ID)) mini.removeLayer(BOUNDS_DOT_LAYER_ID);
      if (mini.getLayer(BOUNDS_LINE_LAYER_ID)) mini.removeLayer(BOUNDS_LINE_LAYER_ID);
      if (mini.getSource(BOUNDS_SOURCE_ID)) mini.removeSource(BOUNDS_SOURCE_ID);
    };
  });

  // Dynamically update dot size when isMobile toggles
  $effect(() => {
    if (!minimap || !minimap.getLayer(BOUNDS_DOT_LAYER_ID)) return;
    minimap.setPaintProperty(BOUNDS_DOT_LAYER_ID, 'circle-radius', isMobile ? 2 : 3);
  });

  // Watch for external bounds changes (e.g. from hash navigation or undo/redo)
  $effect(() => {
    if (!minimap || !config.bounds || config.bounds.length < 2) return;

    const currentBounds = minimap.getBounds();
    const [[swLng, swLat], [neLng, neLat]] = config.bounds;

    const isDifferent =
      Math.abs(currentBounds.getWest() - swLng) > 0.01 ||
      Math.abs(currentBounds.getSouth() - swLat) > 0.01 ||
      Math.abs(currentBounds.getEast() - neLng) > 0.01 ||
      Math.abs(currentBounds.getNorth() - neLat) > 0.01;

    if (isDifferent) {
      minimap.fitBounds(
        [
          [swLng, swLat],
          [neLng, neLat]
        ],
        { duration: 0 }
      );
    }
  });

  // Track main map width (< 600px is mobile, scaling minimap to 100px)
  let isMobile = $state(false);

  $effect(() => {
    const mainMap = mapRoot?.map;
    if (!mainMap) return;

    const mainContainer = mainMap.getContainer();
    if (!mainContainer) return;

    const checkMobile = () => {
      const w = mainContainer.clientWidth || 0;
      const nextMobile = w > 0 && w < 600;
      if (isMobile !== nextMobile) {
        isMobile = nextMobile;
        requestAnimationFrame(() => {
          minimap?.resize();
        });
      }
    };

    checkMobile();

    const observer = new ResizeObserver(checkMobile);
    observer.observe(mainContainer);

    return () => observer.disconnect();
  });
</script>

{#if config.enabled !== false}
  <div class="minimap-wrapper" class:is-mobile={isMobile} class:is-ready={isReady}>
    <div bind:this={container} class="minimap-container" class:is-interactive={interactive}></div>
    <div class="minimap-stroke"></div>
  </div>
{/if}

<style>
  .minimap-wrapper {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 10;
    width: 150px;
    height: 150px;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    pointer-events: none;
    opacity: 0;
    transition:
      opacity 250ms ease,
      width 200ms ease,
      height 200ms ease;
  }

  .minimap-wrapper.is-ready {
    opacity: 1;
  }

  .minimap-wrapper.is-mobile {
    width: 100px;
    height: 100px;
  }

  .minimap-container {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .minimap-container.is-interactive {
    pointer-events: auto;
    cursor: grab;
  }

  .minimap-container.is-interactive:active {
    cursor: grabbing;
  }

  .minimap-stroke {
    position: absolute;
    inset: 0;
    pointer-events: none;
    border: 1px solid #000000;
    box-shadow: inset 0 0 0 2px #ffffff;
    border-radius: 50%;
    box-sizing: border-box;
  }

  :global(.minimap-container .maplibregl-canvas) {
    outline: none;
  }
</style>
