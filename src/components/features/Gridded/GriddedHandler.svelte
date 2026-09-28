<script lang="ts">
  import type { GriddedLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { removeLayerWithZIndex, setLayerZIndex } from '../layers/layerUtils.ts';
  import { addFadingLayer } from '../layers/tweenedLayers.ts';
  import { layerClockKey, tweenStopsExpression } from '../Tween/utils.ts';
  import { loadGrid } from './data/loadGrid.ts';
  import type { DecodedGrid } from './data/types.ts';
  import { renderGridImageData, type ImageCorners } from './render/gridToImage.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  /**
   * `addSource` needs a URL, but the real pixels are handed over directly with `updateImage({ image })`
   * — no PNG encode/decode. This 1×1 transparent GIF only satisfies the source's initial load.
   */
  const PLACEHOLDER_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  let { config, opacityStops }: LayerRendererProps<GriddedLayer> = $props();

  const sourceId = $derived(`gridded-source-${config.id}`);
  const layerId = $derived(`gridded-layer-${config.id}`);
  const posKey = $derived(layerClockKey(config.animationClock));

  // `config` is a fresh object on every blob change, so effects key off these strings
  // instead — they only change when the file/slice or the styling actually changes.
  const gridKey = $derived(JSON.stringify({ url: config.url, band: config.band }));
  const styleKey = $derived(
    JSON.stringify({
      colourConfig: config.colourConfig,
      noData: config.noData,
      hideBelowMin: config.hideBelowMin,
      hideAboveMax: config.hideAboveMax,
      classes: config.classes
    })
  );

  let grid = $state.raw<DecodedGrid>();
  let image = $state.raw<{ image: ImageData; coordinates: ImageCorners }>();
  const hasImage = $derived(Boolean(image));

  // ---- Data: download (cached) and decode the chosen band ----
  $effect(() => {
    const layer: Pick<GriddedLayer, 'url' | 'band'> = JSON.parse(gridKey);
    if (!layer.url) return;

    let isCurrent = true;
    loadGrid(layer)
      .then(decoded => {
        if (isCurrent) grid = decoded;
      })
      .catch(err => console.error(`[GriddedHandler] Failed to load ${layer.url}:`, err));

    return () => {
      isCurrent = false;
    };
  });

  // ---- Image: colour the grid whenever the grid or styling changes ----
  $effect(() => {
    const currentGrid = grid;
    const style = JSON.parse(styleKey);
    if (!currentGrid) return;
    image = renderGridImageData(currentGrid, style);
  });

  // ---- Lifecycle: add the source/layer once the first image exists ----
  // Everything read here except the map, ids and `hasImage` is untracked, so later image,
  // opacity and stacking changes update in place below instead of re-adding (a flash).
  $effect(() => {
    const map = mapRoot.map;
    const currentSourceId = sourceId;
    const currentLayerId = layerId;
    if (!map || !hasImage) return;

    const setup = () => {
      if (!map.getStyle() || map.getSource(currentSourceId)) return;
      const initial = untrack(() => image)!;
      const opacity = untrack(() => config.opacity);

      try {
        map.addSource(currentSourceId, { type: 'image', url: PLACEHOLDER_URL, coordinates: initial.coordinates });
        // Swaps our pixels in immediately; this also aborts the placeholder's pending load.
        (map.getSource(currentSourceId) as maplibregl.ImageSource).updateImage(initial);
        addFadingLayer(
          map,
          {
            id: currentLayerId,
            source: currentSourceId,
            type: 'raster',
            paint: {
              'raster-resampling': untrack(() => config.resampling),
              'raster-fade-duration': 0
            },
            opacityKey: 'raster-opacity',
            opacityStops: untrack(() => opacityStops.map(stop => stop * opacity)),
            posKey: untrack(() => posKey)
          },
          untrack(() => config.zIndex)
        );
      } catch (e) {
        // Failing to add source/layer is expected during style transitions
      }
    };

    // If the placeholder ever finishes loading after our pixels (it shouldn't — `updateImage`
    // aborts it), it would replace them; put ours back.
    const restoreImage = (event: maplibregl.MapSourceDataEvent) => {
      const current = untrack(() => image);
      const source = map.getSource(currentSourceId) as maplibregl.ImageSource | undefined;
      if (event.sourceId === currentSourceId && current && source && source.image !== current.image) {
        source.updateImage(current);
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('sourcedata', restoreImage);

    return () => {
      map.off('styledata', setup);
      map.off('sourcedata', restoreImage);
      removeLayerWithZIndex(map, currentLayerId);
      if (map.getSource(currentSourceId)) map.removeSource(currentSourceId);
    };
  });

  // ---- In-place updates ----

  $effect(() => {
    const map = mapRoot.map;
    const current = image;
    const source = map?.getSource(sourceId) as maplibregl.ImageSource | undefined;
    // Skip the pixels the lifecycle effect has just added the source with.
    if (!current || !source || source.image === current.image) return;
    source.updateImage(current);
  });

  $effect(() => {
    const map = mapRoot.map;
    const opacity = config.opacity;
    const stops = opacityStops;
    const resampling = config.resampling;
    if (!hasImage || !map?.getLayer(layerId)) return;
    map.setPaintProperty(layerId, 'raster-opacity', tweenStopsExpression(stops.map(stop => stop * opacity), posKey));
    map.setPaintProperty(layerId, 'raster-resampling', resampling);
  });

  $effect(() => {
    const map = mapRoot.map;
    const zIndex = config.zIndex;
    if (!hasImage || !map?.getLayer(layerId) || zIndex === undefined) return;
    setLayerZIndex(map, layerId, zIndex);
  });
</script>
