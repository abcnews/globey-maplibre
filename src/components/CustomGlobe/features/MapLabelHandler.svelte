<script lang="ts">
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const {
    labels = {
      countries: 3,
      states: false,
      cities: false,
      towns: false,
      oceans: false
    }
  }: {
    labels?: {
      countries: number;
      states: boolean;
      cities: boolean;
      towns: boolean;
      oceans: boolean;
    };
  } = $props();

  $effect(() => {
    if (!mapRoot.map || !labels) {
      return;
    }

    const map = mapRoot.map;

    // COUNTRIES
    // countries: 1 indicates place-country-1, whereas countries 3 indicates places 1-3 etc.
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
  });
</script>
