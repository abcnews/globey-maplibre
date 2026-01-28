<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColorExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config } = $props<{ data: any; config: GeoJsonConfig }>();

  const sourceId = `geojson-line-source-${Math.random().toString(36).substring(2, 9)}`;
  const layerId = `geojson-line-layer-${sourceId}`;

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
        type: 'line',
        source: sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        paint: {
          'line-color': getColorExpression(config, 'stroke'),
          'line-opacity': getStrokeOpacityExpression(config),
          'line-width': getStrokeWidthExpression(config),
          'line-color-transition': { duration: 300 },
          'line-opacity-transition': { duration: 300 },
          'line-width-transition': { duration: 300 }
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
      map.setPaintProperty(layerId, 'line-color', getColorExpression(config, 'stroke'));
      map.setPaintProperty(layerId, 'line-opacity', getStrokeOpacityExpression(config));
      map.setPaintProperty(layerId, 'line-width', getStrokeWidthExpression(config));
    }
  });
</script>
