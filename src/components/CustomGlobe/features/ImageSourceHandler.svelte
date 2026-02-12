<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext, onDestroy } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { config }: { config: ImageSourceConfig } = $props();

  $effect(() => {
    if (!mapRoot.map || !config) return;
    const map = mapRoot.map;
    const sourceId = `image-source-${config.id}`;
    const layerId = `image-layer-${config.id}`;

    const update = () => {
      if (!map.isStyleLoaded()) return;

      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'image',
          url: config.url,
          coordinates: (config.coordinates || [
            [0, 0],
            [0, 0],
            [0, 0],
            [0, 0]
          ]) as any
        });

        map.addLayer({
          id: layerId,
          type: 'raster',
          source: sourceId,
          paint: {
            'raster-opacity': config.opacity
          }
        });
      } else {
        const source = map.getSource(sourceId) as any;
        if (source && source.setCoordinates) {
          source.setCoordinates(config.coordinates);
        }
        map.setPaintProperty(layerId, 'raster-opacity', config.opacity);
      }
    };

    update();
    map.on('styledata', update);
    return () => {
      map.off('styledata', update);
    };
  });

  onDestroy(() => {
    if (mapRoot.map && config) {
      const map = mapRoot.map;
      const sourceId = `image-source-${config.id}`;
      const layerId = `image-layer-${config.id}`;
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  });
</script>
