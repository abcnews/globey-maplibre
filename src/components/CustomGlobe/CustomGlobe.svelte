<script lang="ts">
  import PanZoomHandler from './features/PanZoom/PanZoomHandler.svelte';
  import MapVectorHandler from './features/MapVectorHandler.svelte';
  import MapCustomLabelHandler from './features/MapCustomLabelHandler.svelte';
  import GeoJsonHandler from './features/GeoJson/GeoJsonHandler.svelte';
  import ImageSourcesHandler from './features/ImageSourcesHandler.svelte';
  import type { DecodedObject } from '../../lib/marker';
  import MapRasterHandler from './features/MapRasterHandler.svelte';
  import ProjectionHandler from './features/ProjectionHandler.svelte';
  import AttributionHandler from './features/AttributionHandler.svelte';
  import { MAX_ZOOM } from '../../lib/constants';
  import { Map } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { isDarkBase } from './mapStyle/utils';
  import { onMount, setContext } from 'svelte';

  type Props = {
    rootElStyle?: string;
    interactive: boolean;
    onLoad?: (map: Map) => void;
    options: DecodedObject;
    preserveDrawingBuffer?: boolean;
    children?: import('svelte').Snippet;
  };
  let { rootElStyle, interactive, onLoad, options, preserveDrawingBuffer = false, children }: Props = $props();

  let mapContainer = $state<HTMLDivElement>();
  let mapInstance = $state<{ map: Map | null }>({ map: null });
  setContext('mapInstance', mapInstance);

  const isDark = $derived(isDarkBase(options.base || 'street'));
  const isSatellite = $derived(options.base === 'satellite');
  const isVectorLight = $derived(options.base === 'street');

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
      <PanZoomHandler
        coords={options.coords}
        z={options.z}
        bounds={options.bounds}
        fitGlobe={options.fitGlobe}
        constrainView={options.constrainView}
        animationDuration={options.animationDuration}
      />

      <MapVectorHandler base={options.base} labels={options.mapLabels} {isSatellite} />

      <MapCustomLabelHandler labels={options.labels} {isDark} />

      {#if options.base === 'satellite'}
        <MapRasterHandler
          url={`https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-${options.satelliteVariant || 'blue'}-marble/{z}/{x}/{y}.webp`}
          maxZoom={7}
          attribution={options.satelliteVariant === 'black' ? 'NASA Black Marble' : 'NASA Blue Marble'}
        />
      {/if}

      <GeoJsonHandler config={options.geoJson} />
      <ImageSourcesHandler config={options.imageSources} geoJsonConfig={options.geoJson} />
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
