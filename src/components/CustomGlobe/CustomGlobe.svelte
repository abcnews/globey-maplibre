<script lang="ts">
  import PanZoomHandler from './features/PanZoomHandler.svelte';
  import MapLabelHandler from './features/MapLabelHandler.svelte';
  import MapCustomLabelHandler from './features/MapCustomLabelHandler.svelte';
  import type { DecodedObject } from '../../lib/marker';
  import mapStyle from './mapStyle/streetMap';
  import { MapLibreLoader } from '../mapLibre/index';
  import countriesNaturalEarth from './mapStyle/countriesNaturalEarth';
  type Props = {
    interactive: Boolean;
    onLoad?: (map: maplibre.Map) => void;
    options: DecodedObject;
  };
  let { interactive, onLoad, options, children }: Props = $props();
</script>

<MapLibreLoader
  rootElStyle="width:100%;height:100vh"
  onLoad={async ({ rootNode, maplibregl }) => {
    rootNode.style.opacity = '0';
    const map = new maplibregl.Map({
      zoom: options.z || 3,
      minZoom: -1,
      maxZoom: 13,
      attributionControl: false,
      dragRotate: false,
      doubleClickZoom: false,
      style: countriesNaturalEarth,
      container: rootNode,
      interactive: !!interactive,
      center: options.coords
    });

    await Promise.all([new Promise(resolve => map.on('load', resolve))]);
    map.setProjection({
      type: 'globe' // Set projection to globe
    });

    onLoad?.(map);

    rootNode.style.opacity = '1';
    return map;
  }}
>
  <PanZoomHandler coords={options.coords} z={options.z} bounds={options.bounds} />
  <MapLabelHandler />
  <MapCustomLabelHandler labels={options.labels} />
  {@render children?.()}
</MapLibreLoader>
