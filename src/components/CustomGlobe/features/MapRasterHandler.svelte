<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    url,
    attribution,
    id = 'raster-base'
  }: {
    url: string;
    attribution?: string;
    id?: string;
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
          maxzoom: 10
        });
      }

      // Ensure background is black for satellite
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#000');
      }

      if (!map.getLayer(id)) {
        const currentLayers = map.getStyle()?.layers || [];
        const firstNonBackground = currentLayers.find(l => l.id !== 'background');
        const insertBefore = firstNonBackground ? firstNonBackground.id : undefined;

        map.addLayer(
          {
            id,
            type: 'raster',
            source: sourceId,
            paint: {
              'raster-fade-duration': 0
            }
          },
          insertBefore
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
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  });
</script>
