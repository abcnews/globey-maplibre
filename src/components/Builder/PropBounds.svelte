<script lang="ts">
  import { options } from './store';
  import type { maplibregl } from '../mapLibre/index';
  import { safeFitBounds } from './utils';

  let {
    map,
    onchange
  }: {
    map: maplibregl.Map;
    onchange?: (bounds: [number, number][]) => void;
  } = $props();

  let isPicking = $state(false);
  let points = $state<[number, number][]>([]);

  // Sync store -> local points
  $effect(() => {
    if ($options?.bounds) {
      points = $options.bounds;
    }
  });

  // Map visualization and interaction
  $effect(() => {
    if (!map || !isPicking) return;

    const sourceId = 'bounds-points';
    const layerId = 'bounds-points-layer';

    const updateSource = () => {
      const source = map.getSource(sourceId) as any;
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: points.map((p, i) => ({
            type: 'Feature',
            id: i,
            geometry: { type: 'Point', coordinates: p },
            properties: {}
          }))
        });
      }
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 8,
          'circle-color': '#ff0000',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    updateSource();

    const onClick = (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [layerId] });
      if (features.length > 0) {
        // Remove point
        const id = features[0].id as number;
        points = points.filter((_, i) => i !== id);
      } else {
        // Add point
        points = [...points, [e.lngLat.lng, e.lngLat.lat]];
      }
      updateSource();
    };

    map.on('click', onClick);
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.off('click', onClick);
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = '';
      }
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  function togglePicking() {
    if (isPicking) {
      // Finishing picking
      if (points.length > 0) {
        const lats = points.map(p => p[1]);
        const lngs = points.map(p => p[0]);
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)]
        ];

        safeFitBounds(map, bounds, { padding: 50 });

        $options = {
          ...$options,
          bounds: points
        };
        onchange?.(points);
      }
    }
    isPicking = !isPicking;
  }

  function clearPoints() {
    const center = map?.getCenter();
    const zoom = map?.getZoom();

    points = [];
    $options = {
      ...$options,
      coords: center ? [center.lng, center.lat] : $options.coords,
      z: zoom ?? $options.z,
      bounds: []
    };
    onchange?.([]);
  }
</script>

<fieldset>
  <legend>Bounds</legend>
  <small
    >Set the zoom of the map by picking the locations you want to be shown. This zooms to fit the contents regardless of
    screen size.</small
  >
  <div style:display="flex" style:gap="0.5rem" style:align-items="center">
    <button type="button" onclick={togglePicking}>
      {isPicking ? 'Finish Picking' : 'Pick Bounds'}
    </button>
    {#if points.length > 0}
      <small>{points.length} points</small>
      <button type="button" onclick={clearPoints} style:font-size="0.8rem">Clear</button>
    {/if}
  </div>
  {#if isPicking}
    <small style:display="block" style:margin-top="0.5rem">
      Click on map to add points. Click a point to remove it.
    </small>
  {/if}
</fieldset>
