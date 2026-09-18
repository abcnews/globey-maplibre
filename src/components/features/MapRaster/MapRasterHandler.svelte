<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import {
    removeLayerWithZIndex,
    setLayerZIndex,
    getHighestZIndexBelow,
    Z_INDEX_BASE_RASTER,
    Z_INDEX_IMAGE_LAYERS,
    Z_INDEX_STACK_STEP
  } from '../layers/layerUtils.ts';
  import { addFadingLayer } from '../layers/tweenedLayers.ts';
  import { layerClockKey } from '../Tween/utils.ts';
  import type { AnimationMode } from '../Tween/types.ts';
  import { getBoundingBox } from '../PanZoom/utils.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  /**
   * Falls back to stacking directly above whatever base raster/vector layer is
   * currently topmost, rather than a fixed tier constant, so a new raster layer
   * never lands underneath an already-present base layer.
   */
  function defaultZIndex(map: maplibregl.Map): number {
    const highestBase = getHighestZIndexBelow(map, Z_INDEX_IMAGE_LAYERS);
    return highestBase !== undefined ? highestBase + Z_INDEX_STACK_STEP : Z_INDEX_BASE_RASTER;
  }

  let {
    url,
    attribution,
    id = 'raster-base',
    maxZoom = 7,
    tileSize = 256,
    zIndex,
    /** One opacity per panel (1 present / 0 absent). `[1]` = always visible. */
    opacityStops = [1],
    animationClock,
    /** Optional TL/TR/BR/BL bounding box restricting tile loading; unset means whole world. */
    bounds
  }: {
    url: string;
    attribution?: string;
    id?: string;
    maxZoom?: number;
    tileSize?: number;
    zIndex?: number;
    opacityStops?: number[];
    /** Clock this layer's fade follows; unset means the scroll-tied clock. */
    animationClock?: AnimationMode;
    bounds?: number[][] | null;
  } = $props();

  const posKey = $derived(layerClockKey(animationClock));

  // Effect for source and layer lifecycle
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !url) {
      return;
    }

    const sourceId = `${id}-source`;
    const s_url = url;
    const s_attribution = attribution;
    const s_maxZoom = maxZoom;
    const s_tileSize = tileSize;
    const s_opacityStops = opacityStops;
    const s_bounds = bounds;

    const setup = () => {
      if (!map.getStyle() || map.getSource(sourceId)) return;

      try {
        // MapLibre raster bounds are strictly axis-aligned, unlike the TL/TR/BR/BL
        // corners stored on the layer — so any implied rotation is discarded by
        // taking the bounding min/max of the 4 corners.
        let axisAlignedBounds: [number, number, number, number] | undefined;
        if (s_bounds?.length) {
          const { minLng, minLat, maxLng, maxLat } = getBoundingBox(s_bounds as [number, number][]);
          axisAlignedBounds = [minLng, minLat, maxLng, maxLat];
        }

        map.addSource(sourceId, {
          type: 'raster',
          tiles: [s_url],
          tileSize: s_tileSize,
          attribution: s_attribution,
          maxzoom: s_maxZoom,
          ...(axisAlignedBounds ? { bounds: axisAlignedBounds } : {})
        });

        addFadingLayer(
          map,
          {
            id,
            source: sourceId,
            type: 'raster',
            paint: { 'raster-fade-duration': 0 },
            opacityKey: 'raster-opacity',
            opacityStops: s_opacityStops,
            posKey: untrack(() => posKey)
          },
          untrack(() => zIndex ?? defaultZIndex(map))
        );
      } catch (e) {
        // Handled during style loads
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      map.off('styledata', setup);
      map.off('load', setup);
      removeLayerWithZIndex(map, id);
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  });

  // Effect for dynamic z-index updates
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex;
    if (!map || !map.getLayer(id) || targetZ === undefined) return;

    setLayerZIndex(map, id, targetZ);
  });
</script>
