<script lang="ts">
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { removeLayerWithZIndex, setLayerZIndex, Z_INDEX_BASE_RASTER } from '../layers/layerUtils.ts';
  import { addFadingLayer } from '../layers/tweenedLayers.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let {
    url,
    attribution,
    id = 'raster-base',
    maxZoom = 7,
    tileSize = 256,
    zIndex = Z_INDEX_BASE_RASTER,
    /** One opacity per panel (1 present / 0 absent). `[1]` = always visible. */
    opacityStops = [1]
  }: {
    url: string;
    attribution?: string;
    id?: string;
    maxZoom?: number;
    tileSize?: number;
    zIndex?: number;
    opacityStops?: number[];
  } = $props();

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

    const setup = () => {
      if (!map.getStyle() || map.getSource(sourceId)) return;

      try {
        map.addSource(sourceId, {
          type: 'raster',
          tiles: [s_url],
          tileSize: s_tileSize,
          attribution: s_attribution,
          maxzoom: s_maxZoom
        });

        addFadingLayer(
          map,
          {
            id,
            source: sourceId,
            type: 'raster',
            paint: { 'raster-fade-duration': 0 },
            opacityKey: 'raster-opacity',
            opacityStops: s_opacityStops
          },
          untrack(() => zIndex ?? Z_INDEX_BASE_RASTER)
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
