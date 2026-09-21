<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { removeLayerWithZIndex, setLayerZIndex } from '../layers/layerUtils.ts';
  import { addFadingLayer } from '../layers/tweenedLayers.ts';
  import { layerClockKey } from '../Tween/utils.ts';
  import type { RasterLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import { getBoundingBox } from '../PanZoom/utils.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { config, opacityStops }: LayerRendererProps<RasterLayer> = $props();

  const id = $derived(`raster-${config.id}`);
  const url = $derived(config.url);
  const maxZoom = $derived(config.maxZoom ?? 7);
  const tileSize = $derived(config.tileSize ?? 256);
  /** Derived from the layer's position in `blob.layers` (see `stackLayers`). */
  const zIndex = $derived(config.zIndex);
  /** Clock this layer's fade follows; unset means the scroll-tied clock. */
  const animationClock = $derived(config.animationClock);
  /** Optional TL/TR/BR/BL bounding box restricting tile loading; unset means whole world. */
  const bounds = $derived(config.bounds);

  const posKey = $derived(layerClockKey(animationClock));

  // Effect for source and layer lifecycle
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !url) {
      return;
    }

    const sourceId = `${id}-source`;
    const s_url = url;
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
          untrack(() => zIndex)
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
