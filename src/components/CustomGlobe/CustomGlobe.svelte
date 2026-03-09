<script lang="ts">
  import PanZoomHandler from './features/PanZoomHandler.svelte';
  import MapVectorHandler from './features/MapVectorHandler.svelte';
  import MapCustomLabelHandler from './features/MapCustomLabelHandler.svelte';
  import HighlightCountriesHandler from './features/HighlightCountries/HighlightCountriesHandler.svelte';
  import GeoJsonHandler from './features/GeoJson/GeoJsonHandler.svelte';
  import ImageSourcesHandler from './features/ImageSourcesHandler.svelte';
  import type { DecodedObject } from '../../lib/marker';
  import { MapLibreLoader } from '../mapLibre/index';
  import MapRasterHandler from './features/MapRasterHandler.svelte';
  import MapCountriesBaseHandler from './features/HighlightCountries/MapCountriesBaseHandler.svelte';
  import ProjectionHandler from './features/ProjectionHandler.svelte';
  import { MAX_ZOOM } from '../../lib/constants';
  import MalibrePreload from './maplibrePreload.js';
  import type { maplibregl } from '../mapLibre/index';
  import { isDarkBase } from './mapStyle/utils';

  type Props = {
    rootElStyle?: string;
    interactive: Boolean;
    onLoad?: (map: maplibregl.Map) => void;
    options: DecodedObject;
    children?: import('svelte').Snippet;
  };
  let { rootElStyle, interactive, onLoad, options, children }: Props = $props();

  let mapInstance = $state<maplibregl.Map | null>(null);

  const isDark = $derived(isDarkBase(options.base || 'street'));
  const isSatellite = $derived(options.base === 'satellite');
  const isVectorLight = $derived(options.base === 'street' || options.base === 'countries');
</script>

<div
  class="custom-globe"
  class:custom-globe--satellite={isSatellite}
  class:custom-globe--dark={isDark}
  class:custom-globe--vector-light={isVectorLight}
  style={rootElStyle}
>
  <MapLibreLoader
    {rootElStyle}
    onLoad={async ({ rootNode, maplibregl }) => {
      if (!rootNode) {
        console.log('no root node', rootNode, maplibregl);
        return false;
      }
      rootNode.style.opacity = '0';
      const map = new maplibregl.Map({
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
        container: rootNode,
        interactive: !!interactive,
        center: options.coords,
        projection: { type: options.projection || 'globe' }
      } as any);

      // new MalibrePreload(map, {
      //   progressCallback: ({ loaded, total, failed }) => {
      //     console.log(`Preloading tiles: ${loaded}/${total} loaded, ${failed} failed`);
      //   },
      //   async: true,
      //   burstLimit: 250,
      //   useTile: true
      // });

      map.on('load', () => {
        onLoad?.(map);
        rootNode.style.opacity = '1';
        mapInstance = map;
      });

      return map;
    }}
  >
    {#if mapInstance}
      <ProjectionHandler projection={options.projection} />
      <PanZoomHandler coords={options.coords} z={options.z} bounds={options.bounds} fitGlobe={options.fitGlobe} />

      <MapVectorHandler base={options.base} labels={options.mapLabels} {isSatellite} />

      <MapCustomLabelHandler labels={options.labels} {isDark} />

      {#if options.base === 'countries'}
        <MapCountriesBaseHandler />
        <HighlightCountriesHandler highlightCountries={options.highlightCountries} />
      {:else if options.base === 'satellite'}
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
  </MapLibreLoader>
</div>

<style>
  .custom-globe {
    transition: background-color 250ms;
    width: 100%;
    height: 100%;
  }

  .custom-globe--satellite {
    background-color: #000;
  }
</style>
