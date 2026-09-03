<script lang="ts">
  import type { IconConfig } from '../../../lib/marker';
  import type * as maplibregl from 'maplibre-gl';
  import { getContext, untrack } from 'svelte';
  import { loadImage, type ImageState } from '../../../lib/loadImage.ts';
  import {
    removeLayerWithZIndex,
    setLayerZIndex,
    getIconSourceId,
    getIconLayerId,
    Z_INDEX_CUSTOM_LABELS
  } from '../layers/layerUtils.ts';
  import { addFadingLayer, pickStop } from '../layers/tweenedLayers.ts';
  import { getTween } from '../Tween/context.ts';

  // In-flight map image load promises across icon handlers to avoid redundant downloads/decoding
  const inFlightMapImages = new Map<string, Promise<any>>();

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const tween = getTween();

  let {
    config,
    id = config.id,
    zIndex = config.zIndex ?? Z_INDEX_CUSTOM_LABELS,
    /** One opacity per panel (1 present / 0 absent). `[1]` = always visible. */
    opacityStops = [1],
    /** One `[lng, lat]` per panel; null where the icon is absent. */
    coordStops = [config.coords ?? null]
  }: {
    config: IconConfig;
    id?: string;
    zIndex?: number;
    opacityStops?: number[];
    coordStops?: ([number, number] | null)[];
  } = $props();

  const iconCoords = (): [number, number] => pickStop(coordStops, tween.fromPanel, config.coords ?? [0, 0]);

  const currentCmid = $derived(config.cmid);
  const currentSid = $derived(getIconSourceId(id || config.cmid));
  const currentLid = $derived(getIconLayerId(id || config.cmid));
  const iconImageId = $derived(`symbol-cmid-${config.cmid}`);

  let imageState = $state<ImageState>({ status: 'loading' });

  // Subscribe to loadImage store for the CMID.
  // Only re-subscribes if the numeric CMID itself changes.
  $effect(() => {
    const cmid = currentCmid;
    if (!cmid) {
      imageState = { status: 'loading' };
      return;
    }

    const store = loadImage(cmid, { targetWidth: 256 });
    const unsub = store.subscribe(val => {
      imageState = val;
    });

    return () => {
      unsub();
    };
  });

  // LIFECYCLE EFFECT: Manages adding/removing the symbol layer & source.
  // Only re-runs if the map, source/layer IDs, or resolved image URL changes.
  // Coordinates and z-index are untracked here and handled by dedicated effects.
  $effect(() => {
    const map = mapRoot.map;
    const url = imageState.url;
    const status = imageState.status;
    const sid = currentSid;
    const lid = currentLid;
    const imgId = iconImageId;
    const cmid = currentCmid;

    if (!map || status !== 'loaded' || !url) return;

    let isDisposed = false;

    const setup = async () => {
      if (!map.getStyle() || isDisposed) return;

      try {
        // Register image into map sprite atlas if not already present
        if (!map.hasImage(imgId)) {
          if (!inFlightMapImages.has(imgId)) {
            const promise = map.loadImage(url).finally(() => {
              inFlightMapImages.delete(imgId);
            });
            inFlightMapImages.set(imgId, promise);
          }

          const loadedImg = await inFlightMapImages.get(imgId);
          if (isDisposed) return;

          if (!map.hasImage(imgId) && loadedImg?.data) {
            map.addImage(imgId, loadedImg.data);
          }
        }

        // Add GeoJSON point source if not already present
        if (!map.getSource(sid)) {
          const currentCoords = untrack(() => iconCoords());
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
                'icon-size': 0.5,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
              },
              opacityKey: 'icon-opacity',
              opacityStops: untrack(() => opacityStops)
            },
            untrack(() => zIndex)
          );
        }
      } catch (err) {
        console.error(`[IconHandler] Error setting up icon for CMID ${cmid}:`, err);
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
    const currentCoords = iconCoords();
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
    const targetZ = zIndex ?? config.zIndex;
    const lid = currentLid;
    if (!map || !map.getLayer(lid) || targetZ === undefined) return;

    setLayerZIndex(map, lid, targetZ);
  });
</script>
