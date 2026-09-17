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
  import { tweenStopsExpression, tweenStopsValue, MAPLIBRE_TWEEN_SCROLL_STATE_KEY } from '../Tween/utils.ts';
  import { getTween } from '../Tween/context.ts';
  import { prefersReducedMotion, disableMapAnimation } from '../../../lib/stores';
  import { resolveSchemeColour } from '../../../lib/colourScheme.ts';

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

  // "Draw on" needs the reveal fraction as a literal number, not a `global-state` paint
  // expression — MapLibre's `step` (used for `line-gradient`'s reveal threshold) only accepts
  // literal numeric stops, so it's recomputed here from the same tween the fade path reads via
  // `posKey`, and written to the paint property every frame the tween is animating.
  const tween = getTween();
  const reducedMotion = $derived($prefersReducedMotion || $disableMapAnimation);
  const revealFraction = $derived(
    tweenStopsValue(opacityStops, tween.positionFor(config.animationClock ?? 'scroll', reducedMotion))
  );

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
          // Always requested: `line-gradient` (used for the "draw on" reveal style) needs it,
          // and it can't be toggled on an existing source, so a layer must be able to switch
          // styles live without the source being torn down and recreated.
          lineMetrics: true,
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

    const lineColourExpr = buildTweenedColourExpression(configStops, config, 'stroke', posKey);
    const isDrawOn = config.lineAnimationStyle === 'draw';

    map.setPaintProperty(outlineLayerId, 'line-color', '#ffffff');
    map.setPaintProperty(outlineLayerId, 'line-width', widthPlus(lineWidthExpr, 2));
    map.setPaintProperty(lineLayerId, 'line-color', lineColourExpr);
    map.setPaintProperty(lineLayerId, 'line-width', lineWidthExpr);

    if (isDrawOn) {
      // Reveal the line by "drawing" it along its length rather than fading it: `revealFraction`
      // (0 absent / 1 present, cross-faded by the same clock a fade-style layer uses for
      // opacity, but resolved to a literal number since `step` thresholds can't be a computed
      // expression) is the line-progress point before which the line is drawn.
      //
      // `line-gradient` also rejects data-driven expressions outright (unlike every other paint
      // property here), so its colour output can't be `lineColourExpr` when colourMode pulls
      // colour from feature properties (`simple`/`scale`) — it falls back to the layer's basic
      // scheme colour, same as `buildTweenedColourExpression` already falls back to a literal
      // when cross-fading a non-basic mode.
      const drawColour = resolveSchemeColour(config.colourConfig?.basicType, config.colourConfig?.basic);
      map.setPaintProperty(outlineLayerId, 'line-opacity', buildOpacityExpression(config, 'stroke'));
      map.setPaintProperty(outlineLayerId, 'line-gradient', ['step', ['line-progress'], '#ffffff', revealFraction, 'transparent']);
      map.setPaintProperty(lineLayerId, 'line-opacity', buildOpacityExpression(config, 'stroke'));
      map.setPaintProperty(lineLayerId, 'line-gradient', ['step', ['line-progress'], drawColour, revealFraction, 'transparent']);
    } else {
      map.setPaintProperty(outlineLayerId, 'line-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);
      map.setPaintProperty(outlineLayerId, 'line-gradient', undefined);
      map.setPaintProperty(lineLayerId, 'line-opacity', ['*', tweenFactor, buildOpacityExpression(config, 'stroke')]);
      map.setPaintProperty(lineLayerId, 'line-gradient', undefined);
    }
  });
</script>
