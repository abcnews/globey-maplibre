<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColorExpression, getOpacityExpression } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config } = $props<{ data: any; config: GeoJsonConfig }>();

  const sourceId = `geojson-area-source-${Math.random().toString(36).substring(2, 9)}`;
  const layerId = `geojson-area-layer-${sourceId}`;

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Initialize Source & Layer
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: data
      });

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': getColorExpression(config, 'fill'),
          'fill-opacity': getOpacityExpression(config),
          'fill-color-transition': { duration: 300 },
          'fill-opacity-transition': { duration: 300 }
        }
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  });

  // Update Data
  $effect(() => {
    const map = mapRoot.map;
    if (map && map.getSource(sourceId) && data) {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
    }
  });

  // Update Styles
  $effect(() => {
    const map = mapRoot.map;
    if (map && map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'fill-color', getColorExpression(config, 'fill'));
      map.setPaintProperty(layerId, 'fill-opacity', getOpacityExpression(config));
    }
  });
</script>
