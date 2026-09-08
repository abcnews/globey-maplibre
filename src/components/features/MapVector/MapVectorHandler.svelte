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

      // Add only what is missing. On a repeat call where everything is present
      // this loop does nothing — no `setLayoutProperty` / `setPaintProperty`,
      // so it does not dirty the style. That matters: those setters on a vector
      // layer mark the source for reload, and a handler that re-applies them on
      // every `styledata` starves the source of the quiet moment it needs to
      // fetch its first tiles (grey map, endless `sourcedataloading`).
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
          }
        });
      }

      // Reset the background to the street style's colour — once, on the build
      // that actually adds the base.
      if (added > 0 && s_showBase && map.getLayer('background')) {
        const defaultBackground = (
          getBaseStyleSource().layers.find(layer => layer.id === 'background') as
            maplibregl.BackgroundLayerSpecification | undefined
        )?.paint?.['background-color'];
        map.setPaintProperty('background', 'background-color', defaultBackground);
      }

      if (added > 0 || addCalls <= 2) {
        const present = allLayers.filter(l => map.getLayer(l.id)).length;
        glog('MapVector', `addLayers #${addCalls} — +${added}, now ${present}/${allLayers.length} layers on map`);
      }
    };

    // Add now; if the style cannot take the layers yet, poll until it can. We
    // deliberately do NOT listen on `styledata` here — `addLayers` is a no-op
    // once the layers exist, and re-running it on every style change was
    // creating a feedback loop that blocked tile loading.
    addLayers();
    const cancelRetry = tryUntil(
      () => {
        addLayers();
        return firstLayerId ? map.getLayer(firstLayerId) != null : true;
      },
      { label: 'MapVector addLayers', intervalMs: 200, timeoutMs: 15000 }
    );

    // Watchdog for the MapLibre source-resolution race we have hit before: if
    // the vector source still has not loaded a few seconds in, re-set its tile
    // template to force the source cache to (re)start requesting tiles, and
    // force a repaint. Re-setting the same tiles when it is already fine is a
    // cheap single reload.
    const watchdog = setTimeout(() => {
      const src = map.getSource(OPENMAPTILES_SOURCE_ID) as maplibregl.VectorTileSource | undefined;
      if (!src) return;
      const loaded = map.isSourceLoaded(OPENMAPTILES_SOURCE_ID);
      glog('MapVector', 'watchdog 4s', { isSourceLoaded: loaded, isStyleLoaded: map.isStyleLoaded() });
      if (!loaded) {
        src.setTiles?.(OPENMAPTILES_SOURCE_DEF.tiles ?? []);
        map.triggerRepaint();
      }
    }, 4000);

    return () => {
      glog('MapVector', 'lifecycle CLEANUP', { base, layerCount: allLayers.length });
      cancelRetry();
      clearTimeout(watchdog);
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

    // Only write `visibility` when it actually differs from what the layer
    // already has. `setLayoutProperty` on a vector layer marks the source for
    // reload every time, so a blind re-apply on each `styledata` starves the
    // source of the gap it needs to fetch tiles. With this guard `syncVisibility`
    // is a true no-op once applied and is safe to call on every style change.
    const setVis = (id: string, visible: boolean) => {
      if (!map.getLayer(id)) return;
      const want = visible ? 'visible' : 'none';
      const current = (map.getLayoutProperty(id, 'visibility') as string | undefined) ?? 'visible';
      if (current !== want) map.setLayoutProperty(id, 'visibility', want);
    };

    const syncVisibility = () => {
      // COUNTRIES
      setVis('place-country-1', countriesMajor);
      setVis('place-country-rank1-symbol', countriesMajor);
      setVis('place-country-2', countriesMedium);
      setVis('place-country-rank2-symbol', countriesMedium);
      setVis('place-country-3', countriesMinor);
      setVis('place-country-rank>=3-symbol', countriesMinor);
      setVis('place-country-other', countriesMinor);

      // CONTINENTS
      ['place-continent', 'place-continent-symbol'].forEach(id => setVis(id, continents));

      // STATES
      ['place-state', 'place-state-symbol', 'place-state-AU-symbol'].forEach(id => setVis(id, states));

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
      ].forEach(id => setVis(id, cities));

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
      ].forEach(id => setVis(id, towns));

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
      ].forEach(id => setVis(id, oceans));

      // OTHER UNMANAGED SYMBOLS
      ['mountain_peak-symbol', 'aerodrome_label-major-symbol', 'transportation_name-road-symbol'].forEach(id =>
        setVis(id, false)
      );

      // BOUNDARIES
      setVis('boundary-land-level-2', true);
      setVis('boundary-land-disputed', true);
      setVis('boundary-land-level-4', false);
      setVis('boundary-land-level-6', false);
    };

    // Apply now, then poll until the label layers exist (they are added by the
    // other effect). No `styledata` listener — `setLayoutProperty` churn on
    // every style change was blocking tile loading.
    syncVisibility();
    const cancelVis = tryUntil(
      () => {
        syncVisibility();
        // A real label layer id from the style (see getLabelLayers()).
        return map.getLayer('place-country-rank1-symbol') != null;
      },
      { label: 'MapVector visibility', intervalMs: 250, timeoutMs: 6000 }
    );

    return () => cancelVis();
  });
</script>
