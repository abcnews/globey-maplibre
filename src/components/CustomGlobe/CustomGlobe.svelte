<script lang="ts">
  import PanZoomHandler from '../features/PanZoom/PanZoomHandler.svelte';
  import PanZoomScrollHandler from '../features/PanZoom/PanZoomScrollHandler.svelte';
  import MapVectorHandler from '../features/MapVector/MapVectorHandler.svelte';
  import MapCustomLabelHandler from '../features/CustomLabels/MapCustomLabelHandler.svelte';
  import GeoJsonHandler from '../features/GeoJson/GeoJsonHandler.svelte';
  import ImageSourcesHandler from '../features/ImageSource/ImageSourcesHandler.svelte';
  import IconsHandler from '../features/Icon/IconsHandler.svelte';
  import MapRastersHandler from '../features/MapRaster/MapRastersHandler.svelte';
  import ProjectionHandler from '../features/Projection/ProjectionHandler.svelte';
  import AttributionHandler from '../features/Attribution/AttributionHandler.svelte';
  import MinimapHandler from '../features/Minimap/MinimapHandler.svelte';
  import { MAX_ZOOM } from '../../lib/constants';
  import { Map, setWorkerUrl, getWorkerUrl } from 'maplibre-gl';
  import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { isDarkBase } from './mapStyle/utils';
  import { onMount, setContext } from 'svelte';
  import type { PanelDefinition } from '@abcnews/svelte-scrollyteller';
  import type { DecodedObject, RasterLayerConfig } from '../../lib/marker';
  import { TweenController, type TweenClock } from '../features/Tween/TweenController.svelte.ts';
  import { setTween } from '../features/Tween/context.ts';
  import {
    MAPLIBRE_TWEEN_STATE_KEY,
    MAPLIBRE_TWEEN_SCROLL_STATE_KEY,
    MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY
  } from '../features/Tween/utils.ts';
  import { prefersReducedMotion, disableMapAnimation } from '../../lib/stores';
  import { tdbg, refId, glog } from '../../lib/tweenDebug.ts';

  setWorkerUrl(workerUrl);

  // DEBUG: the MapLibre worker parses vector tiles (raster tiles decode on the
  // main thread — which is why satellite still works when this is broken). If the
  // worker URL is wrong / 404 / cross-origin-blocked, vector tiles never load and
  // never even fire `.pbf` requests.
  glog('CustomGlobe', 'worker setup', {
    importedWorkerUrl: workerUrl,
    getWorkerUrl: getWorkerUrl(),
    resolvedAgainstBase: (() => {
      try {
        return new URL(workerUrl, document.baseURI).href;
      } catch (e) {
        return `[bad url: ${String(e)}]`;
      }
    })(),
    pageOrigin: location.origin
  });
  fetch(workerUrl)
    .then(r =>
      glog('CustomGlobe', 'worker fetch result', {
        ok: r.ok,
        status: r.status,
        finalUrl: r.url,
        contentType: r.headers.get('content-type')
      })
    )
    .catch(e => glog('CustomGlobe', 'worker fetch threw', e));
  try {
    const probe = new Worker(workerUrl, { type: 'module' });
    probe.addEventListener('error', e =>
      glog('CustomGlobe', 'worker probe error event', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno
      })
    );
    setTimeout(() => {
      glog('CustomGlobe', 'worker probe survived 3s (likely constructed OK)');
      probe.terminate();
    }, 3000);
  } catch (e) {
    glog('CustomGlobe', 'new Worker() threw synchronously', e);
  }

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

  // Write the tween positions once per frame. Every feature's layers read one of
  // these through a pure `['interpolate', … ['global-state', <key>] …]` paint
  // expression, so these calls drive all of their fades. At rest each lands on a
  // whole panel index. Reduced motion shows the current panel with no fade; it
  // switches when the next panel triggers. The builder / static path (no panels)
  // pins them to 0.
  //
  // Two clocks run in parallel: `tweenPosScroll` scrubs with scroll position,
  // `tweenPosImmediate` plays on arrival. `tweenPos` is transitional — it follows
  // whichever clock `animationMode` selects, so layers that don't name a clock
  // are unchanged.
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
  const clockPosition = (clock: TweenClock): number =>
    tweenController.panelCount === 0
      ? 0
      : clock.fromPanel + (reducedMotion ? 0 : clock.easedT);

  $effect(() => {
    const map = mapInstance.map;
    if (!map) return;

    const scrollPos = clockPosition(tweenController.scroll);
    const immediatePos = clockPosition(tweenController.immediate);
    const selectedPos = clockPosition(tweenController.clock(tweenController.mode));

    tdbg('CustomGlobe global-state write', {
      mode: tweenController.mode,
      scroll: Number(scrollPos.toFixed(4)),
      immediate: Number(immediatePos.toFixed(4)),
      selected: Number(selectedPos.toFixed(4)),
      panels: refId(tweenController.panels),
      panelCount: tweenController.panelCount
    });

    map.setGlobalStateProperty(MAPLIBRE_TWEEN_SCROLL_STATE_KEY, scrollPos);
    map.setGlobalStateProperty(MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY, immediatePos);
    map.setGlobalStateProperty(MAPLIBRE_TWEEN_STATE_KEY, selectedPos);
  });

  const hasRasterSatellite = $derived(
    (options.rasterLayers || []).some(
      r => r.url?.includes('marble') || r.url?.includes('satellite') || r.attribution?.toLowerCase().includes('nasa')
    )
  );
  const isSatellite = $derived(options.base === 'satellite' || hasRasterSatellite);
  const isDark = $derived(isSatellite || isDarkBase(options.base || 'street'));
  const isVectorLight = $derived(options.base === 'street' && !hasRasterSatellite);

  // A feature's config in each panel — one array per panel on the scrollyteller
  // path, the current panel's array on the builder / static path.
  const perPanel = <T,>(pick: (d: DecodedObject) => T[]): T[][] =>
    tweenController.panelCount > 0
      ? tweenController.panels.map(p => pick(p.data))
      : [pick(options)];

  // Raster layers, with the satellite base map folded in: it's a raster layer
  // derived from `base` + `satelliteVariant`, so we build it here rather than in
  // MapRastersHandler.
  const panelRasters = (d: DecodedObject): RasterLayerConfig[] => {
    const explicit = d.rasterLayers ?? [];
    if (explicit.length || d.base !== 'satellite') return explicit;
    const black = d.satelliteVariant === 'black';
    return [
      {
        url: `https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-${black ? 'black' : 'blue'}-marble/{z}/{x}/{y}.webp`,
        maxZoom: 7,
        tileSize: 256,
        attribution: black ? 'NASA Black Marble' : 'NASA Blue Marble'
      } as RasterLayerConfig
    ];
  };

  glog('CustomGlobe', 'instance created', {
    hasPanels: !!panels,
    panelCount: panels?.length ?? 0,
    base: options?.base,
    projection: options?.projection,
    coords: options?.coords
  });

  onMount(() => {
    glog('CustomGlobe', 'onMount', { mapContainer: !!mapContainer });
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

    glog('CustomGlobe', 'new Map() constructed');

    map.on('error', e => {
      console.error('[MapLibre error]', e.error?.message || e);
      glog('CustomGlobe', 'map error event', {
        sourceId: (e as any).sourceId,
        message: e.error?.message,
        error: e.error
      });
    });
    map.on('style.load', () => glog('CustomGlobe', 'map style.load fired'));

    // Always-on: the openmaptiles vector source is the one that renders the
    // street base. Track its tile lifecycle so a grey globe (layers present, no
    // geometry) can be traced to the TileJSON / tile requests.
    map.on('sourcedataloading', e => {
      if (e.sourceId === 'openmaptiles') glog('CustomGlobe', 'openmaptiles sourcedataloading', { type: e.dataType });
    });
    map.on('sourcedata', e => {
      if (e.sourceId !== 'openmaptiles') return;
      glog('CustomGlobe', 'openmaptiles sourcedata', {
        type: e.sourceDataType,
        isSourceLoaded: e.isSourceLoaded,
        tilesLoaded: (map as any).style?.sourceCaches?.['openmaptiles']?.loaded?.()
      });
    });

    // Reach the map from the console: `window.__globeyMap`
    (window as any).__globeyMap = map;

    const openmaptilesDiagnostic = (when: string) => {
      const sourceExists = !!map.getSource('openmaptiles');
      let water = -1;
      try {
        if (sourceExists) water = map.querySourceFeatures('openmaptiles', { sourceLayer: 'water' }).length;
      } catch {
        /* querySourceFeatures throws before the source cache exists */
      }
      glog('CustomGlobe', `openmaptiles diagnostic (${when})`, {
        isStyleLoaded: map.isStyleLoaded(),
        sourceExists,
        isSourceLoaded: sourceExists ? map.isSourceLoaded('openmaptiles') : false,
        areTilesLoaded: map.areTilesLoaded(),
        resolvedSource: map.getStyle()?.sources?.openmaptiles,
        waterFeaturesInView: water
      });
    };
    map.once('idle', () => openmaptilesDiagnostic('idle'));
    setTimeout(() => openmaptilesDiagnostic('+5s'), 5000);

    map.on('load', () => {
      glog('CustomGlobe', 'map load fired', { isStyleLoaded: map.isStyleLoaded() });
      onLoad?.(map);
      if (mapContainer) {
        mapContainer.style.opacity = '1';
      }
      mapInstance.map = map;
      glog('CustomGlobe', 'mapInstance.map set — feature handlers will now mount');

      // DEBUG: raw map events. Repeated `sourcedata` (isSourceLoaded flipping) or
      // `styledata` while scrolling means something is reloading sources — the flash.
      map.on('styledata', () => tdbg('map event: styledata'));
      map.on('sourcedata', e => {
        if (e.sourceDataType === 'metadata' || e.sourceDataType === 'visibility') return;
        tdbg(`map event: sourcedata ${e.sourceId}`, {
          type: e.sourceDataType,
          loaded: e.isSourceLoaded
        });
      });
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

      <MapRastersHandler perPanel={perPanel(panelRasters)} />

      <GeoJsonHandler config={options.geoJson} />
      <ImageSourcesHandler perPanel={perPanel(d => d.imageSources ?? [])} />
      <IconsHandler perPanel={perPanel(d => d.icons ?? [])} />
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
