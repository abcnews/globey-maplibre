<script lang="ts">
  import type { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import type { Label } from '../../../lib/marker';
  import {
    addLayerWithZIndex,
    setLayerZIndex,
    removeLayerWithZIndex,
    Z_INDEX_CUSTOM_LABELS
  } from '../layers/layerUtils.ts';
  import { getCustomLabelLayers } from '../../CustomGlobe/mapStyle/customLabelStyle';
  import { prefersReducedMotion, disableMapAnimation } from '../../../lib/stores';
  import { getTween } from '../Tween/context.ts';
  import { resolveLabelTransition } from './utils.ts';

  const SOURCE_ID = 'custom-labels';

  interface Props {
    /** Array of custom user labels to render (builder / static fallback) */
    labels?: Label[];
    /** Virtual Z-Index layer order for stacking */
    zIndex?: number;
    /** Whether the current map style is in dark/satellite mode */
    isDark?: boolean;
  }

  let { labels = [], zIndex, isDark = false }: Props = $props();

  const mapRoot = getContext<{ map: MapLibreMap | null }>('mapInstance');
  const tween = getTween();

  // On the scrollyteller path, cross-fade between the two panels the tween is
  // blending. With no panels loaded (builder / static), fall back to the `labels`
  // prop with no transition.
  const active = $derived(tween.panelCount > 0);
  const fromLabels = $derived(active ? (tween.fromConfig.labels ?? []) : labels);
  const toLabels = $derived(active ? (tween.toConfig.labels ?? []) : labels);
  // Reduced motion + scroll mode still tracks scroll 1:1, so snap to a single
  // hard swap at the segment midpoint rather than fading.
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
  const easedT = $derived(!active ? 0 : reducedMotion ? (tween.t < 0.5 ? 0 : 1) : tween.easedT);

  const features = $derived(resolveLabelTransition(fromLabels, toLabels, easedT));
  const featuresJson = $derived(JSON.stringify(features));
  const activeZIndex = $derived(zIndex ?? Z_INDEX_CUSTOM_LABELS);

  // 1. Initialise Layer & Source once, and clean up only on component unmount
  $effect(() => {
    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    untrack(() => {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }

      layers.forEach(layer => {
        if (!map.getLayer(layer.id)) {
          addLayerWithZIndex(map, layer, activeZIndex);
        }
      });
    });

    return () => {
      layers.forEach(layer => {
        removeLayerWithZIndex(map, layer.id);
      });
      if (map.getSource(SOURCE_ID)) {
        map.removeSource(SOURCE_ID);
      }
    };
  });

  // 2. Push the resolved (cross-faded) label set into the source. Re-runs on
  //    every tween tick while a transition plays, and once at rest per panel.
  $effect(() => {
    featuresJson;

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const geoJsonData: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: features.map((feature, index) => ({
        type: 'Feature',
        id: index,
        properties: {
          name: feature.name,
          style: feature.style,
          opacity: feature.opacity
        },
        geometry: {
          type: 'Point',
          coordinates: feature.coords
        }
      }))
    };

    source.setData(geoJsonData);
  });

  // 3. Update paint properties seamlessly when isDark changes
  $effect(() => {
    isDark;

    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    layers.forEach(layer => {
      if (map.getLayer(layer.id) && layer.paint) {
        if (layer.paint['text-color']) {
          map.setPaintProperty(layer.id, 'text-color', layer.paint['text-color']);
        }
        if (layer.paint['text-halo-color']) {
          map.setPaintProperty(layer.id, 'text-halo-color', layer.paint['text-halo-color']);
        }
      }
    });
  });

  // 4. Dynamically restack layers if activeZIndex changes
  $effect(() => {
    if (!mapRoot?.map || typeof window === 'undefined') return;
    const map = mapRoot.map;
    const layers = getCustomLabelLayers(isDark, SOURCE_ID);

    layers.forEach(layer => {
      if (map.getLayer(layer.id)) {
        setLayerZIndex(map, layer.id, activeZIndex);
      }
    });
  });
</script>
