<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { Map } from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../lib/marker';
  import { classPaintExpression, classFilterExpression, type GeoJsonFeatureState } from './utils.ts';
  import { layerClockKey } from '../Tween/utils.ts';
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layers/layerUtils.ts';

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

  // Which clock this layer's fades follow. Baked into the paint at add time, so
  // changing it rebuilds the layers — only ever a builder action.
  const posKey = $derived(layerClockKey(config.animationClock));

  // Add the source and a fill + outline layer per class, once. Every per-panel
  // change is the `gjPos` global-state uniform set by GeoJsonHandler, so nothing
  // here reacts to scroll — the layers are never rebuilt and there is no flash.
  // Cleanup runs only on unmount / when the class set itself changes (builder).
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const outlineZ = zIndex - SUB_LAYER_OUTLINE_OFFSET;
    const classes = classStates;
    const clockKey = posKey;
    if (!map || !classes) return;

    const addedLayerIds = untrack(() => {
      if (!map.getSource(sid)) {
        map.addSource(sid, { type: 'geojson', data: data || { type: 'FeatureCollection', features: [] } });
      }

      return classes.flatMap((perPanelStates, classIndex) => {
        const fillLayerId = `${sid}-fill-c${classIndex}`;
        const outlineLayerId = `${sid}-outline-c${classIndex}`;
        const filter = classFilterExpression(classIndex);

        if (!map.getLayer(fillLayerId)) {
          addLayerWithZIndex(
            map,
            {
              id: fillLayerId,
              type: 'fill',
              source: sid,
              filter,
              paint: {
                'fill-color': classPaintExpression(perPanelStates, 'fillColor', clockKey),
                'fill-opacity': classPaintExpression(perPanelStates, 'fillOpacity', clockKey)
              }
            },
            outlineZ
          );
        }

        if (!map.getLayer(outlineLayerId)) {
          addLayerWithZIndex(
            map,
            {
              id: outlineLayerId,
              type: 'line',
              source: sid,
              filter,
              paint: {
                'line-color': classPaintExpression(perPanelStates, 'strokeColor', clockKey),
                'line-width': classPaintExpression(perPanelStates, 'strokeWidth', clockKey),
                'line-opacity': classPaintExpression(perPanelStates, 'strokeOpacity', clockKey)
              }
            },
            zIndex
          );
        }

        return [fillLayerId, outlineLayerId];
      });
    });

    return () => {
      addedLayerIds.forEach(id => removeLayerWithZIndex(map, id));
      if (map.getSource(sid)) map.removeSource(sid);
    };
  });
</script>
