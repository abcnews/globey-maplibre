<script lang="ts">
  import type { ImageSourceConfig } from '../../../lib/marker';
  import type { maplibregl } from '../../mapLibre/index';
  import { getContext, untrack } from 'svelte';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');
  const { config, beforeId }: { config: ImageSourceConfig; beforeId?: string } = $props();

  // Stabilize essential IDs and URLs.
  // These are derived from config, but will only trigger downstream if the literal value changes.
  const currentSid = $derived(`image-source-${config.id}`);
  const currentLid = $derived(`image-layer-${config.id}`);
  const currentUrl = $derived(config.url);

  // LIFECYCLE EFFECT: Only manages adding/removing the source/layer from the map.
  // It should NOT re-run when opacity or coordinates change.
  $effect(() => {
    const map = mapRoot.map;

    if (!map || !currentUrl) return;

    const setup = () => {
      // Style must be loaded and source must not already exist.
      if (!map.getStyle() || map.getSource(currentSid)) return;

      try {
        // Untrack variables that are managed by OTHER effects.
        // We only use them here for the INITIAL add.
        const initialCoords = untrack(() => config.coordinates) || [
          [0, 0],
          [0, 0],
          [0, 0],
          [0, 0]
        ];
        const initialOpacity = untrack(() => config.opacity) ?? 1;
        const targetBeforeId = untrack(() => beforeId);

        map.addSource(currentSid, {
          type: 'image',
          url: currentUrl,
          coordinates: initialCoords as any
        });

        map.addLayer(
          {
            id: currentLid,
            type: 'raster',
            source: currentSid,
            paint: { 'raster-opacity': initialOpacity }
          },
          targetBeforeId && map.getLayer(targetBeforeId) ? targetBeforeId : undefined
        );
      } catch (e) {
        // Failing to add source/layer is usually expected during style transitions
      }
    };

    setup();
    map.on('styledata', setup);
    map.on('load', setup);

    return () => {
      map.off('styledata', setup);
      map.off('load', setup);

      if (map.getLayer(currentLid)) map.removeLayer(currentLid);
      if (map.getSource(currentSid)) map.removeSource(currentSid);
    };
  });

  // OPACITY EFFECT: Updates opacity in-place.
  $effect(() => {
    const map = mapRoot.map;
    const currentOpacity = config.opacity;
    if (!map || !map.getLayer(currentLid)) return;

    map.setPaintProperty(currentLid, 'raster-opacity', currentOpacity);
  });

  // COORDINATES EFFECT: Updates coordinates in-place.
  $effect(() => {
    const map = mapRoot.map;
    const currentCoords = config.coordinates;
    if (!map || !map.getSource(currentSid)) return;

    const source = map.getSource(currentSid) as any;
    if (source && source.setCoordinates && currentCoords?.length === 4) {
      source.setCoordinates(currentCoords);
    }
  });

  // STACKING EFFECT: Moves layer when beforeId changes.
  $effect(() => {
    const map = mapRoot.map;
    const currentBeforeId = beforeId;
    if (!map || !map.getLayer(currentLid)) return;

    if (currentBeforeId && map.getLayer(currentBeforeId)) {
      map.moveLayer(currentLid, currentBeforeId);
    } else {
      map.moveLayer(currentLid, undefined);
    }
  });
</script>
