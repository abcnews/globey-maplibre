<script lang="ts">
  /**
   * Unified handler for 'openmaptiles' vector data.
   *
   * Manages the lifecycle of the vector source and its associated layers, including
   * base map geometry (land, water, roads) and administrative labels.
   *
   * - **Lazy Loading**: Omits the source if no layers are active to save bandwidth.
   * - **Dynamic Theming**: Adjusts label styles automatically for light/dark backgrounds.
   * - **Shared Source**: Uses a single source for both geometry and text layers.
   *
   * @example
   * <MapVectorHandler
   *   base="satellite"
   *   labels={{ countries: 3, states: true, boundaries: 'national', ... }}
   *   isSatellite={true}
   * />
   */
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import {
    OPENMAPTILES_SOURCE_ID,
    OPENMAPTILES_SOURCE_DEF,
    getStreetBaseLayers,
    getLabelLayers,
    getBaseStyleSource
  } from '../mapStyle/streetMap';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    base,
    labels = {
      countries: 3,
      states: false,
      cities: false,
      towns: false,
      oceans: false,
      continents: false,
      boundaries: 'national'
    },
    isSatellite = false
  }: {
    base?: string;
    labels?: {
      countries: number;
      states: boolean;
      cities: boolean;
      towns: boolean;
      oceans: boolean;
      continents: boolean;
      boundaries: 'none' | 'national' | 'state';
    };
    isSatellite?: boolean;
  } = $props();

  // Determine if we need to show labels at all
  const hasLabels = $derived(
    labels.countries > 0 || labels.states || labels.cities || labels.towns || labels.oceans || labels.continents
  );

  // Determine if we need to show base layers (only in street mode)
  const showBase = $derived(base === 'street' || !base);

  // Determine if we need the vector source at all
  const needsSource = $derived(showBase || hasLabels);

  // Effect for Source and Layer lifecycle
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    if (!needsSource) return;

    // Use current values to trigger reactivity
    const s_isSatellite = isSatellite;
    const s_showBase = showBase;
    const s_hasLabels = hasLabels;

    const baseLayers = s_showBase ? getStreetBaseLayers() : [];
    const labelLayers = s_hasLabels ? getLabelLayers(s_isSatellite) : [];
    const allLayers = [...baseLayers, ...labelLayers];

    const addLayers = () => {
      if (!map.getSource(OPENMAPTILES_SOURCE_ID)) {
        map.addSource(OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF as any);
      }

      // Update background color for street map
      if (s_showBase && map.getLayer('background')) {
        const defaultBackground = getBaseStyleSource().layers.find(layer => layer.id === 'background')?.paint?.[
          'background-color'
        ];
        map.setPaintProperty('background', 'background-color', defaultBackground);
      }

      const currentStyle = map.getStyle();
      const firstNonBackground = currentStyle?.layers?.find(l => l.id !== 'background')?.id;

      allLayers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          const insertBefore = s_showBase && baseLayers.includes(layer) ? firstNonBackground : undefined;
          map.addLayer(layer as any, insertBefore);
        } else if (labelLayers.includes(layer) && layer.paint) {
          // Update paint properties if they already exist (e.g. theme change)
          Object.keys(layer.paint).forEach(prop => {
            map.setPaintProperty(layer.id, prop, (layer.paint as any)[prop]);
          });
        }
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.once('styledata', addLayers);
    }

    return () => {
      map.off('styledata', addLayers);
      allLayers.forEach(layer => {
        if (map.getLayer(layer.id)) map.removeLayer(layer.id);
      });
    };
  });

  // Effect for dynamic visibility - this is much more reactive
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Track all individual label properties to ensure reactivity
    const deps = [
      labels.countries,
      labels.continents,
      labels.states,
      labels.cities,
      labels.towns,
      labels.oceans,
      labels.boundaries
    ];

    const syncVisibility = () => {
      // COUNTRIES
      // We map layers to the minimum level required for them to be visible
      const countryLayers: Record<string, number> = {
        'place-country-1': 1,
        'place-country-2': 2,
        'place-country-3': 3,
        'place-country-other': 3
      };

      Object.entries(countryLayers).forEach(([id, minLevel]) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.countries >= minLevel ? 'visible' : 'none');
        }
      });

      // CONTINENTS
      if (map.getLayer('place-continent')) {
        map.setLayoutProperty('place-continent', 'visibility', labels.continents ? 'visible' : 'none');
      }

      // STATES
      if (map.getLayer('place-state')) {
        map.setLayoutProperty('place-state', 'visibility', labels.states ? 'visible' : 'none');
      }

      // CITIES
      ['place-city', 'place-city-important', 'place-city-capital', 'place-city-capital-state'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.cities ? 'visible' : 'none');
        }
      });

      // TOWNS
      ['place-town', 'place-village', 'place-other'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.towns ? 'visible' : 'none');
        }
      });

      // OCEANS
      [
        'water-name-ocean1',
        'water-name-sea',
        'water-name-lake',
        'water-name-lakeline',
        'water-name-bay-straight'
      ].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', labels.oceans ? 'visible' : 'none');
        }
      });

      // BOUNDARIES
      if (map.getLayer('boundary-land-level-2')) {
        map.setLayoutProperty(
          'boundary-land-level-2',
          'visibility',
          labels.boundaries === 'national' || labels.boundaries === 'state' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('boundary-land-disputed')) {
        map.setLayoutProperty(
          'boundary-land-disputed',
          'visibility',
          labels.boundaries === 'national' || labels.boundaries === 'state' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('boundary-land-level-4')) {
        map.setLayoutProperty(
          'boundary-land-level-4',
          'visibility',
          labels.boundaries === 'state' ? 'visible' : 'none'
        );
      }
      if (map.getLayer('boundary-land-level-6')) {
        map.setLayoutProperty('boundary-land-level-6', 'visibility', 'none');
      }
    };

    if (map.isStyleLoaded()) {
      syncVisibility();
    } else {
      map.once('styledata', syncVisibility);
      return () => map.off('styledata', syncVisibility);
    }
  });
</script>
