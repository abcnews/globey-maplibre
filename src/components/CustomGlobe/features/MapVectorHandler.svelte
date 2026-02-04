<script lang="ts">
  /**
   * @file MapVectorHandler.svelte
   * @description Unified handler for MapLibre vector sources and layers (OpenMapTiles).
   *
   * This component manages:
   * 1. The lifecycle of the 'openmaptiles' vector source.
   * 2. Base map layers (land, water, roads) when in 'street' mode.
   * 3. Administrative labels (countries, cities, etc.) for both street and satellite modes.
   *
   * ### How it works:
   * - **Single Source of Truth**: This component acts as the central manager for all 'openmaptiles' vector data.
   *   It ensures the vector source is initialized correctly and shared across both the base map (geometry)
   *   and administrative labels (text).
   * - **Lazy Loading & Optimization**: The component is "lazy". It monitors requirements: if both base
   *   layers and labels are disabled (e.g., in satellite mode with labels turned off), it will omit
   *   the vector source entirely. This prevents the browser from fetching unnecessary vector tiles.
   * - **Svelte 5 Reactivity**: Leverages `$effect` to sync with MapLibre's state. To ensure full
   *   reactivity across MapLibre's asynchronous event pipeline, dependencies are explicitly tracked
   *   at the top of effects. This allows the Builder UI to toggle labels in real-time.
   * - **Dynamic Theming**: Automatically switches label styles (colors and halos) when toggling
   *   between light street backgrounds and dark satellite imagery.
   *
   * ### Example:
   * ```svelte
   * <MapVectorHandler
   *   base="satellite"
   *   labels={ { countries: 3, states: true, cities: false, towns: false, oceans: true } }
   *   isSatellite={true}
   * />
   * ```
   */
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext } from 'svelte';
  import {
    OPENMAPTILES_SOURCE_ID,
    OPENMAPTILES_SOURCE_DEF,
    getStreetBaseLayers,
    getLabelLayers
  } from '../mapStyle/streetMap';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    base,
    labels = {
      countries: 3,
      states: false,
      cities: false,
      towns: false,
      oceans: false
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
    };
    isSatellite?: boolean;
  } = $props();

  // Determine if we need to show labels at all
  const hasLabels = $derived(labels.countries > 0 || labels.states || labels.cities || labels.towns || labels.oceans);

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
        map.setPaintProperty('background', 'background-color', '#EDF0F2');
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
    const deps = [labels.countries, labels.states, labels.cities, labels.towns, labels.oceans];

    const syncVisibility = () => {
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
      syncVisibility();
    } else {
      map.once('styledata', syncVisibility);
      return () => map.off('styledata', syncVisibility);
    }
  });
</script>
