<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColorExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = $derived(`${sourceId}-line`);

  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;

    if (!map || !data) return;

    untrack(() => {
      // Initialize Source
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data
        });
      }

      // Initialize Layer
      if (map.getSource(sid) && !map.getLayer(lid)) {
        map.addLayer({
          id: lid,
          type: 'line',
          source: sid,
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
    });

    return () => {
      untrack(() => {
        if (map.getLayer(lid)) map.removeLayer(lid);
        if (map.getSource(sid)) map.removeSource(sid);
      });
    };
  });

  // Update Data
  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    if (map && map.getSource(sid) && data) {
      (map.getSource(sid) as maplibregl.GeoJSONSource).setData(data);
    }
  });

  // Update Styles
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (map && map.getLayer(lid)) {
      map.setPaintProperty(lid, 'line-color', getColorExpression(config, 'stroke'));
      map.setPaintProperty(lid, 'line-opacity', getStrokeOpacityExpression(config));
      map.setPaintProperty(lid, 'line-width', getStrokeWidthExpression(config));
    }
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

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

    map.on('click', lid, handleEvent);
    map.on('mouseenter', lid, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', lid, () => {
      map.getCanvas().style.cursor = '';
      popup.remove();
    });

    return () => {
      map.off('click', lid, handleEvent);
      popup.remove();
    };
  });
</script>
