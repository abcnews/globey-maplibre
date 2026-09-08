<script lang="ts">
  /**
   * Unified handler for 'openmaptiles' vector data.
   *
   * Manages the lifecycle of the vector source and its associated layers, including
   * base map geometry (land, water, roads) and administrative labels.
   */
  import type * as maplibregl from 'maplibre-gl';
  import type { MapLabelsConfig } from '../../../lib/marker/types';
  import { hasMapLabels } from '../../../lib/marker/utils';
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
  import { tdbg, glog } from '../../../lib/tweenDebug.ts';
  import { tryUntil } from '../../../lib/tryUntil.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    base,
    hideOsm = false,
    streetMapZIndex = Z_INDEX_BASE_VECTOR,
    labels = {
      countriesMajor: true,
      countriesMedium: true,
      countriesMinor: true,
      continents: false,
      states: false,
      cities: false,
      towns: false,
      oceans: false
    },
    zIndex = Z_INDEX_BASE_LABELS,
    isSatellite = false
  }: {
    base?: string;
    hideOsm?: boolean;
    streetMapZIndex?: number;
    labels?: MapLabelsConfig;
    zIndex?: number;
    isSatellite?: boolean;
  } = $props();

  const hasLabels = $derived(hasMapLabels(labels));
  const showBase = $derived(!hideOsm && (base === 'street' || !base));
  const needsSource = $derived(showBase || hasLabels);

  // Effect for Source and Layer lifecycle
  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    if (!needsSource) return;

    const s_isSatellite = isSatellite;
    const s_showBase = showBase;
    const s_hasLabels = hasLabels;

    glog('MapVector', 'lifecycle RUN', {
      base,
      hideOsm,
      showBase: s_showBase,
      hasLabels: s_hasLabels,
      isSatellite: s_isSatellite,
      needsSource,
      isStyleLoaded: map.isStyleLoaded()
    });

    const baseLayers = s_showBase ? getStreetBaseLayers() : [];
    const labelLayers = s_hasLabels ? getLabelLayers(s_isSatellite) : [];
    const allLayers = [...baseLayers, ...labelLayers];
    const firstLayerId = allLayers[0]?.id;

    // Idempotent: guarded so it is safe to call now and again on every later
    // `styledata` / `load`. `map.addSource` throws while the style is still
    // settling; the listeners below retry until it takes.
    let addCalls = 0;
    const addLayers = () => {
      addCalls += 1;
      if (!map.getStyle()) {
        glog('MapVector', `addLayers #${addCalls} skipped — no style yet`);
        return;
      }

      try {
        if (!map.getSource(OPENMAPTILES_SOURCE_ID)) {
          map.addSource(OPENMAPTILES_SOURCE_ID, OPENMAPTILES_SOURCE_DEF as any);
          glog('MapVector', `addLayers #${addCalls} — added source "${OPENMAPTILES_SOURCE_ID}"`);
        }
      } catch (e) {
        glog('MapVector', `addLayers #${addCalls} — addSource threw`, e);
        return;
      }

      if (s_showBase && map.getLayer('background')) {
        const defaultBackground = (
          getBaseStyleSource().layers.find(layer => layer.id === 'background') as
            maplibregl.BackgroundLayerSpecification | undefined
        )?.paint?.['background-color'];
        map.setPaintProperty('background', 'background-color', defaultBackground);
      }

      let added = 0;

      if (s_showBase) {
        baseLayers.forEach((layer, idx) => {
          const layerZ = untrack(() => (streetMapZIndex ?? Z_INDEX_BASE_VECTOR) + idx * 0.0001);
          if (!map.getLayer(layer.id)) {
            addLayerWithZIndex(map, layer as any, layerZ);
            added += 1;
          }
        });
      }

      if (s_hasLabels) {
        labelLayers.forEach((layer, idx) => {
          const layerZ = untrack(() => (zIndex ?? Z_INDEX_BASE_LABELS) + idx * 0.0001);
          if (!map.getLayer(layer.id)) {
            addLayerWithZIndex(map, layer as any, layerZ);
            added += 1;
          } else if (layer.paint) {
            Object.keys(layer.paint).forEach(prop => {
              map.setPaintProperty(layer.id, prop as any, (layer.paint as any)[prop]);
            });
          }
        });
      }

      if (added > 0 || addCalls <= 2) {
        const present = allLayers.filter(l => map.getLayer(l.id)).length;
        glog('MapVector', `addLayers #${addCalls} — +${added}, now ${present}/${allLayers.length} layers on map`);
      }
    };

    // Match every other layer handler (raster / image / icon): add now, then
    // keep re-adding on style churn and on `load`. A single `once('styledata')`
    // is lost if it fires before the style can take the layers, or if this
    // effect's cleanup removes it first — which is why the vector base could go
    // missing in production while the other layers came up fine.
    addLayers();
    map.on('styledata', addLayers);
    map.on('load', addLayers);

    // Belt and braces: poll until the layers actually land, in case neither
    // `styledata` nor `load` fires in a state that can accept them.
    const cancelRetry = tryUntil(
      () => {
        addLayers();
        return firstLayerId ? map.getLayer(firstLayerId) != null : true;
      },
      { label: 'MapVector addLayers', intervalMs: 200, timeoutMs: 15000 }
    );

    return () => {
      glog('MapVector', 'lifecycle CLEANUP', { base, layerCount: allLayers.length });
      cancelRetry();
      map.off('styledata', addLayers);
      map.off('load', addLayers);
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
    tdbg('MapVector base restack RUN', { effectiveZ });

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
    tdbg('MapVector label restack RUN', { effectiveZ, isSatellite });

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
    tdbg('MapVector visibility RUN');

    const countriesMajor = labels?.countriesMajor ?? true;
    const countriesMedium = labels?.countriesMedium ?? true;
    const countriesMinor = labels?.countriesMinor ?? true;
    const continents = labels?.continents ?? false;
    const states = labels?.states ?? false;
    const cities = labels?.cities ?? false;
    const towns = labels?.towns ?? false;
    const oceans = labels?.oceans ?? false;

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

    // Idempotent (every branch is `if (map.getLayer(id))`), so run it now and on
    // every later style change rather than waiting on one `styledata`.
    syncVisibility();
    map.on('styledata', syncVisibility);
    map.on('load', syncVisibility);

    return () => {
      map.off('styledata', syncVisibility);
      map.off('load', syncVisibility);
    };
  });
</script>
