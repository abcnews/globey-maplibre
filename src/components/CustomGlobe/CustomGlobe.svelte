<script lang="ts">
  import PanZoomHandler from '../features/PanZoom/PanZoomHandler.svelte';
  import PanZoomScrollHandler from '../features/PanZoom/PanZoomScrollHandler.svelte';
  import MapVectorHandler from '../features/MapVector/MapVectorHandler.svelte';
  import MapCustomLabelHandler from '../features/CustomLabels/MapCustomLabelHandler.svelte';
  import GeoJsonHandler from '../features/GeoJson/GeoJsonHandler.svelte';
  import ImageSourcesHandler from '../features/ImageSource/ImageSourcesHandler.svelte';
  import IconsHandler from '../features/Icon/IconsHandler.svelte';
  import MapRasterHandler from '../features/MapRaster/MapRasterHandler.svelte';
  import MapRastersHandler from '../features/MapRaster/MapRastersHandler.svelte';
  import ProjectionHandler from '../features/Projection/ProjectionHandler.svelte';
  import AttributionHandler from '../features/Attribution/AttributionHandler.svelte';
  import MinimapHandler from '../features/Minimap/MinimapHandler.svelte';
  import { MAX_ZOOM } from '../../lib/constants';
  import { Map, setWorkerUrl } from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { isDarkBase } from './mapStyle/utils';
  import { onMount, setContext } from 'svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import type { DecodedObject } from '../../lib/marker';
  import { TweenController } from '../features/Tween/TweenController.svelte.ts';
  import { setTween } from '../features/Tween/context.ts';

  setWorkerUrl(workerUrl);

  type Props = {
    rootElStyle?: string;
    interactive: boolean;
    onLoad?: (map: Map) => void;
    options: DecodedObject;
    preserveDrawingBuffer?: boolean;
    panels?: PanelDefinition<DecodedObject>[];
    currentPanel?: number;
    virtualPanel?: number;
    panelPct?: number;
    scrollPct?: number;
    scrollDelta?: number;
    children?: import('svelte').Snippet;
  };
  let {
    rootElStyle,
    interactive,
    onLoad,
    options,
    preserveDrawingBuffer = false,
    panels,
    currentPanel,
    virtualPanel,
    panelPct,
    scrollPct,
    scrollDelta,
    children
  }: Props = $props();

  let mapContainer = $state<HTMLDivElement>();
  let mapInstance = $state<{ map: Map | null }>({ map: null });
  setContext('mapInstance', mapInstance);

  // Shared tween clock for every scrollyteller feature (camera today; GeoJSON and
  // labels next). Only driven on the scrollyteller path — the builder/static path
  // leaves it idle and keeps using PanZoomHandler's flyTo.
  // Seeded at panel 0 (scrollyteller always opens on the prelude); sync() takes over.
  const tweenController = new TweenController();
  setTween(tweenController);

  const isTouchDevice =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse) and (hover: none)').matches;

  $effect(() => {
    if (!panels || panelPct === undefined) return;
    tweenController.sync({
      panels,
      currentPanel: currentPanel ?? 0,
      virtualPanel: virtualPanel ?? -1,
      panelPct,
      isTouch: isTouchDevice
    });
  });

  const hasRasterSatellite = $derived(
    (options.rasterLayers || []).some(
      r => r.url?.includes('marble') || r.url?.includes('satellite') || r.attribution?.toLowerCase().includes('nasa')
    )
  );
  const isSatellite = $derived(options.base === 'satellite' || hasRasterSatellite);
  const isDark = $derived(isSatellite || isDarkBase(options.base || 'street'));
  const isVectorLight = $derived(options.base === 'street' && !hasRasterSatellite);

  onMount(() => {
    if (!mapContainer) return;

    mapContainer.style.opacity = '0';
    const map = new Map({
      zoom: options.z || 3,
      minZoom: -1,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false,
      style: {
        version: 8,
        sources: {},
        layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#000' } }],
        sprite: 'https://www.abc.net.au/res/sites/news-projects/map-vector-style-bright/sprite',
        glyphs: 'https://www.abc.net.au/res/sites/news-projects/map-vector-fonts/{fontstack}/{range}.pbf'
      },
      container: mapContainer,
      interactive: !!interactive,
      center: options.coords,
      projection: { type: options.projection || 'globe' },
      preserveDrawingBuffer
    } as any);

    map.on('error', e => {
      console.error('[MapLibre error]', e.error?.message || e);
    });

    map.on('load', () => {
      onLoad?.(map);
      if (mapContainer) {
        mapContainer.style.opacity = '1';
      }
      mapInstance.map = map;
    });

    return () => {
      map.remove();
    };
  });
</script>

<div
  class="custom-globe"
  class:custom-globe--satellite={isSatellite}
  class:custom-globe--dark={isDark}
  class:custom-globe--vector-light={isVectorLight}
  style={rootElStyle}
>
  <div class="maplibre" bind:this={mapContainer} style={rootElStyle}>
    {#if mapInstance.map}
      <AttributionHandler attribution={options.attribution} base={options.base} hideOsm={options.hideOsm} />
      <ProjectionHandler projection={options.projection} />
      {#if panels && panelPct !== undefined}
        <PanZoomScrollHandler />
      {:else}
        <PanZoomHandler
          coords={options.coords}
          z={options.z}
          bounds={options.bounds}
          fitGlobe={options.fitGlobe}
          constrainView={options.constrainView}
          animationDuration={options.animationDuration}
        />
      {/if}

      <MapVectorHandler
        base={options.base}
        hideOsm={options.hideOsm}
        streetMapZIndex={options.streetMapZIndex}
        labels={options.mapLabels}
        zIndex={options.mapLabelsZIndex}
        {isSatellite}
      />

      <MapCustomLabelHandler labels={options.labels} zIndex={options.labelsZIndex} {isDark} />

      {#if options.rasterLayers && options.rasterLayers.length > 0}
        <MapRastersHandler config={options.rasterLayers} />
      {:else if options.base === 'satellite'}
        <MapRasterHandler
          url={`https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-${options.satelliteVariant || 'blue'}-marble/{z}/{x}/{y}.webp`}
          maxZoom={7}
          attribution={options.satelliteVariant === 'black' ? 'NASA Black Marble' : 'NASA Blue Marble'}
        />
      {/if}

      <GeoJsonHandler config={options.geoJson} />
      <ImageSourcesHandler config={options.imageSources} geoJsonConfig={options.geoJson} />
      <IconsHandler config={options.icons} />
      {#if options.minimap && options.minimap.enabled !== false}
        <MinimapHandler bind:config={options.minimap} {interactive} />
      {/if}
      {@render children?.()}
    {/if}
  </div>
</div>

<style>
  .custom-globe {
    transition: background-color 250ms;
    width: 100%;
    height: 100%;
    overflow: hidden;
    position: relative;
    font-family: ABCSans, sans-serif;
    font-size: var(--od-font-size-xs, 0.75rem) !important;
    line-height: 1.25rem;

    /* MapLibre attribution control (see AttributionHandler.svelte). */
    :global(.maplibregl-ctrl.maplibregl-ctrl-attrib) {
      background: transparent;
      -webkit-text-stroke-width: 2px;
      -webkit-text-stroke-color: #ffffff88;
      paint-order: stroke fill;
      :global(a) {
        color: currentColor !important;
      }
    }
  }

  .maplibre {
    width: 100%;
    height: 100%;
    position: absolute;
    inset: 0;
    transition: opacity 0.2s;
  }

  .custom-globe--satellite {
    background-color: #000;
  }
</style>
