<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColorExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = `${sourceId}-line`;

  $effect(() => {
    if (!mapRoot.map || !data) return;
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
