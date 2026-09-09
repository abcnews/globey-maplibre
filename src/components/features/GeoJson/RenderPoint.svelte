<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import {
    classPaintExpression,
    classFilterExpression,
    getKilometreZoomScaleExpression,
    type GeoJsonFeatureState
  } from './utils.ts';
  import { layerClockKey } from '../Tween/utils.ts';
  import { addLayerWithZIndex, removeLayerWithZIndex, Z_INDEX_GEOJSON } from '../layers/layerUtils.ts';

  const mapRoot = getContext<{ map: Map }>('mapInstance');

  let {
    data,
    classStates,
    config,
    sourceId,
    zIndex = config.zIndex ?? Z_INDEX_GEOJSON
  }: {
    data: any;
    /** `classStates[classIndex][panelIndex]` — one class's resolved state per panel. */
    classStates: GeoJsonFeatureState[][];
    config: GeoJsonConfig;
    sourceId: string;
    zIndex?: number;
  } = $props();

  // Fixed real-world radius keeps its zoom expression; the fade is opacity-only.
  const kmRadius = $derived(
    config.pointSize?.unit === 'k' ? getKilometreZoomScaleExpression(config.pointSize.value) : null
  );

  // Which clock this layer's fades follow. Baked into the paint at add time, so
  // changing it rebuilds the layers — only ever a builder action.
  const posKey = $derived(layerClockKey(config.animationClock));

  // One circle layer per class, added once. See RenderArea for why nothing here
  // reacts to scroll.
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const targetZ = zIndex;
    const classes = classStates;
    const clockKey = posKey;
    const radiusExpr = kmRadius;
    if (!map || !classes) return;

    const addedLayerIds = untrack(() => {
      if (!map.getSource(sid)) {
        map.addSource(sid, { type: 'geojson', data: data || { type: 'FeatureCollection', features: [] } });
      }

      return classes.flatMap((perPanelStates, classIndex) => {
        const circleLayerId = `${sid}-circle-c${classIndex}`;

        if (!map.getLayer(circleLayerId)) {
          addLayerWithZIndex(
            map,
            {
              id: circleLayerId,
              type: 'circle',
              source: sid,
              filter: classFilterExpression(classIndex),
              paint: {
                'circle-pitch-scale': 'map',
                'circle-color': classPaintExpression(perPanelStates, 'color', clockKey),
                'circle-radius': radiusExpr ?? classPaintExpression(perPanelStates, 'radius', clockKey),
                'circle-opacity': classPaintExpression(perPanelStates, 'opacity', clockKey),
                'circle-stroke-color': classPaintExpression(perPanelStates, 'strokeColor', clockKey),
                'circle-stroke-width': classPaintExpression(perPanelStates, 'strokeWidth', clockKey),
                'circle-stroke-opacity': classPaintExpression(perPanelStates, 'strokeOpacity', clockKey)
              }
            },
            targetZ
          );
        }

        return [circleLayerId];
      });
    });

    return () => {
      addedLayerIds.forEach(id => removeLayerWithZIndex(map, id));
      if (map.getSource(sid)) map.removeSource(sid);
    };
  });
</script>
