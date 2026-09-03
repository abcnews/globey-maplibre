<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { removeLayerWithZIndex, setLayerZIndex, Z_INDEX_IMAGE_LAYERS } from '../layers/layerUtils.ts';
  import { addFadingLayer, pickStop } from '../layers/tweenedLayers.ts';
  import { getTween } from '../Tween/context.ts';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const tween = getTween();

  let {
    config,
    zIndex = config.zIndex ?? Z_INDEX_IMAGE_LAYERS,
    /** One opacity per panel (config.opacity where present, 0 where absent). */
    opacityStops = [config.opacity ?? 1],
    /** One coordinate set per panel; null where the image is absent. */
    coordStops = [config.coordinates ?? null]
  }: {
    config: ImageSourceConfig;
    zIndex?: number;
    opacityStops?: number[];
    coordStops?: (number[][] | null)[];
  } = $props();

  const DEFAULT_COORDS: number[][] = [
    [0, 0],
    [0, 0],
    [0, 0],
    [0, 0]
  ];

  // Stabilise essential IDs and URLs.
  const currentSid = $derived(`image-source-${config.id || config.url}`);
  const currentLid = $derived(`image-layer-${config.id || config.url}`);
  const currentUrl = $derived(config.url);

  const currentCoords = (): number[][] =>
    pickStop(coordStops, tween.fromPanel, config.coordinates ?? DEFAULT_COORDS);

  // LIFECYCLE EFFECT: adds / removes the source and layer once. Opacity is baked
  // into the paint as a `tweenPos` interpolation, so nothing re-applies it.
  $effect(() => {
    const map = mapRoot.map;

    if (!map || !currentUrl) return;

    const setup = () => {
      if (!map.getStyle() || map.getSource(currentSid)) return;

      try {
        map.addSource(currentSid, {
          type: 'image',
          url: currentUrl,
          coordinates: untrack(() => currentCoords()) as any
        });

        addFadingLayer(
          map,
          {
            id: currentLid,
            source: currentSid,
            type: 'raster',
            opacityKey: 'raster-opacity',
            opacityStops: untrack(() => opacityStops)
          },
          untrack(() => zIndex)
        );
      } catch (e) {
        // Failing to add source/layer is expected during style transitions
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      map.off('styledata', setup);
      map.off('load', setup);

      removeLayerWithZIndex(map, currentLid);
      if (map.getSource(currentSid)) map.removeSource(currentSid);
    };
  });

  // COORDINATES EFFECT: snap to the panel currently being entered (no per-frame
  // work). `fromPanel` only changes when a panel boundary is crossed.
  $effect(() => {
    const map = mapRoot.map;
    const coords = currentCoords();
    if (!map || !map.getSource(currentSid) || coords.length !== 4) return;

    const source = map.getSource(currentSid) as any;
    if (source && source.setCoordinates) {
      source.setCoordinates(coords);
    }
  });

  // Z-INDEX STACKING EFFECT: updates layer stacking position when zIndex changes.
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex ?? config.zIndex;
    if (!map || !map.getLayer(currentLid) || targetZ === undefined) return;

    setLayerZIndex(map, currentLid, targetZ);
  });
</script>
