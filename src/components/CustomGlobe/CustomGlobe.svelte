<script lang="ts">
  import PanZoomHandler from './features/PanZoomHandler.svelte';
  import MapLabelHandler from './features/MapLabelHandler.svelte';
  import MapCustomLabelHandler from './features/MapCustomLabelHandler.svelte';
  import HighlightCountriesHandler from './features/HighlightCountries/HighlightCountriesHandler.svelte';
  import GeoJsonHandler from './features/GeoJson/GeoJsonHandler.svelte';
  import ImageSourcesHandler from './features/ImageSourcesHandler.svelte';
  import type { DecodedObject } from '../../lib/marker';
  import { MapLibreLoader } from '../mapLibre/index';
  import MapRasterHandler from './features/MapRasterHandler.svelte';
  import MapVectorHandler from './features/MapVectorHandler.svelte';
  import MapCountriesBaseHandler from './features/HighlightCountries/MapCountriesBaseHandler.svelte';
  import { MAX_ZOOM } from '../../lib/constants';
  import type { maplibregl } from '../mapLibre/index';

  type Props = {
    rootElStyle?: string;
    interactive: Boolean;
    onLoad?: (map: maplibregl.Map) => void;
    options: DecodedObject;
    children?: import('svelte').Snippet;
  };
  let { rootElStyle, interactive, onLoad, options, children }: Props = $props();

  let mapInstance = $state<maplibregl.Map | null>(null);
</script>

<MapLibreLoader
  {rootElStyle}
  onLoad={async ({ rootNode, maplibregl }) => {
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
      center: options.coords
    });

    await Promise.all([new Promise(resolve => map.on('load', resolve))]);
    map.setProjection({
      type: 'globe' // Set projection to globe
    });
    await new Promise(resolve => map.on('idle', resolve));
    onLoad?.(map);

    rootNode.style.opacity = '1';
    mapInstance = map;
    return map;
  }}
>
  {#if mapInstance}
    <PanZoomHandler coords={options.coords} z={options.z} bounds={options.bounds} />
    {#if options.base !== 'satellite'}
      <MapLabelHandler labels={options.mapLabels} isSatellite={options.base === 'satellite'} />
    {/if}
    <MapCustomLabelHandler labels={options.labels} />

    {#if options.base === 'countries'}
      <MapCountriesBaseHandler />
      <HighlightCountriesHandler highlightCountries={options.highlightCountries} />
    {:else if options.base === 'satellite'}
      <MapRasterHandler
        url={'https://abcnewsdata.sgp1.digitaloceanspaces.com/map-raster-tiles-bluemarge/{z}/{x}/{y}.webp'}
        maxZoom={7}
        attribution="NASA Blue Marble"
      />
    {:else}
      <MapVectorHandler />
    {/if}

    <GeoJsonHandler config={options.geoJson} />
    <ImageSourcesHandler config={options.imageSources} geoJsonConfig={options.geoJson} />
    {@render children?.()}
  {/if}
</MapLibreLoader>

<style>
</style>
