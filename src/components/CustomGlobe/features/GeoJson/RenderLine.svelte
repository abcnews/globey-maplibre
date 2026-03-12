<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../../components/mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColourExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';

  const mapRoot = getContext<{ map: maplibregl.Map }>('mapInstance');

  let { data, config, sourceId } = $props<{ data: any; config: GeoJsonConfig; sourceId: string }>();

  const layerId = $derived(`${sourceId}-line`);
  const outlineLayerId = $derived(`${sourceId}-line-outline`);

  $effect(() => {
    const map = mapRoot.map;
    const sid = sourceId;
    const lid = layerId;
    const olid = outlineLayerId;

    if (!map || !data) return;

    untrack(() => {
      // Initialize Source
      if (!map.getSource(sid)) {
        map.addSource(sid, {
          type: 'geojson',
          data: data
        });
      }

      // Initialize Outline Layer
      if (map.getSource(sid) && !map.getLayer(olid)) {
        map.addLayer({
          id: olid,
          type: 'line',
          source: sid,
          layout: {
            'line-cap': 'round',
            'line-join': 'round'
          },
          paint: {
            'line-color': '#ffffff',
            'line-opacity': getStrokeOpacityExpression(config),
            'line-width': ['+', getStrokeWidthExpression(config), 2]
          }
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
            'line-color': getColourExpression(config, 'stroke'),

            'line-opacity': getStrokeOpacityExpression(config),
            'line-width': getStrokeWidthExpression(config),
            'line-color-transition': { duration: 300 },
            'line-opacity-transition': { duration: 300 }
          }
        });
      }
    });

    return () => {
      untrack(() => {
        const lid = layerId;
        const olid = outlineLayerId;
        if (map.getLayer(lid)) map.removeLayer(lid);
        if (map.getLayer(olid)) map.removeLayer(olid);
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
    const sid = sourceId;
    const lid = layerId;
    const olid = outlineLayerId;
    if (map) {
      if (map.getLayer(olid)) {
        map.setPaintProperty(olid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(olid, 'line-width', ['+', getStrokeWidthExpression(config), 2]);
      }
      if (map.getLayer(lid)) {
        map.setPaintProperty(lid, 'line-color', getColourExpression(config, 'stroke'));

        map.setPaintProperty(lid, 'line-opacity', getStrokeOpacityExpression(config));
        map.setPaintProperty(lid, 'line-width', getStrokeWidthExpression(config));
      }
    }
  });

  // Popups
  $effect(() => {
    const map = mapRoot.map;
    const lid = layerId;
    if (!map || !map.getLayer(lid)) return;

    const popup = new window.maplibregl.Popup({
      closeButton: false,
      closeOnClick: true
    });

    const handleEvent = (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;

      const title = feature.properties?.title || feature.properties?.name;
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
