<script lang="ts">
  import { getContext, untrack } from 'svelte';
  import type { maplibregl } from '../../../../components/mapLibre/index';
  import type { GeoJsonConfig } from '../../../../lib/marker';
  import { getColourExpression, getStrokeOpacityExpression, getStrokeWidthExpression } from './utils';

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
      const colorExpr = getColourExpression(config, 'stroke');
      const widthExpr = getStrokeWidthExpression(config);
      const opacityExpr = getStrokeOpacityExpression(config);
      console.log(`[GeoJSON] Updating layer ${lid}`, { colorExpr, widthExpr, opacityExpr });
      map.setPaintProperty(lid, 'line-color', colorExpr);
      map.setPaintProperty(lid, 'line-opacity', opacityExpr);
      map.setPaintProperty(lid, 'line-width', widthExpr);
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

      console.log('[GeoJSON] Feature clicked:', feature.properties);

      const title = feature.properties?.title || feature.properties?.name || 'Line';
      const description = feature.properties?.description || '';

      let content = `<strong>${title}</strong>`;
      if (description) content += `<br>${description}`;

      // Add a property list for debugging
      content += `<hr><div style="font-size: 10px; font-family: monospace; max-height: 100px; overflow-y: auto;">`;
      for (const [key, val] of Object.entries(feature.properties)) {
        content += `<b>${key}:</b> ${val}<br>`;
      }
      content += `</div>`;

      popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
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
