<script lang="ts">
  /**
   * Unified handler for 'openmaptiles' vector data.
   *
   * Manages the lifecycle of the vector source and its associated layers, including
   * base map geometry (land, water, roads) and administrative labels.
   */
  import type * as maplibregl from 'maplibre-gl';
  import type { MapLabelsLayer, StreetMapLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import { hasMapLabels } from '../../../lib/data/layerHelpers.ts';
  import { getContext, untrack } from 'svelte';
  import {
    OPENMAPTILES_SOURCE_ID,
    OPENMAPTILES_SOURCE_DEF,
    getStreetBaseLayers,
    getLabelLayers,
    getBaseStyleSource
  } from '../../CustomGlobe/mapStyle/streetMap';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    setLayersZIndex,
    Z_INDEX_BASE_VECTOR,
    Z_INDEX_BASE_LABELS
  } from '../layers/layerUtils.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  interface Props {
    /** `GlobeJsonBlob.map.base` — the base style the vector geometry is drawn for */
    base?: string;
    /** The blob's `streetMap` layer, if it has one. Absent means the user removed it. */
    streetMap?: Stacked<StreetMapLayer>;
    /** The blob's `mapLabels` layer, if it has one. Absent means no built-in labels. */
    mapLabels?: Stacked<MapLabelsLayer>;
    isSatellite?: boolean;
  }

  let { base, streetMap, mapLabels, isSatellite = false }: Props = $props();

  const streetMapZIndex = $derived(streetMap?.zIndex ?? Z_INDEX_BASE_VECTOR);
  const zIndex = $derived(mapLabels?.zIndex ?? Z_INDEX_BASE_LABELS);

  // `enabled: false` is an older blob's way of saying the layer was deleted; a layer
  // with every individual toggle off is equally nothing to draw.
  const hasLabels = $derived(mapLabels?.enabled !== false && hasMapLabels(mapLabels));
  const showBase = $derived(Boolean(streetMap) && !streetMap?.hideOsm && (base === 'street' || !base));
  const needsSource = $derived(showBase || hasLabels);

  // Effect for Source and Layer lifecycle
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    if (!needsSource) return;

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

      if (s_showBase && map.getLayer('background')) {
        const defaultBackground = (
          getBaseStyleSource().layers.find(layer => layer.id === 'background') as
            maplibregl.BackgroundLayerSpecification | undefined
        )?.paint?.['background-color'];
        // Guard against passing a literal `undefined` colour to setPaintProperty (e.g. if the
        // base style's 'background' layer is ever renamed/removed) — MapLibre crashes trying
        // to read channel values off an undefined colour at render time rather than failing loudly.
        if (defaultBackground !== undefined) {
          map.setPaintProperty('background', 'background-color', defaultBackground);
        }
      }

      if (s_showBase) {
        baseLayers.forEach((layer, idx) => {
          const layerZ = untrack(() => (streetMapZIndex ?? Z_INDEX_BASE_VECTOR) + idx * 0.0001);
          if (!map.getLayer(layer.id)) {
            addLayerWithZIndex(map, layer as any, layerZ);
          }
        });
      }

      if (s_hasLabels) {
        labelLayers.forEach((layer, idx) => {
          const layerZ = untrack(() => (zIndex ?? Z_INDEX_BASE_LABELS) + idx * 0.0001);
          if (!map.getLayer(layer.id)) {
            addLayerWithZIndex(map, layer as any, layerZ);
          } else if (layer.paint) {
            Object.keys(layer.paint).forEach(prop => {
              map.setPaintProperty(layer.id, prop as any, (layer.paint as any)[prop]);
            });
          }
        });
      }
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

  // Effect for dynamic z-index restacking on base vector layers
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;
    const effectiveZ = streetMapZIndex ?? Z_INDEX_BASE_VECTOR;
    const baseLayers = getStreetBaseLayers();

    setLayersZIndex(
      map,
      baseLayers.map(l => l.id),
      effectiveZ
    );
  });

  // Effect for dynamic z-index restacking on label layers
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;
    const effectiveZ = zIndex ?? Z_INDEX_BASE_LABELS;
    const labelLayers = getLabelLayers(isSatellite);

    setLayersZIndex(
      map,
      labelLayers.map(l => l.id),
      effectiveZ
    );
  });

  // Effect for dynamic visibility
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    const countriesMajor = mapLabels?.countriesMajor ?? true;
    const countriesMedium = mapLabels?.countriesMedium ?? true;
    const countriesMinor = mapLabels?.countriesMinor ?? true;
    const continents = mapLabels?.continents ?? false;
    const states = mapLabels?.states ?? false;
    const cities = mapLabels?.cities ?? false;
    const towns = mapLabels?.towns ?? false;
    const oceans = mapLabels?.oceans ?? false;

    const syncVisibility = () => {
      // COUNTRIES
      const countryLayers: Record<string, boolean> = {
        'place-country-1': countriesMajor,
        'place-country-rank1-symbol': countriesMajor,
        'place-country-2': countriesMedium,
        'place-country-rank2-symbol': countriesMedium,
        'place-country-3': countriesMinor,
        'place-country-rank>=3-symbol': countriesMinor,
        'place-country-other': countriesMinor
      };

      Object.entries(countryLayers).forEach(([id, isVisible]) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', isVisible ? 'visible' : 'none');
        }
      });

      // CONTINENTS
      ['place-continent', 'place-continent-symbol'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', continents ? 'visible' : 'none');
        }
      });

      // STATES
      ['place-state', 'place-state-symbol', 'place-state-AU-symbol'].forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', states ? 'visible' : 'none');
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
          map.setLayoutProperty(id, 'visibility', cities ? 'visible' : 'none');
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
          map.setLayoutProperty(id, 'visibility', towns ? 'visible' : 'none');
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
          map.setLayoutProperty(id, 'visibility', oceans ? 'visible' : 'none');
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
        map.setLayoutProperty('boundary-land-level-2', 'visibility', 'visible');
      }
      if (map.getLayer('boundary-land-disputed')) {
        map.setLayoutProperty('boundary-land-disputed', 'visibility', 'visible');
      }
      if (map.getLayer('boundary-land-level-4')) {
        map.setLayoutProperty('boundary-land-level-4', 'visibility', 'none');
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
