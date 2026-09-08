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
  import {
    addLayerWithZIndex,
    removeLayerWithZIndex,
    Z_INDEX_GEOJSON,
    SUB_LAYER_OUTLINE_OFFSET
  } from '../layers/layerUtils.ts';
  import { tdbg, refId } from '../../../lib/tweenDebug.ts';

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

  const LINE_LAYOUT = { 'line-cap': 'round', 'line-join': 'round' } as const;

  // Fixed real-world width keeps its zoom expression; the fade is opacity-only.
  const kmWidth = $derived(
    config.lineWidth?.unit === 'k' ? getKilometreZoomScaleExpression(config.lineWidth.value) : null
  );

  // One main + outline line layer per class, added once. See RenderArea for why
  // nothing here reacts to scroll.
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const outlineZ = zIndex - SUB_LAYER_OUTLINE_OFFSET;
    const classes = classStates;
    const lineWidthExpr = kmWidth;
    if (!map || !classes) return;

    // DEBUG: re-running tears down + rebuilds every line layer + the source.
    // Tracked deps: map, sourceId, zIndex, classStates, kmWidth.
    tdbg(`RenderLine lifecycle RUN ${sid}`, {
      classStates: refId(classes),
      zIndex,
      kmWidth: refId(lineWidthExpr),
      map: refId(map)
    });

    const addedLayerIds = untrack(() => {
      if (!map.getSource(sid)) {
        map.addSource(sid, { type: 'geojson', data: data || { type: 'FeatureCollection', features: [] } });
      }

      return classes.flatMap((perPanelStates, classIndex) => {
        const outlineLayerId = `${sid}-line-outline-c${classIndex}`;
        const lineLayerId = `${sid}-line-c${classIndex}`;
        const filter = classFilterExpression(classIndex);

        if (!map.getLayer(outlineLayerId)) {
          addLayerWithZIndex(
            map,
            {
              id: outlineLayerId,
              type: 'line',
              source: sid,
              filter,
              layout: LINE_LAYOUT,
              paint: {
                'line-color': classPaintExpression(perPanelStates, 'outlineColor'),
                'line-width': classPaintExpression(perPanelStates, 'outlineWidth'),
                'line-opacity': classPaintExpression(perPanelStates, 'strokeOpacity')
              }
            },
            outlineZ
          );
        }

        if (!map.getLayer(lineLayerId)) {
          addLayerWithZIndex(
            map,
            {
              id: lineLayerId,
              type: 'line',
              source: sid,
              filter,
              layout: LINE_LAYOUT,
              paint: {
                'line-color': classPaintExpression(perPanelStates, 'strokeColor'),
                'line-width': lineWidthExpr ?? classPaintExpression(perPanelStates, 'strokeWidth'),
                'line-opacity': classPaintExpression(perPanelStates, 'strokeOpacity')
              }
            },
            zIndex
          );
        }

        return [outlineLayerId, lineLayerId];
      });
    });

    return () => {
      tdbg(`RenderLine lifecycle CLEANUP ${sid}`);
      addedLayerIds.forEach(id => removeLayerWithZIndex(map, id));
      if (map.getSource(sid)) map.removeSource(sid);
    };
  });
</script>
