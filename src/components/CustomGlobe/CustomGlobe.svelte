<script lang="ts">
  import PanZoomHandler from '../features/PanZoom/PanZoomHandler.svelte';
  import PanZoomScrollHandler from '../features/PanZoom/PanZoomScrollHandler.svelte';
  import MapVectorHandler from '../features/MapVector/MapVectorHandler.svelte';
  import MapCustomLabelHandler from '../features/CustomLabels/MapCustomLabelHandler.svelte';
  import GeoJsonsHandler from '../features/GeoJson/GeoJsonsHandler.svelte';
  import ImageSourcesHandler from '../features/ImageSource/ImageSourcesHandler.svelte';
  import IconsHandler from '../features/Icon/IconsHandler.svelte';
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
  import { TweenController, type TweenClock } from '../features/Tween/TweenController.svelte.ts';
  import { setTween } from '../features/Tween/context.ts';
  import { MAPLIBRE_TWEEN_SCROLL_STATE_KEY, MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY } from '../features/Tween/utils.ts';
  import { prefersReducedMotion, disableMapAnimation } from '../../lib/stores';
  import type { CustomLayerRegistration } from '../../lib/plugins/types.ts';

  setWorkerUrl(workerUrl);

  type Props = {
    rootElStyle?: string;
    interactive: boolean;
    onLoad?: (map: Map) => void;
    /** Called with the MapLibre map instance as soon as it's constructed, before its style has loaded. */
    onmap?: (map: Map) => void;
    options: DecodedObject;
    preserveDrawingBuffer?: boolean;
    panels?: PanelDefinition<DecodedObject>[];
    currentPanel?: number;
    virtualPanel?: number;
    panelPct?: number;
    scrollPct?: number;
    scrollDelta?: number;
    children?: import('svelte').Snippet;
    /** Consumer-defined custom layers, mounted once the map is ready. */
    plugins?: CustomLayerRegistration[];
  };
  let {
    rootElStyle,
    interactive,
    onLoad,
    onmap,
    options,
    preserveDrawingBuffer = false,
    panels,
    currentPanel,
    virtualPanel,
    panelPct,
    scrollPct,
    scrollDelta,
    children,
    plugins
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
  // `tweenPosImmediate` plays on arrival. Each layer picks one through its
  // `animationClock`; the panel's `animationMode` governs the camera only.
  //
  // The two clocks are shaped differently because their tweens mean different
  // things. `scroll`'s tween is only a 150ms catch-up filter, so its position is
  // essentially linear in scroll position and `easedT` supplies the per-panel
  // curve. `immediate`'s tween *is* the animation — cubicInOut over the panel's
  // `animationDuration` — so easing it again composes two cubic ease-in-outs,
  // which pins the first ~40% of the play below 7% and then rushes the rest. It
  // is written raw.
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);

  const clampToPanels = (position: number): number =>
    Math.min(Math.max(position, 0), Math.max(tweenController.panelCount - 1, 0));

  /**
   * `shapedPosition` is read by the caller before this runs, so the effect tracks
   * both clocks even when the value written ignores them (reduced motion, or no
   * panels yet).
   */
  const clockPosition = (clock: TweenClock, shapedPosition: number): number => {
    if (tweenController.panelCount === 0) return 0;
    return reducedMotion ? clock.fromPanel : clampToPanels(shapedPosition);
  };

  $effect(() => {
    const map = mapInstance.map;
    if (!map) return;

    const { scroll, immediate } = tweenController;
    const scrollPos = clockPosition(scroll, scroll.fromPanel + scroll.easedT);
    const immediatePos = clockPosition(immediate, immediate.position);

    map.setGlobalStateProperty(MAPLIBRE_TWEEN_SCROLL_STATE_KEY, scrollPos);
    map.setGlobalStateProperty(MAPLIBRE_TWEEN_IMMEDIATE_STATE_KEY, immediatePos);
  });

  const hasDarkRaster = $derived((options.rasterLayers || []).some(r => r.darkTheme));
  const isSatellite = $derived(hasDarkRaster);
  const isDark = $derived(isSatellite || isDarkBase(options.base || 'street'));
  const isVectorLight = $derived(options.base === 'street' && !hasDarkRaster);

  // A feature's config in each panel — one array per panel on the scrollyteller
  // path, the current panel's array on the builder / static path.
  const perPanel = <T,>(pick: (d: DecodedObject) => T[]): T[][] =>
    tweenController.panelCount > 0 ? tweenController.panels.map(p => pick(p.data)) : [pick(options)];

  onMount(() => {
    if (!mapContainer) return;

    mapContainer.style.opacity = '0';
    // Globe projection's raycast reads transform matrices that aren't populated
    // until after 'load'; a real mouseover on the canvas before then crashes
    // MapLibre (unproject on an undefined pixelMatrixInverse). Block pointer
    // events until load so the browser never dispatches one to the canvas.
    mapContainer.style.pointerEvents = 'none';
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

    onmap?.(map);

    map.on('error', e => {
      console.error('[MapLibre error]', e.error?.message || e);
    });

    map.on('load', () => {
      onLoad?.(map);
      if (mapContainer) {
        mapContainer.style.opacity = '1';
        mapContainer.style.pointerEvents = '';
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

      <MapRastersHandler perPanel={perPanel(d => d.rasterLayers ?? [])} />

      <GeoJsonsHandler config={options.geoJson} />
      <ImageSourcesHandler perPanel={perPanel(d => d.imageSources ?? [])} />
      <IconsHandler perPanel={perPanel(d => d.icons ?? [])} />
      {#if options.minimap && options.minimap.enabled !== false}
        <MinimapHandler bind:config={options.minimap} {interactive} />
      {/if}
      {#each plugins ?? [] as plugin (plugin.id)}
        <plugin.component map={mapInstance.map} config={plugin.config} zIndex={plugin.zIndex} />
      {/each}
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
