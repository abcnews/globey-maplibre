<script lang="ts">
  import type { SymbolLayer } from '../../../lib/data/jsonBlob.ts';
  import type { LayerRendererProps } from '../types.ts';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { decodeUploadedImage, rasteriseSymbol, symbolImageId, uploadedImageId, uploadedImageScale } from '../../../lib/symbolImage.ts';
  import {
    removeLayerWithZIndex,
    setLayerZIndex,
    getSymbolSourceId,
    getSymbolLayerId,
    Z_INDEX_CUSTOM_LABELS
  } from '../layers/layerUtils.ts';
  import { addFadingLayer, pickStop } from '../layers/tweenedLayers.ts';
  import { getTween } from '../Tween/context.ts';
  import { layerClockKey } from '../Tween/utils.ts';

  // In-flight map image load promises across symbol handlers to avoid redundant downloads/decoding
  const inFlightMapImages = new Map<string, Promise<any>>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const tween = getTween();

  let { config, opacityStops, coordStops: rawCoordStops }: LayerRendererProps<SymbolLayer> = $props();

  const id = $derived(config.id);
  const zIndex = $derived(config.zIndex);
  /** One `[lng, lat]` per panel (via `symbolFeature.coordsOf`); null where the symbol is absent. */
  const coordStops = $derived(rawCoordStops as ([number, number] | null)[]);

  // The fade reads this clock's uniform; the coordinate snap reads the same
  // clock's panel index, so position and opacity stay in step.
  const clock = $derived(config.animationClock ?? 'scroll');
  const posKey = $derived(layerClockKey(config.animationClock));

  const symbolCoords = (): [number, number] =>
    pickStop(coordStops, tween.clock(clock).fromPanel, config.coords ?? [0, 0]);

  const currentSid = $derived(getSymbolSourceId(id));
  const currentLid = $derived(getSymbolLayerId(id));

  // A built-in vector symbol wins over an uploaded image. Only these primitives are tracked by
  // the lifecycle effect, because `config` is a fresh object on every blob change.
  const usesSymbol = $derived(Boolean(config.symbol));
  const uploadedDataUri = $derived(usesSymbol ? undefined : config.image?.dataUri);
  const uploadedScale = $derived(uploadedImageScale(config.image));
  /** Pixels per CSS px for vector symbols, so strokes stay sharp on high density screens. */
  const pixelRatio = window.devicePixelRatio || 1;
  const symbolImageKey = $derived(
    config.symbol
      ? symbolImageId(config.symbol, pixelRatio)
      : uploadedDataUri
        ? uploadedImageId(uploadedDataUri)
        : ''
  );

  // LIFECYCLE EFFECT: Manages adding/removing the symbol layer & source.
  // Only re-runs if the map, source/layer IDs, or resolved image changes.
  // Coordinates and z-index are untracked here and handled by dedicated effects.
  $effect(() => {
    const map = mapRoot.map;
    const sid = currentSid;
    const lid = currentLid;
    const imgId = symbolImageKey;
    const imageScale = uploadedScale;
    const dataUri = uploadedDataUri;
    const isVector = usesSymbol;

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
              symbolStyle
                ? rasteriseSymbol(symbolStyle, pixelRatio)
                : decodeUploadedImage(dataUri!)
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
          const currentCoords = untrack(() => symbolCoords());
          map.addSource(sid, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: currentCoords as [number, number]
                  }
                }
              ]
            }
          });
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
                // Vector symbols are already drawn at their final size; an uploaded image is
                // scaled so its longest edge is `UPLOADED_IMAGE_SIZE`.
                'icon-size': isVector ? 1 : imageScale,
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
          JSON.stringify({ message: `[SymbolHandler] Error setting up symbol marker`, id: sid, imgId, error: String(err) })
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
    const currentCoords = symbolCoords();
    const sid = currentSid;
    if (!map || !map.getSource(sid) || !currentCoords) return;

    const source = map.getSource(sid) as any;
    if (source && source.setData) {
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: currentCoords
            }
          }
        ]
      });
    }
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
