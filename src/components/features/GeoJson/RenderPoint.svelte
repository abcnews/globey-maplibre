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

  // One circle layer per class, added once. See RenderArea for why nothing here
  // reacts to scroll.
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const targetZ = zIndex;
    const classes = classStates;
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
                'circle-color': classPaintExpression(perPanelStates, 'color'),
                'circle-radius': radiusExpr ?? classPaintExpression(perPanelStates, 'radius'),
                'circle-opacity': classPaintExpression(perPanelStates, 'opacity'),
                'circle-stroke-color': classPaintExpression(perPanelStates, 'strokeColor'),
                'circle-stroke-width': classPaintExpression(perPanelStates, 'strokeWidth'),
                'circle-stroke-opacity': classPaintExpression(perPanelStates, 'strokeOpacity')
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
