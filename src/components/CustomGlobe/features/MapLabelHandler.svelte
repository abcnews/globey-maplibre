<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import { OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF, getLabelLayers } from '../mapStyle/streetMap';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const {
    labels = {
      countries: 3,
      states: false,
      cities: false,
      towns: false,
      oceans: false
    },
    isSatellite = false
  }: {
    labels?: {
      countries: number;
      states: boolean;
      cities: boolean;
      towns: boolean;
      oceans: boolean;
    };
    isSatellite?: boolean;
  } = $props();

  $effect(() => {
    if (!mapRoot.map) {
      return;
    }

    const map = mapRoot.map;

    const addLayers = () => {
      // Ensure source exists
      if (!map.getSource(OPENMAPTILES_SOURCE_ID)) {
        map.addSource(OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF as any);
      }

      const labelLayers = getLabelLayers(isSatellite);
      labelLayers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          map.addLayer(layer as any);
        } else if (layer.paint) {
          // Update colors if theme changed
          if ('text-color' in layer.paint) {
            map.setPaintProperty(layer.id, 'text-color', layer.paint['text-color']);
          }
          if ('text-halo-color' in layer.paint) {
            map.setPaintProperty(layer.id, 'text-halo-color', layer.paint['text-halo-color']);
          }
        }
      });

      // Update visibility regardless of whether layers were just added
      updateVisibility(map);
    };

    const updateVisibility = (map: maplibregl.Map) => {
      // COUNTRIES
      [1, 2, 3].forEach(i => {
        const id = `place-country-${i}`;
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.countries >= i ? 'visible' : 'none');
        }
      });

      // STATES
      if (map.getLayer('place-state')) {
        map.setLayoutProperty('place-state', 'visibility', labels.states ? 'visible' : 'none');
      }

      // CITIES
      ['place-city', 'place-city-capital'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.cities ? 'visible' : 'none');
        }
      });

      // TOWNS
      if (map.getLayer('place-town')) {
        map.setLayoutProperty('place-town', 'visibility', labels.towns ? 'visible' : 'none');
      }

      // OCEANS
      ['water-name-ocean', 'water-name-other'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.oceans ? 'visible' : 'none');
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
      const labelLayers = getLabelLayers(isSatellite);
      labelLayers.forEach(layer => {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      });
    };
  });
</script>
