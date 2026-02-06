<script lang="ts">
  import type { maplibregl } from '../../../mapLibre/index';
  import { getContext } from 'svelte';
  import naturalEarthStyle from '../../mapStyle/countriesNaturalEarth';
  import { getThemeColors } from '../../mapStyle/streetMap';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;
    const sourceId = 'natural-earth-countries-base';
    const layers = naturalEarthStyle.layers.filter(l => l.id !== 'background');
    const colors = getThemeColors();

    const addLayers = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, naturalEarthStyle.sources.composite as any);
      }

      // Update background color for countries map to match street map's water color
      if (map.getLayer('background')) {
        map.setPaintProperty('background', 'background-color', colors.ocean);
      }

      layers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          const currentLayers = map.getStyle()?.layers || [];
          const firstNonBackground = currentLayers.find(l => l.id !== 'background');
          const insertBefore = firstNonBackground ? firstNonBackground.id : undefined;

          // Override Natural Earth colors with theme colors
          const l = {
            ...layer,
            source: sourceId,
            paint: {
              ...layer.paint,
              ...(layer.id === 'countries-fill' ? { 'fill-color': colors.land } : {})
            }
          };
          map.addLayer(l as any, insertBefore);
        }
      });
    };

    if (map.isStyleLoaded()) addLayers();
    else map.on('styledata', addLayers);

    return () => {
      map.off('styledata', addLayers);
      layers.forEach(layer => {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      });
    };
  });
</script>
