<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext } from 'svelte';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_BASE_RASTER } from './layerUtils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    url,
    attribution,
    id = 'raster-base',
    maxZoom
  }: {
    url: string;
    attribution?: string;
    id?: string;
    maxZoom: number;
  } = $props();

  $effect(() => {
    if (!mapRoot.map || !url) {
      return;
    }

    const map = mapRoot.map;
    const sourceId = `${id}-source`;

    const addLayer = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [url],
          tileSize: 256,
          attribution,
          maxzoom: maxZoom
        });
      }

      // Ensure background is black for satellite
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#000');
      }

      if (!map.getLayer(id)) {
        addLayerWithZIndex(
          map,
          {
            id,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-fade-duration': 0
            }
          },
          Z_INDEX_BASE_RASTER
        );
      }
    };

    if (map.isStyleLoaded()) {
      addLayer();
    } else {
      map.on('styledata', addLayer);
    }

    return () => {
      map.off('styledata', addLayer);
      removeLayerWithZIndex(map, id);
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  });
</script>
