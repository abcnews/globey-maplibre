<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import {
    buildTweenedColourExpression,
    buildOpacityExpression,
    buildStrokeWidthExpression,
    buildFilterExpression
  } from './utils.ts';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_GEOJSON, SUB_LAYER_OUTLINE_OFFSET } from '../layers/layerUtils.ts';
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

  const fillLayerId = $derived(`${sourceId}-fill`);
  const outlineLayerId = $derived(`${sourceId}-outline`);

  // Add the source and the fill + outline layer once, on mount. Paint/filter are
  // then kept in sync with `config` by the effect below, in place, so builder
  // edits update live without tearing down and re-adding the layers (no flash).
  $effect(() => {
    const map = mapRoot.map;
    const outlineZ = zIndex - SUB_LAYER_OUTLINE_OFFSET;
    if (!map) return;

    untrack(() => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, { type: 'geojson', data: data || { type: 'FeatureCollection', features: [] } });
      }
      if (!map.getLayer(fillLayerId)) {
        addLayerWithZIndex(map, { id: fillLayerId, type: 'fill', source: sourceId, paint: {} }, outlineZ);
      }
      if (!map.getLayer(outlineLayerId)) {
        addLayerWithZIndex(map, { id: outlineLayerId, type: 'line', source: sourceId, paint: {} }, zIndex);
      }
    });

    return () => {
      removeLayerWithZIndex(map, fillLayerId);
      removeLayerWithZIndex(map, outlineLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer(fillLayerId)) return;

    const filter = buildFilterExpression(config.filter) ?? null;
    map.setFilter(fillLayerId, filter);
    map.setFilter(outlineLayerId, filter);

    map.setPaintProperty(fillLayerId, 'fill-color', buildTweenedColourExpression(configStops, config, 'fill', posKey));
    map.setPaintProperty(fillLayerId, 'fill-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'fill')]);

    map.setPaintProperty(
      outlineLayerId,
      'line-color',
      buildTweenedColourExpression(configStops, config, 'stroke', posKey)
    );
    map.setPaintProperty(outlineLayerId, 'line-width', buildStrokeWidthExpression(config));
    map.setPaintProperty(outlineLayerId, 'line-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);
  });
</script>
