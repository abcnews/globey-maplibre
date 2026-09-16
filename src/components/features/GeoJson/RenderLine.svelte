<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import {
    buildTweenedColourExpression,
    buildOpacityExpression,
    buildStrokeWidthExpression,
    buildFilterExpression,
    getKilometreZoomScaleExpression,
    widthPlus,
    filterFeaturesType
  } from './utils.ts';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layers/layerUtils.ts';
  import { tweenStopsExpression, MAPLIBRE_TWEEN_SCROLL_STATE_KEY } from '../Tween/utils.ts';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    config,
    sourceId,
    /** One opacity per panel (1 present / 0 absent), multiplied into every opacity paint property. */
    opacityStops = [1],
    /** This item's own config per panel — lets colour cross-fade panel to panel. */
    configStops,
    /** Global-state key this layer's fade follows. */
    posKey = MAPLIBRE_TWEEN_SCROLL_STATE_KEY,
    zIndex = config.zIndex ?? Z_INDEX_GEOJSON
  }: {
    data: any;
    config: GeoJsonConfig;
    sourceId: string;
    opacityStops?: number[];
    configStops?: (GeoJsonConfig | undefined)[];
    posKey?: string;
    zIndex?: number;
  } = $props();

  const tweenFactor = $derived(tweenStopsExpression(opacityStops, posKey));

  const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;

  const lineLayerId = $derived(`${sourceId}-line`);
  const outlineLayerId = $derived(`${sourceId}-line-outline`);

  // Fixed real-world width keeps its zoom expression; otherwise driven by config.
  const lineWidthExpr = $derived(
    config.lineWidth?.unit === 'k'
      ? getKilometreZoomScaleExpression(config.lineWidth.value)
      : buildStrokeWidthExpression(config)
  );

  // Add the source and the line + outline layer once, on mount. Paint/filter are
  // then kept in sync with `config` by the effect below, in place.
  $effect(() => {
    const map = mapRoot.map;
    const outlineZ = zIndex - SUB_LAYER_OUTLINE_OFFSET;
    if (!map) return;

    untrack(() => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: filterFeaturesType(data, ['LineString', 'MultiLineString']) || {
            type: 'FeatureCollection',
            features: []
          }
        });
      }
      if (!map.getLayer(outlineLayerId)) {
        addLayerWithZIndex(
          map,
          { id: outlineLayerId, type: 'line', source: sourceId, layout: LINE_LAYOUT, paint: {} },
          outlineZ
        );
      }
      if (!map.getLayer(lineLayerId)) {
        addLayerWithZIndex(
          map,
          { id: lineLayerId, type: 'line', source: sourceId, layout: LINE_LAYOUT, paint: {} },
          zIndex
        );
      }
    });

    return () => {
      removeLayerWithZIndex(map, outlineLayerId);
      removeLayerWithZIndex(map, lineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer(lineLayerId)) return;

    const filter = buildFilterExpression(config.filter) ?? null;
    map.setFilter(lineLayerId, filter);
    map.setFilter(outlineLayerId, filter);

    map.setPaintProperty(outlineLayerId, 'line-color', '#ffffff');
    map.setPaintProperty(outlineLayerId, 'line-width', widthPlus(lineWidthExpr, 2));
    map.setPaintProperty(outlineLayerId, 'line-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);

    map.setPaintProperty(lineLayerId, 'line-color', buildTweenedColourExpression(configStops, config, 'stroke', posKey));
    map.setPaintProperty(lineLayerId, 'line-width', lineWidthExpr);
    map.setPaintProperty(lineLayerId, 'line-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);
  });
</script>
