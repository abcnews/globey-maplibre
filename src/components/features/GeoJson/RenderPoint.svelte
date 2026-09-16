<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import {
    buildColourExpression,
    buildOpacityExpression,
    buildStrokeWidthExpression,
    buildRadiusExpression,
    buildFilterExpression,
    getKilometreZoomScaleExpression
  } from './utils.ts';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';
  import { tweenStopsExpression, MAPLIBRE_TWEEN_SCROLL_STATE_KEY } from '../Tween/utils.ts';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    config,
    sourceId,
    /** One opacity per panel (1 present / 0 absent), multiplied into every opacity paint property. */
    opacityStops = [1],
    /** Global-state key this layer's fade follows. */
    posKey = MAPLIBRE_TWEEN_SCROLL_STATE_KEY,
    zIndex = config.zIndex ?? Z_INDEX_GEOJSON
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    opacityStops?: number[];
    posKey?: string;
    zIndex?: number;
  } = $props();

  const tweenFactor = $derived(tweenStopsExpression(opacityStops, posKey));

  const circleLayerId = $derived(`${sourceId}-circle`);

  // Fixed real-world radius keeps its zoom expression; otherwise driven by config.
  const radiusExpr = $derived(
    config.pointSize?.unit === 'k' ? getKilometreZoomScaleExpression(config.pointSize.value) : buildRadiusExpression(config)
  );

  // Add the source and the circle layer once, on mount. Paint/filter are then
  // kept in sync with `config` by the effect below, in place.
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    untrack(() => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: data || { type: 'FeatureCollection', features: [] } });
      }
      if (!map.getLayer(circleLayerId)) {
        addLayerWithZIndex(
          map,
          { id: circleLayerId, type: 'circle', source: sourceId, paint: { 'circle-pitch-scale': 'map' } },
          zIndex
        );
      }
    });

    return () => {
      removeLayerWithZIndex(map, circleLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer(circleLayerId)) return;

    map.setFilter(circleLayerId, buildFilterExpression(config.filter) ?? null);

    map.setPaintProperty(circleLayerId, 'circle-color', buildColourExpression(config, 'marker'));
    map.setPaintProperty(circleLayerId, 'circle-radius', radiusExpr);
    map.setPaintProperty(circleLayerId, 'circle-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'circle')]);
    map.setPaintProperty(circleLayerId, 'circle-stroke-color', buildColourExpression(config, 'stroke'));
    map.setPaintProperty(circleLayerId, 'circle-stroke-width', buildStrokeWidthExpression(config));
    map.setPaintProperty(circleLayerId, 'circle-stroke-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);
  });
</script>
