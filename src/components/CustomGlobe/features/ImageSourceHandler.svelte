<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { config, beforeId }: { config: ImageSourceConfig; beforeId?: string } = $props();

  $effect(() => {
    if (!mapRoot.map || !config || !config.url) return;
    const map = mapRoot.map;
    const sourceId = `image-source-${config.id}`;
    const layerId = `image-layer-${config.id}`;

    const update = () => {
      // If the map hasn't finished its style transition, addSource will throw.
      // We rely on try/catch + events to eventually succeed.
      if (!map.getStyle()) return;

      // Ensure we have 4 coordinate pairs, otherwise MapLibre throws
      const coordinates =
        config.coordinates?.length === 4
          ? config.coordinates
          : [
              [0, 0],
              [0, 0],
              [0, 0],
              [0, 0]
            ];

      if (!map.getSource(sourceId)) {
        try {
          console.log(`[ImageSourceHandler] Attempting to add ${config.id}: ${config.url}`);
          map.addSource(sourceId, {
            type: 'image',
            url: config.url,
            coordinates: coordinates as any
          });

          map.addLayer(
            {
              id: layerId,
              type: 'raster',
              source: sourceId,
              paint: {
                'raster-opacity': config.opacity
              }
            },
            beforeId && map.getLayer(beforeId) ? beforeId : undefined
          );
          console.log(`[ImageSourceHandler] Successfully added ${config.id}`);
        } catch (e) {
          // This is expected if the style is still initializing
        }
      } else {
        const source = map.getSource(sourceId) as any;
        if (source && source.setCoordinates) {
          source.setCoordinates(coordinates);
        }
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, 'raster-opacity', config.opacity);
        }
      }
    };

    // Initial check
    update();

    // Listen for events that signal the map is ready for more sources/layers
    map.on('styledata', update);
    map.on('load', update);
    map.on('idle', update);

    return () => {
      map.off('styledata', update);
      map.off('load', update);
      map.off('idle', update);

      // Cleanup source/layer on unmount
      if (map.getLayer(layerId)) {
        console.log(`[ImageSourceHandler] Removing layer ${layerId}`);
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        console.log(`[ImageSourceHandler] Removing source ${sourceId}`);
        map.removeSource(sourceId);
      }
    };
  });
</script>
