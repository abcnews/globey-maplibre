<script lang="ts">
  import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import type { Stacked } from '../../../lib/data/stack.ts';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import {
    decodeUploadedImage,
    rasteriseSymbol,
    symbolIconOffset,
    symbolImageId,
    UPLOADED_IMAGE_SCALE,
    uploadedImageId
  } from '../../../lib/symbolImage.ts';
  import { removeLayerWithZIndex, setLayerZIndex, getSymbolSourceId, getSymbolLayerId } from '../layers/layerUtils.ts';
  import { addFadingLayer } from '../layers/tweenedLayers.ts';
  import { layerClockKey } from '../Tween/utils.ts';

  // In-flight map image load promises across symbol handlers to avoid redundant downloads/decoding
  const inFlightMapImages = new Map<string, Promise<any>>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  interface Props {
    /** First panel's copy of the symbol layer */
    config: Stacked<SymbolLayer>;
    /** Opacity per panel; `0` where the symbol is absent */
    opacityStops: number[];
    /** Position for the panel currently being entered, picked by `SymbolHandler` */
    coords: [number, number];
  }

  let { config, opacityStops, coords }: Props = $props();

  const id = $derived(config.id);
  const zIndex = $derived(config.zIndex);

  // The fade reads this clock's uniform, so position and opacity stay in step.
  const posKey = $derived(layerClockKey(config.animationClock));

  const currentSid = $derived(getSymbolSourceId(id));
  const currentLid = $derived(getSymbolLayerId(id));

  // A built-in vector symbol wins over an uploaded image. Only these primitives are tracked by
  // the lifecycle effect, because `config` is a fresh object on every blob change.
  const usesSymbol = $derived(Boolean(config.symbol));
  const uploadedDataUri = $derived(usesSymbol ? undefined : config.image?.dataUri);
  /** Pixels per CSS px for vector symbols, so strokes stay sharp on high density screens. */
  const pixelRatio = window.devicePixelRatio || 1;
  const symbolImageKey = $derived(
    config.symbol
      ? symbolImageId(config.symbol, pixelRatio)
      : uploadedDataUri
        ? uploadedImageId(uploadedDataUri)
        : ''
  );

  /** A one-point FeatureCollection at `position`, the symbol source's whole data. */
  const pointCollection = (position: [number, number]): GeoJSON.FeatureCollection => ({
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: position } }]
  });

  // LIFECYCLE EFFECT: Manages adding/removing the symbol layer & source.
  // Only re-runs if the map, source/layer IDs, or resolved image changes.
  // Coordinates and z-index are untracked here and handled by dedicated effects.
  $effect(() => {
    const map = mapRoot.map;
    const sid = currentSid;
    const lid = currentLid;
    const imgId = symbolImageKey;
    const dataUri = uploadedDataUri;
    const isVector = usesSymbol;
    // Name, variant and size are all in `imgId`, so the offset only changes when the layer is rebuilt.
    const vectorOffset = untrack(() => (config.symbol ? symbolIconOffset(config.symbol) : [0, 0]));

    if (!map || !imgId) return;

    let isDisposed = false;

    const setup = async () => {
      if (!map.getStyle() || isDisposed) return;

      try {
        // Register image into map sprite atlas if not already present
        if (!map.hasImage(imgId)) {
          if (!inFlightMapImages.has(imgId)) {
            // A vector symbol is rasterised at pixelRatio × its size; an uploaded image is decoded as is.
            const symbolStyle = untrack(() => config.symbol);
            const promise = (
              symbolStyle ? rasteriseSymbol(symbolStyle, pixelRatio) : decodeUploadedImage(dataUri!)
            )
              .then(data => ({ data }))
              .finally(() => {
                inFlightMapImages.delete(imgId);
              });
            inFlightMapImages.set(imgId, promise);
          }

          const loadedImg = await inFlightMapImages.get(imgId);
          if (isDisposed) return;

          if (!map.hasImage(imgId) && loadedImg?.data) {
            map.addImage(imgId, loadedImg.data, isVector ? { pixelRatio } : undefined);
          }
        }

        // Add GeoJSON point source if not already present
        if (!map.getSource(sid)) {
          map.addSource(sid, { type: 'geojson', data: pointCollection(untrack(() => coords)) });
        }

        // Add Symbol layer if not already present
        if (!map.getLayer(lid)) {
          addFadingLayer(
            map,
            {
              id: lid,
              source: sid,
              type: 'symbol',
              layout: {
                'icon-image': imgId,
                // Vector symbols are already drawn at their final size; an uploaded image is @2x.
                'icon-size': isVector ? 1 : UPLOADED_IMAGE_SCALE,
                // A pin or arrow points at the coordinate with its tip, not its middle.
                'icon-offset': vectorOffset,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              },
              opacityKey: 'icon-opacity',
              opacityStops: untrack(() => opacityStops),
              posKey: untrack(() => posKey)
            },
            untrack(() => zIndex)
          );
        }
      } catch (err) {
        console.error(
          JSON.stringify({ message: `[SymbolIcon] Error setting up symbol marker`, id: sid, imgId, error: String(err) })
        );
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      isDisposed = true;
      map.off('styledata', setup);
      map.off('load', setup);

      removeLayerWithZIndex(map, lid);
      if (map.getSource(sid)) {
        map.removeSource(sid);
      }
    };
  });

  // COORDINATES EFFECT: snap to the panel currently being entered (no per-frame
  // work — `fromPanel` only changes at a panel boundary).
  $effect(() => {
    const map = mapRoot.map;
    const currentCoords = coords;
    const sid = currentSid;
    if (!map || !map.getSource(sid) || !currentCoords) return;

    (map.getSource(sid) as maplibregl.GeoJSONSource).setData(pointCollection(currentCoords));
  });

  // Z-INDEX EFFECT: Updates stacking position when zIndex changes
  $effect(() => {
    const map = mapRoot.map;
    const targetZ = zIndex;
    const lid = currentLid;
    if (!map || !map.getLayer(lid) || targetZ === undefined) return;

    setLayerZIndex(map, lid, targetZ);
  });
</script>
