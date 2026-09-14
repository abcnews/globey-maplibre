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
    getKilometreZoomScaleExpression,
    filterFeaturesType
  } from './utils.ts';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    config,
    sourceId,
    zIndex = config.zIndex ?? Z_INDEX_GEOJSON
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  const circleLayerId = $derived(`${sourceId}-circle`);

  // Fixed real-world radius keeps its zoom expression; otherwise driven by config.
  const radiusExpr = $derived(
    config.pointSize?.unit === 'k'
      ? getKilometreZoomScaleExpression(config.pointSize.value)
      : buildRadiusExpression(config)
  );

  // Add the source and the circle layer once, on mount. Paint/filter are then
  // kept in sync with `config` by the effect below, in place.
  $effect(() => {
    const map = mapRoot.map;
    if (!map) return;

    untrack(() => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: filterFeaturesType(data, ['Point', 'MultiPoint']) || { type: 'FeatureCollection', features: [] }
        });
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
    map.setPaintProperty(circleLayerId, 'circle-opacity', buildOpacityExpression(config, 'circle'));
    map.setPaintProperty(circleLayerId, 'circle-stroke-color', buildColourExpression(config, 'stroke'));
    map.setPaintProperty(circleLayerId, 'circle-stroke-width', buildStrokeWidthExpression(config));
    map.setPaintProperty(circleLayerId, 'circle-stroke-opacity', buildOpacityExpression(config, 'stroke'));
  });
</script>
