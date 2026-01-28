<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import {
    getColorExpression,
    getFillOpacityExpression,
    getStrokeOpacityExpression,
    getStrokeWidthExpression
  } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config } = $props<{ data: any; config: GeoJsonConfig }>();

  const sourceId = `geojson-area-source-${Math.random().toString(36).substring(2, 9)}`;
  const layerId = `geojson-area-layer-${sourceId}`;
  const outlineLayerId = `${layerId}-outline`;

  $effect(() => {
    if (!mapRoot.map) return;
    const map = mapRoot.map;

    // Initialize Source & Layer
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: data
      });

      // Main Fill Layer
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': getColorExpression(config, 'fill'),
          'fill-opacity': getFillOpacityExpression(config),
          'fill-color-transition': { duration: 300 },
          'fill-opacity-transition': { duration: 300 }
        }
      });

      // Outline Layer (for stroke-width support)
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': getColorExpression(config, 'stroke'),
          'line-width': getStrokeWidthExpression(config),
          'line-opacity': getStrokeOpacityExpression(config),
          'line-width-transition': { duration: 300 },
          'line-color-transition': { duration: 300 },
          'line-opacity-transition': { duration: 300 }
        }
      });
    }

    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
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
      map.setPaintProperty(layerId, 'fill-opacity', getFillOpacityExpression(config));
    }
    if (map && map.getLayer(outlineLayerId)) {
      map.setPaintProperty(outlineLayerId, 'line-color', getColorExpression(config, 'stroke'));
      map.setPaintProperty(outlineLayerId, 'line-width', getStrokeWidthExpression(config));
      map.setPaintProperty(outlineLayerId, 'line-opacity', getStrokeOpacityExpression(config));
    }
  });
</script>
