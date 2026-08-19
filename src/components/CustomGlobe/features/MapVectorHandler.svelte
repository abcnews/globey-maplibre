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
   *   labels={{ countriesMajor: true, countriesMedium: true, countriesMinor: true, ... }}
   *   isSatellite={true}
   * />
   */
  import type * as maplibregl from 'maplibre-gl';
  import type { MapLabelsConfig } from '../../../lib/marker/types';
  import { getContext } from 'svelte';
  import {
    OPENMAPTILES_SOURCE_ID,
    OPENMAPTILES_SOURCE_DEF,
    getStreetBaseLayers,
    getLabelLayers,
    getBaseStyleSource
  } from '../mapStyle/streetMap';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_BASE_VECTOR, Z_INDEX_BASE_LABELS } from './layerUtils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    base,
    labels = {
      countriesMajor: true,
      countriesMedium: true,
      countriesMinor: true,
      continents: false,
      states: false,
      cities: false,
      towns: false,
      oceans: false,
      nationalBoundaries: true,
      stateBoundaries: false
    },
    isSatellite = false
  }: {
    base?: string;
    labels?: MapLabelsConfig;
    isSatellite?: boolean;
  } = $props();

  // Determine if we need to show labels at all
  const hasLabels = $derived(Object.values(labels).filter(Boolean).length > 0);

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
      // Check if source exists before adding layers
      if (!map.getSource(OPENMAPTILES_SOURCE_ID)) {
        map.addSource(OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF as any);
      }

      // Update background color for street map
      if (s_showBase && map.getLayer('background')) {
        const defaultBackground = (
          getBaseStyleSource().layers.find(layer => layer.id === 'background') as
            maplibregl.BackgroundLayerSpecification | undefined
        )?.paint?.['background-color'];
        map.setPaintProperty('background', 'background-color', defaultBackground);
      }

      allLayers.forEach(layer => {
        const isBase = baseLayers.includes(layer);
        const zIndex = isBase ? Z_INDEX_BASE_VECTOR : Z_INDEX_BASE_LABELS;

        if (!map.getLayer(layer.id)) {
          addLayerWithZIndex(map, layer as any, zIndex);
        } else if (labelLayers.includes(layer) && layer.paint) {
          // Update paint properties if they already exist (e.g. theme change)
          Object.keys(layer.paint).forEach(prop => {
            map.setPaintProperty(layer.id, prop as any, (layer.paint as any)[prop]);
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
        removeLayerWithZIndex(map, layer.id);
      });
    };
  });

  // Effect for dynamic visibility - this is much more reactive
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    const currentLabels = $state.snapshot(labels);

    const syncVisibility = () => {
      // COUNTRIES
      const countryLayers: Record<string, boolean> = {
        'place-country-1': currentLabels.countriesMajor,
        'place-country-rank1-symbol': currentLabels.countriesMajor,
        'place-country-2': currentLabels.countriesMedium,
        'place-country-rank2-symbol': currentLabels.countriesMedium,
        'place-country-3': currentLabels.countriesMinor,
        'place-country-rank>=3-symbol': currentLabels.countriesMinor,
        'place-country-other': currentLabels.countriesMinor
      };

      Object.entries(countryLayers).forEach(([id, isVisible]) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
        }
      });

      // CONTINENTS
      ['place-continent', 'place-continent-symbol'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', currentLabels.continents ? 'visible' : 'none');
        }
      });

      // STATES
      ['place-state', 'place-state-symbol', 'place-state-AU-symbol'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', currentLabels.states ? 'visible' : 'none');
        }
      });

      // CITIES
      [
        'place-city',
        'place-city-symbol',
        'place-city-important',
        'place-city-important-symbol',
        'place-city-capital',
        'place-city-capital-symbol',
        'place-city-capital-state',
        'place-city-capital_state-symbol'
      ].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', currentLabels.cities ? 'visible' : 'none');
        }
      });

      // TOWNS
      [
        'place-town',
        'place-town-symbol',
        'place-village',
        'place-village_hamlet-symbol',
        'place-borough_suburb-symbol',
        'place-island-major-symbol',
        'place-island-minor-symbol',
        'place-other'
      ].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', currentLabels.towns ? 'visible' : 'none');
        }
      });

      // OCEANS
      [
        'water-name-ocean1',
        'water_name-ocean-symbol',
        'water-name-sea',
        'water_name-sea-symbol',
        'water-name-lake',
        'water_name-lake-symbol',
        'water-name-lakeline',
        'water_name-lakeline-symbol',
        'water-name-bay-straight',
        'water_name-bay_strait-symbol',
        'waterway-name-symbol'
      ].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', currentLabels.oceans ? 'visible' : 'none');
        }
      });

      // OTHER UNMANAGED SYMBOLS
      ['mountain_peak-symbol', 'aerodrome_label-major-symbol', 'transportation_name-road-symbol'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', 'none');
        }
      });

      // BOUNDARIES
      if (map.getLayer('boundary-land-level-2')) {
        map.setLayoutProperty('boundary-land-level-2', 'visibility', currentLabels.nationalBoundaries ? 'visible' : 'none');
      }
      if (map.getLayer('boundary-land-disputed')) {
        map.setLayoutProperty('boundary-land-disputed', 'visibility', currentLabels.nationalBoundaries ? 'visible' : 'none');
      }
      if (map.getLayer('boundary-land-level-4')) {
        map.setLayoutProperty('boundary-land-level-4', 'visibility', currentLabels.stateBoundaries ? 'visible' : 'none');
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
