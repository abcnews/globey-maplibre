<script>
  import { MapLibreLoader, STYLE_BRIGHT } from '@abcnews/components-storylab/mapLibre';
  let { onClick, geojson, locations } = $props();
  let isOpen = $state(false);
</script>

<MapLibreLoader
  rootElStyle="width:100%;height:100%"
  onLoad={async ({ rootNode, maplibregl }) => {
    return new maplibregl.Map({
      zoom: 1,
      minZoom: 2,
      maxZoom: 13,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false,
      style: STYLE_BRIGHT,
      container: rootNode,
      interactive: true,
      center: [133.28, -28.15]
    });
  }}
></MapLibreLoader>
