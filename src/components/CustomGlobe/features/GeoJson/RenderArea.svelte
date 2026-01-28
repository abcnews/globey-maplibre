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

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = `${sourceId}-fill`;
  const outlineLayerId = `${sourceId}-outline`;

  $effect(() => {
    if (!mapRoot.map || !data) return;
    const map = mapRoot.map;

    // Initialize Source & Layers
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
      // NOTE: We only remove layers if the URL changes (handled by Loader unmounting this component)
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

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    if (!map || !map.getLayer(layerId)) return;

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });

    const handleEvent = (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const title = feature.properties?.title;
      const description = feature.properties?.description;

      if (title || description) {
        let content = '';
        if (title) content += `<strong>${title}</strong><br>`;
        if (description) content += description;

        popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
      }
    };

    map.on('click', layerId, handleEvent);
    map.on('mouseenter', layerId, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    return () => {
      map.off('click', layerId, handleEvent);
      popup.remove();
    };
  });
</script>
