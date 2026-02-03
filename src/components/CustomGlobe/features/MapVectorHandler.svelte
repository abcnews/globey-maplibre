<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import { OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF, getStreetBaseLayers } from '../mapStyle/streetMap';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    const layers = getStreetBaseLayers();

    const addLayers = () => {
      // Ensure source exists
      if (!map.getSource(OPENMAPTILES_SOURCE_ID)) {
        map.addSource(OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF as any);
      }

      // Update background color for street map
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', '#EDF0F2');
      }

      layers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          const currentLayers = map.getStyle()?.layers || [];
          const firstNonBackground = currentLayers.find(l => l.id !== 'background');
          const insertBefore = firstNonBackground ? firstNonBackground.id : undefined;

          map.addLayer(layer, insertBefore);
        }
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on('styledata', addLayers);
    }

    return () => {
      map.off('styledata', addLayers);
      layers.forEach(layer => {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      });
    };
  });
</script>
